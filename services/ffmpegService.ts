/**
 * FFmpeg-based video composition service.
 * Uses ffmpeg-kit-react-native to build a portrait→landscape composer
 * with blurred background fill, audio handling, and H.264/AAC export.
 */

import { FFmpegKit, FFmpegKitConfig, ReturnCode, Statistics } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { VideoClip, AudioSource, getTotalDuration } from './mediaService';

export type Resolution = '480p' | '720p' | '1080p';

export interface ResolutionConfig {
  label: string;
  width: number;
  height: number;
}

export const RESOLUTIONS: Record<Resolution, ResolutionConfig> = {
  '480p': { label: '480p — 854×480', width: 854, height: 480 },
  '720p': { label: '720p — 1280×720', width: 1280, height: 720 },
  '1080p': { label: '1080p — 1920×1080', width: 1920, height: 1080 },
};

export interface ExportOptions {
  clips: VideoClip[];
  audio: AudioSource;
  resolution: Resolution;
  onProgress?: (progress: number) => void;
}

export interface ExportResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  cancelled?: boolean;
}

// Normalize Android content:// URIs to file paths for FFmpeg
function normalizeUri(uri: string): string {
  // On Android, expo-image-picker returns content:// URIs. 
  // ffmpeg-kit-react-native can handle content:// on Android directly.
  return uri;
}

/**
 * Build the FFmpeg command for composing multiple portrait clips into 16:9 landscape.
 * 
 * For each clip: 
 *   - Background = scaled up to fill W×H, heavily blurred, slightly darkened
 *   - Foreground = scaled to fit height H, centered
 * Then concat all processed clips (video + audio or video only for music mode).
 * If music file: loop/trim to total duration.
 */
function buildFFmpegCommand(
  clips: VideoClip[],
  audio: AudioSource,
  resolution: Resolution,
  outputPath: string
): string {
  const { width: W, height: H } = RESOLUTIONS[resolution];
  const n = clips.length;
  const totalDuration = getTotalDuration(clips);

  const inputs: string[] = [];

  // Add video inputs
  clips.forEach((clip) => {
    inputs.push(`-i "${normalizeUri(clip.uri)}"`);
  });

  // Add music input if needed
  let musicInputIndex = -1;
  if (audio.type === 'music' && audio.uri) {
    musicInputIndex = clips.length;
    inputs.push(`-i "${normalizeUri(audio.uri)}"`);
  }

  const inputStr = inputs.join(' ');

  // Build filter_complex
  const filterParts: string[] = [];

  // For each clip: create bg and fg layers, then overlay
  for (let i = 0; i < n; i++) {
    // Background: scale to fill W×H (cover), then blur and darken
    filterParts.push(
      `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},` +
      `boxblur=luma_radius=30:luma_power=3:chroma_radius=30:chroma_power=3,` +
      `colorchannelmixer=rr=0.65:gg=0.65:bb=0.65[bg${i}]`
    );

    // Foreground: scale to fit inside W×H (contain), preserve aspect ratio
    // For portrait (9:16) input at target height H: width = H * 9/16
    // Use scale with force_original_aspect_ratio=decrease to fit
    filterParts.push(
      `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease[fgscaled${i}]`
    );

    // Overlay fg centered on bg, reset pts
    filterParts.push(
      `[bg${i}][fgscaled${i}]overlay=(W-w)/2:(H-h)/2,setpts=PTS-STARTPTS[v${i}]`
    );
  }

  let filterComplex = '';
  let videoMapArg = '';
  let audioMapArg = '';
  let extraArgs = '';

  if (audio.type === 'original') {
    // Concat video + audio streams together
    const concatInputs = Array.from({ length: n }, (_, i) => `[v${i}][${i}:a]`).join('');
    filterParts.push(
      `${concatInputs}concat=n=${n}:v=1:a=1[outv][outa]`
    );
    filterComplex = filterParts.join(';');
    videoMapArg = '-map "[outv]"';
    audioMapArg = '-map "[outa]"';
  } else {
    // Music mode: concat video only, no audio from clips
    const concatVideoInputs = Array.from({ length: n }, (_, i) => `[v${i}]`).join('');
    filterParts.push(
      `${concatVideoInputs}concat=n=${n}:v=1:a=0[outv]`
    );

    if (musicInputIndex >= 0) {
      // Loop music if shorter, trim to total duration
      filterParts.push(
        `[${musicInputIndex}:a]aloop=loop=-1:size=2000000000,atrim=duration=${totalDuration.toFixed(3)},asetpts=PTS-STARTPTS[outa]`
      );
      audioMapArg = '-map "[outa]"';
    }

    filterComplex = filterParts.join(';');
    videoMapArg = '-map "[outv]"';
  }

  const videoCodec = `-c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p`;
  const audioCodec = `-c:a aac -b:a 128k`;
  const outputSize = `-s ${W}x${H}`;

  const cmd = `${inputStr} -filter_complex "${filterComplex}" ${videoMapArg} ${audioMapArg} ${videoCodec} ${audioCodec} ${outputSize} -movflags +faststart -y "${outputPath}"`;

  return cmd;
}

let activeSessionId: number | null = null;

export async function cancelExport(): Promise<void> {
  if (activeSessionId !== null) {
    await FFmpegKit.cancel(activeSessionId);
    activeSessionId = null;
  }
}

export async function exportVideo(options: ExportOptions): Promise<ExportResult> {
  const { clips, audio, resolution, onProgress } = options;

  if (clips.length === 0) {
    return { success: false, error: 'No clips selected.' };
  }

  // Request media library permissions
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    return { success: false, error: 'Media library permission denied.' };
  }

  const timestamp = Date.now();
  const outputFileName = `composed_${timestamp}.mp4`;
  const outputPath = `${FileSystem.cacheDirectory}${outputFileName}`;

  // Clean up any previous output
  try {
    const info = await FileSystem.getInfoAsync(outputPath);
    if (info.exists) await FileSystem.deleteAsync(outputPath);
  } catch (_) {}

  const command = buildFFmpegCommand(clips, audio, resolution, outputPath);

  console.log('[FFmpeg] Command:', command);

  // Enable log and statistics callbacks
  FFmpegKitConfig.enableLogCallback(undefined);

  // Estimate total frames for progress
  const totalDuration = getTotalDuration(clips);

  return new Promise<ExportResult>((resolve) => {
    FFmpegKit.executeAsync(
      command,
      async (session) => {
        activeSessionId = null;
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
          try {
            // Save to gallery
            const asset = await MediaLibrary.createAssetAsync(outputPath);
            // Try to add to album
            try {
              let album = await MediaLibrary.getAlbumAsync('Video Composer');
              if (!album) {
                album = await MediaLibrary.createAlbumAsync('Video Composer', asset, false);
              } else {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
              }
            } catch (_) {}

            resolve({ success: true, outputPath });
          } catch (err: any) {
            resolve({ success: false, error: `Failed to save to gallery: ${err.message}` });
          }
        } else if (ReturnCode.isCancel(returnCode)) {
          resolve({ success: false, cancelled: true });
        } else {
          const logs = await session.getAllLogs();
          const errorText = logs.map((l) => l.getMessage()).join('\n').slice(-500);
          console.error('[FFmpeg] Error logs:', errorText);
          resolve({ success: false, error: 'FFmpeg processing failed. Check that all selected videos are valid.' });
        }
      },
      (log) => {
        // Optional: detailed log
        // console.log('[FFmpeg Log]', log.getMessage());
      },
      (statistics: Statistics) => {
        if (totalDuration > 0 && onProgress) {
          // statistics.getTime() is in milliseconds
          const processedMs = statistics.getTime();
          const processedSec = processedMs / 1000;
          const progress = Math.min(processedSec / totalDuration, 0.99);
          onProgress(progress);
        }
      }
    ).then((session) => {
      activeSessionId = session.getSessionId();
    });
  });
}
