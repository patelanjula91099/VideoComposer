import { useState, useCallback, useRef } from 'react';
import { VideoClip, AudioSource, pickVideos, pickAudioFile } from '../services/mediaService';
import { Resolution, exportVideo, cancelExport, ExportResult } from '../services/ffmpegService';

export interface EditorState {
  clips: VideoClip[];
  audio: AudioSource;
  previewIndex: number;
  isExporting: boolean;
  exportProgress: number;
  exportError: string | null;
  exportSuccess: boolean;
}

export function useVideoEditor() {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [audio, setAudio] = useState<AudioSource>({ type: 'original' });
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const addClips = useCallback(async () => {
    const newClips = await pickVideos();
    if (newClips.length > 0) {
      setClips((prev) => [...prev, ...newClips]);
    }
  }, []);

  const removeClip = useCallback((id: string) => {
    setClips((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setPreviewIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)));
      return next;
    });
  }, []);

  const reorderClips = useCallback((newClips: VideoClip[]) => {
    setClips(newClips);
  }, []);

  const setAudioOriginal = useCallback(() => {
    setAudio({ type: 'original' });
  }, []);

  const selectMusicFile = useCallback(async () => {
    const file = await pickAudioFile();
    if (file) {
      setAudio({ type: 'music', uri: file.uri, fileName: file.fileName });
    }
  }, []);

  const goToClip = useCallback(
    (index: number) => {
      if (index >= 0 && index < clips.length) {
        setPreviewIndex(index);
      }
    },
    [clips.length]
  );

  const startExport = useCallback(
    async (resolution: Resolution): Promise<ExportResult> => {
      if (clips.length === 0) {
        return { success: false, error: 'Add at least one video clip.' };
      }

      setIsExporting(true);
      setExportProgress(0);
      setExportError(null);
      setExportSuccess(false);

      const result = await exportVideo({
        clips,
        audio,
        resolution,
        onProgress: (p) => setExportProgress(p),
      });

      setIsExporting(false);

      if (result.success) {
        setExportProgress(1);
        setExportSuccess(true);
      } else if (!result.cancelled) {
        setExportError(result.error || 'Export failed.');
      }

      return result;
    },
    [clips, audio]
  );

  const cancelCurrentExport = useCallback(async () => {
    await cancelExport();
    setIsExporting(false);
    setExportProgress(0);
  }, []);

  const dismissExportStatus = useCallback(() => {
    setExportError(null);
    setExportSuccess(false);
  }, []);

  return {
    clips,
    audio,
    previewIndex,
    isExporting,
    exportProgress,
    exportError,
    exportSuccess,
    addClips,
    removeClip,
    reorderClips,
    setAudioOriginal,
    selectMusicFile,
    goToClip,
    startExport,
    cancelCurrentExport,
    dismissExportStatus,
  };
}
