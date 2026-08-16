import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

export interface VideoClip {
  id: string;
  uri: string;
  fileName: string;
  duration: number; // seconds
  width: number;
  height: number;
  thumbnail?: string;
}

export interface AudioSource {
  type: 'original' | 'music';
  uri?: string;
  fileName?: string;
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

export async function pickVideos(): Promise<VideoClip[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsMultipleSelection: true,
    quality: 1,
    videoMaxDuration: 3600,
  });

  if (result.canceled || !result.assets) return [];

  return result.assets.map((asset, index) => ({
    id: `clip_${Date.now()}_${index}`,
    uri: asset.uri,
    fileName: asset.fileName || `clip_${index + 1}.mp4`,
    duration: asset.duration ? asset.duration / 1000 : 0,
    width: asset.width || 1080,
    height: asset.height || 1920,
  }));
}

export async function pickAudioFile(): Promise<{ uri: string; fileName: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['audio/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    fileName: asset.name || 'music.mp3',
  };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getTotalDuration(clips: VideoClip[]): number {
  return clips.reduce((sum, c) => sum + c.duration, 0);
}
