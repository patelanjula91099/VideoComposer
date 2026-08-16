import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { Resolution, RESOLUTIONS } from '../services/ffmpegService';
import { VideoClip, getTotalDuration, formatDuration } from '../services/mediaService';
import { AudioSource } from '../services/mediaService';

interface Props {
  visible: boolean;
  clips: VideoClip[];
  audio: AudioSource;
  isExporting: boolean;
  exportProgress: number;
  exportError: string | null;
  exportSuccess: boolean;
  onExport: (resolution: Resolution) => void;
  onCancel: () => void;
  onClose: () => void;
  onDismissStatus: () => void;
}

const RESOLUTION_KEYS: Resolution[] = ['480p', '720p', '1080p'];

export default function ExportModal({
  visible,
  clips,
  audio,
  isExporting,
  exportProgress,
  exportError,
  exportSuccess,
  onExport,
  onCancel,
  onClose,
  onDismissStatus,
}: Props) {
  const [selectedRes, setSelectedRes] = useState<Resolution>('1080p');

  const totalDuration = getTotalDuration(clips);
  const progressPercent = Math.round(exportProgress * 100);

  const handleExport = () => {
    onExport(selectedRes);
  };

  const handleClose = () => {
    if (!isExporting) {
      onDismissStatus();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Export Video</Text>
          {!isExporting && (
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="video-library" size={16} color={Colors.textMuted} />
            <Text style={styles.summaryText}>{clips.length} clips</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="timer" size={16} color={Colors.textMuted} />
            <Text style={styles.summaryText}>{formatDuration(totalDuration)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons
              name={audio.type === 'original' ? 'volume-up' : 'music-note'}
              size={16}
              color={Colors.textMuted}
            />
            <Text style={styles.summaryText}>
              {audio.type === 'original' ? 'Original audio' : audio.fileName || 'Music file'}
            </Text>
          </View>
        </View>

        {/* Resolution Selector */}
        {!isExporting && !exportSuccess && (
          <>
            <Text style={styles.sectionLabel}>Resolution</Text>
            <View style={styles.resOptions}>
              {RESOLUTION_KEYS.map((res) => {
                const cfg = RESOLUTIONS[res];
                const isSelected = selectedRes === res;
                return (
                  <TouchableOpacity
                    key={res}
                    style={[styles.resOption, isSelected && styles.resOptionSelected]}
                    onPress={() => setSelectedRes(res)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.resLabel, isSelected && styles.resLabelSelected]}>
                      {res}
                    </Text>
                    <Text style={[styles.resDimensions, isSelected && styles.resDimensionsSelected]}>
                      {cfg.width}×{cfg.height}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.outputNote}>
              Output: 16:9 MP4 · H.264 · AAC · Saved to Gallery
            </Text>
          </>
        )}

        {/* Progress */}
        {isExporting && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.progressLabel}>
                Rendering… {progressPercent}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressNote}>
              This may take a while depending on clip length and resolution.
            </Text>
          </View>
        )}

        {/* Success */}
        {exportSuccess && !isExporting && (
          <View style={styles.statusBox}>
            <MaterialIcons name="check-circle" size={40} color={Colors.success} />
            <Text style={styles.statusTitle}>Saved to Gallery</Text>
            <Text style={styles.statusSub}>
              Your composed video has been saved to the &quot;Video Composer&quot; album.
            </Text>
          </View>
        )}

        {/* Error */}
        {exportError && !isExporting && (
          <View style={styles.statusBox}>
            <MaterialIcons name="error-outline" size={40} color={Colors.danger} />
            <Text style={[styles.statusTitle, { color: Colors.danger }]}>Export Failed</Text>
            <Text style={styles.statusSub}>{exportError}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {isExporting ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Cancel Export</Text>
            </TouchableOpacity>
          ) : exportSuccess || exportError ? (
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={() => {
                onDismissStatus();
                if (exportSuccess) onClose();
              }}
            >
              <Text style={styles.exportBtnText}>
                {exportSuccess ? 'Done' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.exportBtn, clips.length === 0 && styles.exportBtnDisabled]}
              onPress={handleExport}
              disabled={clips.length === 0}
            >
              <MaterialIcons name="file-download" size={20} color={Colors.white} />
              <Text style={styles.exportBtnText}>Start Export</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
    includeFontPadding: false,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    flexWrap: 'wrap',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    includeFontPadding: false,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
    includeFontPadding: false,
  },
  resOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  resOption: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  resOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(79,142,247,0.12)',
  },
  resLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    fontWeight: '700',
    includeFontPadding: false,
  },
  resLabelSelected: {
    color: Colors.primary,
  },
  resDimensions: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
    includeFontPadding: false,
  },
  resDimensionsSelected: {
    color: Colors.primary,
    opacity: 0.8,
  },
  outputNote: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginBottom: Spacing.md,
    includeFontPadding: false,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
    includeFontPadding: false,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  progressNote: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    includeFontPadding: false,
  },
  statusBox: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  statusTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
    includeFontPadding: false,
  },
  statusSub: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    includeFontPadding: false,
  },
  actions: {
    marginTop: Spacing.sm,
  },
  exportBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  exportBtnDisabled: {
    opacity: 0.4,
  },
  exportBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
    includeFontPadding: false,
  },
  cancelBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  cancelBtnText: {
    color: Colors.danger,
    fontSize: FontSize.md,
    fontWeight: '600',
    includeFontPadding: false,
  },
});
