import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { VideoClip, formatDuration } from '../services/mediaService';

interface Props {
  clip: VideoClip;
  index: number;
  onRemove: (id: string) => void;
  isActive?: boolean;
  drag?: () => void;
}

function VideoClipItem({ clip, index, onRemove, isActive, drag }: Props) {
  return (
    <View style={[styles.container, isActive && styles.containerActive]}>
      {/* Drag Handle */}
      <TouchableOpacity
        onLongPress={drag}
        style={styles.dragHandle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="drag-indicator" size={22} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: clip.uri }}
          contentFit="cover"
          style={styles.thumbnail}
          transition={150}
        />
        {/* Portrait indicator */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>9:16</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.clipName} numberOfLines={1}>
          Clip {index + 1}
        </Text>
        <Text style={styles.fileName} numberOfLines={1}>
          {clip.fileName}
        </Text>
        <Text style={styles.duration}>
          {clip.duration > 0 ? formatDuration(clip.duration) : '--:--'}
        </Text>
      </View>

      {/* Remove */}
      <TouchableOpacity
        onPress={() => onRemove(clip.id)}
        style={styles.removeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="close" size={20} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceElevated,
    opacity: 0.95,
  },
  dragHandle: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 52,
    height: 72,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: '#111',
    marginRight: Spacing.sm,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  badgeText: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  clipName: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
    includeFontPadding: false,
  },
  fileName: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    includeFontPadding: false,
  },
  duration: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
    includeFontPadding: false,
  },
  removeBtn: {
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(VideoClipItem);
