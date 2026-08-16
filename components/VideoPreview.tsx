import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { VideoClip } from '../services/mediaService';

interface Props {
  clips: VideoClip[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const PREVIEW_WIDTH = SCREEN_WIDTH - Spacing.md * 2;
const PREVIEW_HEIGHT = Math.round(PREVIEW_WIDTH * (9 / 16));

export default function VideoPreview({ clips, currentIndex, onPrev, onNext }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentClip = clips[currentIndex] || null;

  const player = useVideoPlayer(currentClip ? currentClip.uri : null, (p) => {
    p.loop = false;
  });

  const togglePlay = useCallback(() => {
    if (!player || !currentClip) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [isPlaying, player, currentClip]);

  const handlePrev = useCallback(() => {
    if (player) {
      player.pause();
      setIsPlaying(false);
    }
    onPrev();
  }, [player, onPrev]);

  const handleNext = useCallback(() => {
    if (player) {
      player.pause();
      setIsPlaying(false);
    }
    onNext();
  }, [player, onNext]);

  if (clips.length === 0) {
    return (
      <View style={[styles.previewBox, styles.emptyBox]}>
        <MaterialIcons name="videocam-off" size={36} color={Colors.textMuted} />
        <Text style={styles.emptyText}>No clips selected</Text>
        <Text style={styles.emptySubText}>Output will be 16:9 landscape</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* 16:9 Preview Frame */}
      <View style={styles.previewBox}>
        {currentClip ? (
          <>
            {/* Blurred BG simulation */}
            <View style={styles.bgLayer} />
            {/* Main video - centered, letterboxed */}
            <VideoView
              player={player}
              style={styles.video}
              contentFit="contain"
              nativeControls={false}
            />
            {/* Watermark: preview indicator */}
            <View style={styles.previewLabel}>
              <Text style={styles.previewLabelText}>PREVIEW</Text>
            </View>
          </>
        ) : null}

        {/* Overlay controls */}
        <TouchableOpacity
          style={styles.playOverlay}
          onPress={togglePlay}
          activeOpacity={0.8}
        >
          {!isPlaying ? (
            <View style={styles.playBtn}>
              <MaterialIcons name="play-arrow" size={32} color={Colors.white} />
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Navigation controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handlePrev}
          disabled={currentIndex <= 0}
          style={[styles.navBtn, currentIndex <= 0 && styles.navBtnDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons
            name="skip-previous"
            size={28}
            color={currentIndex <= 0 ? Colors.textMuted : Colors.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.clipCounter}>
          Clip {currentIndex + 1} / {clips.length}
        </Text>

        <TouchableOpacity
          onPress={handleNext}
          disabled={currentIndex >= clips.length - 1}
          style={[styles.navBtn, currentIndex >= clips.length - 1 && styles.navBtnDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons
            name="skip-next"
            size={28}
            color={currentIndex >= clips.length - 1 ? Colors.textMuted : Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.previewNote}>
        Preview shows each clip individually. Final render will add blurred background fill.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  previewBox: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    backgroundColor: '#111',
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    gap: Spacing.sm,
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  previewLabel: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(79,142,247,0.85)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  previewLabelText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    includeFontPadding: false,
  },
  emptySubText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    includeFontPadding: false,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: PREVIEW_WIDTH,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  navBtn: {
    padding: Spacing.xs,
    borderRadius: Radius.sm,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  clipCounter: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '500',
    includeFontPadding: false,
  },
  previewNote: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    includeFontPadding: false,
  },
});
