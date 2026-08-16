import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { VideoClip, formatDuration, getTotalDuration } from '../services/mediaService';
import { useVideoEditor } from '../hooks/useVideoEditor';
import VideoClipItem from '../components/VideoClipItem';
import VideoPreview from '../components/VideoPreview';
import ExportModal from '../components/ExportModal';
import { Resolution } from '../services/ffmpegService';

export default function MainScreen() {
  const {
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
  } = useVideoEditor();

  const [exportModalVisible, setExportModalVisible] = useState(false);

  const handleExport = useCallback(
    async (resolution: Resolution) => {
      await startExport(resolution);
    },
    [startExport]
  );

  const renderClipItem = useCallback(
    ({ item, getIndex, drag, isActive }: RenderItemParams<VideoClip>) => {
      const index = getIndex() ?? 0;
      return (
        <ScaleDecorator activeScale={1.02}>
          <VideoClipItem
            clip={item}
            index={index}
            onRemove={removeClip}
            isActive={isActive}
            drag={drag}
          />
        </ScaleDecorator>
      );
    },
    [removeClip]
  );

  const totalDuration = getTotalDuration(clips);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>Video Composer</Text>
          <Text style={styles.appSubtitle}>Portrait → 16:9 Landscape</Text>
        </View>
        <TouchableOpacity
          style={[styles.exportHeaderBtn, clips.length === 0 && styles.exportHeaderBtnDisabled]}
          onPress={() => setExportModalVisible(true)}
          disabled={clips.length === 0}
        >
          <MaterialIcons name="file-download" size={18} color={Colors.white} />
          <Text style={styles.exportHeaderBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Preview Section */}
        <Text style={styles.sectionLabel}>Preview</Text>
        <VideoPreview
          clips={clips}
          currentIndex={previewIndex}
          onPrev={() => goToClip(previewIndex - 1)}
          onNext={() => goToClip(previewIndex + 1)}
        />

        {/* Clips Section */}
        <View style={styles.clipsHeader}>
          <Text style={styles.sectionLabel}>
            Selected Clips
            {clips.length > 0 && (
              <Text style={styles.clipCount}>  {clips.length} · {formatDuration(totalDuration)} total</Text>
            )}
          </Text>
        </View>

        {clips.length === 0 ? (
          <View style={styles.emptyClips}>
            <MaterialIcons name="video-library" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyClipsText}>No videos selected</Text>
            <Text style={styles.emptyClipsSubText}>Tap below to add portrait videos</Text>
          </View>
        ) : (
          <View style={styles.clipListContainer}>
            <DraggableFlatList
              data={clips}
              onDragEnd={({ data }) => reorderClips(data)}
              keyExtractor={(item) => item.id}
              renderItem={renderClipItem}
              scrollEnabled={false}
              activationDistance={10}
            />
          </View>
        )}

        {/* Add Clips Button */}
        <TouchableOpacity style={styles.addBtn} onPress={addClips} activeOpacity={0.75}>
          <MaterialIcons name="add" size={22} color={Colors.primary} />
          <Text style={styles.addBtnText}>
            {clips.length === 0 ? 'Select Videos' : 'Add More Videos'}
          </Text>
        </TouchableOpacity>

        {/* Hint */}
        {clips.length > 0 && (
          <Text style={styles.reorderHint}>
            Long-press a clip to drag and reorder
          </Text>
        )}

        {/* Audio Section */}
        <Text style={styles.sectionLabel}>Audio</Text>
        <View style={styles.audioOptions}>
          <TouchableOpacity
            style={[
              styles.audioOption,
              audio.type === 'original' && styles.audioOptionSelected,
            ]}
            onPress={setAudioOriginal}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name="volume-up"
              size={20}
              color={audio.type === 'original' ? Colors.primary : Colors.textSecondary}
            />
            <View style={styles.audioOptionText}>
              <Text
                style={[
                  styles.audioOptionTitle,
                  audio.type === 'original' && styles.audioOptionTitleSelected,
                ]}
              >
                Original Audio
              </Text>
              <Text style={styles.audioOptionDesc}>Keep audio from each clip</Text>
            </View>
            {audio.type === 'original' && (
              <MaterialIcons name="check-circle" size={18} color={Colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.audioOption,
              audio.type === 'music' && styles.audioOptionSelected,
            ]}
            onPress={selectMusicFile}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name="music-note"
              size={20}
              color={audio.type === 'music' ? Colors.primary : Colors.textSecondary}
            />
            <View style={styles.audioOptionText}>
              <Text
                style={[
                  styles.audioOptionTitle,
                  audio.type === 'music' && styles.audioOptionTitleSelected,
                ]}
              >
                Music from File
              </Text>
              <Text style={styles.audioOptionDesc} numberOfLines={1}>
                {audio.type === 'music' && audio.fileName
                  ? audio.fileName
                  : 'Replace with a local audio file'}
              </Text>
            </View>
            {audio.type === 'music' && (
              <MaterialIcons name="check-circle" size={18} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Export Button (large) */}
        <TouchableOpacity
          style={[styles.exportBtn, clips.length === 0 && styles.exportBtnDisabled]}
          onPress={() => setExportModalVisible(true)}
          disabled={clips.length === 0}
          activeOpacity={0.8}
        >
          <MaterialIcons name="file-download" size={22} color={Colors.white} />
          <Text style={styles.exportBtnText}>Export Video</Text>
        </TouchableOpacity>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Export Modal */}
      <ExportModal
        visible={exportModalVisible}
        clips={clips}
        audio={audio}
        isExporting={isExporting}
        exportProgress={exportProgress}
        exportError={exportError}
        exportSuccess={exportSuccess}
        onExport={handleExport}
        onCancel={cancelCurrentExport}
        onClose={() => setExportModalVisible(false)}
        onDismissStatus={dismissExportStatus}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  appTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '800',
    includeFontPadding: false,
  },
  appSubtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    includeFontPadding: false,
    marginTop: 2,
  },
  exportHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  exportHeaderBtnDisabled: {
    opacity: 0.35,
  },
  exportHeaderBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
    includeFontPadding: false,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
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
  clipCount: {
    color: Colors.textMuted,
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
  },
  clipsHeader: {
    marginTop: Spacing.lg,
  },
  emptyClips: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: Spacing.sm,
  },
  emptyClipsText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    includeFontPadding: false,
  },
  emptyClipsSubText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    includeFontPadding: false,
  },
  clipListContainer: {
    marginBottom: Spacing.xs,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginBottom: Spacing.xs,
  },
  addBtnText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: '600',
    includeFontPadding: false,
  },
  reorderHint: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    includeFontPadding: false,
  },
  audioOptions: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  audioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  audioOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(79,142,247,0.08)',
  },
  audioOptionText: {
    flex: 1,
  },
  audioOptionTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
    includeFontPadding: false,
  },
  audioOptionTitleSelected: {
    color: Colors.textPrimary,
  },
  audioOptionDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
    includeFontPadding: false,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    marginBottom: Spacing.sm,
  },
  exportBtnDisabled: {
    opacity: 0.35,
  },
  exportBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
    includeFontPadding: false,
  },
  bottomPad: {
    height: Spacing.xl,
  },
});
