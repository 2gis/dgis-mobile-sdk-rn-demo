import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MapView } from '@2gis/dgis-mobile-sdk-map';
import type {
  CopyrightAlignment,
  CopyrightEdgeInsets,
  Map as SdkMap,
} from '@2gis/dgis-mobile-sdk-map';
import { useSdk } from '../sdk/useSdk';
import { useDefaultMapOptions } from '../hooks/useDefaultMapOptions';
import { useMapController } from '../hooks/useMapController';
import { useChannelValue } from '../hooks/useChannelValue';
import { useNative } from '../hooks/useNative';
import {
  cardShadow,
  cardShadowElevated,
  colors,
  radius as themeRadius,
  spacing,
  typography,
} from '../theme/theme';

const ALIGNMENTS: { label: string; value: CopyrightAlignment }[] = [
  { label: 'Top Left', value: 'topLeft' },
  { label: 'Top Center', value: 'topCenter' },
  { label: 'Top Right', value: 'topRight' },
  { label: 'Center Left', value: 'centerLeft' },
  { label: 'Center', value: 'center' },
  { label: 'Center Right', value: 'centerRight' },
  { label: 'Bottom Left', value: 'bottomLeft' },
  { label: 'Bottom Center', value: 'bottomCenter' },
  { label: 'Bottom Right', value: 'bottomRight' },
];

const DEFAULT_EDGE_INSETS: Required<CopyrightEdgeInsets> = {
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
};

/**
 * Demonstrates copyright-related map settings: alignment, edge insets and
 * interactivity toggle.
 */
export function CopyrightDemo() {
  const context = useSdk();
  const options = useDefaultMapOptions(context);
  const { controllerState, mapController } = useMapController(context, options);

  const [showSettings, setShowSettings] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(true);
  const [alignment, setAlignment] = useState<CopyrightAlignment>('bottomRight');
  const [edgeInsets, setEdgeInsets] =
    useState<CopyrightEdgeInsets>(DEFAULT_EDGE_INSETS);
  const [alertUriOpener, setAlertUriOpener] = useState(false);
  const map = useNative<SdkMap>(
    () => mapController?.map ?? null,
    [mapController],
  );

  const handleCopyrightPress = useCallback((uri: string) => {
    Alert.alert('Uri alert', `Open uri ${uri} for information`);
  }, []);

  const interactive = useChannelValue(() => map?.interactiveChannel, true, [
    map,
  ]);

  const handleInteractiveToggle = (value: boolean) => {
    if (!map) return;
    map.interactive = value;
  };

  return (
    <View style={styles.container}>
      <MapView
        controllerState={controllerState}
        style={styles.map}
        copyrightAlignment={alignment}
        copyrightEdgeInsets={edgeInsets}
        copyrightUriOpener={alertUriOpener ? handleCopyrightPress : undefined}
      />

      {statusExpanded ? (
        <TouchableOpacity
          style={styles.statusCard}
          onPress={() => setStatusExpanded(false)}
          activeOpacity={0.8}
        >
          <Text style={styles.statusTitle}>Copyright status ✕</Text>
          <Text style={styles.statusText}>
            Map interactive: {String(interactive)}
          </Text>
          <Text style={styles.statusText}>
            Alignment: {formatAlignment(alignment)}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.statusToggle}
          onPress={() => setStatusExpanded(true)}
        >
          <Text style={styles.statusToggleText}>ⓘ</Text>
        </TouchableOpacity>
      )}

      <View style={styles.buttonColumn}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.iconBtnText}>⚙</Text>
        </TouchableOpacity>
      </View>

      {showSettings && (
        <SettingsDialog
          interactive={interactive}
          alertUriOpener={alertUriOpener}
          alignment={alignment}
          edgeInsets={edgeInsets}
          onInteractiveChange={handleInteractiveToggle}
          onAlertUriOpenerChange={setAlertUriOpener}
          onAlignmentChange={setAlignment}
          onEdgeInsetsChange={setEdgeInsets}
          onClose={() => setShowSettings(false)}
        />
      )}
    </View>
  );
}

function SettingsDialog({
  interactive,
  alertUriOpener,
  alignment,
  edgeInsets,
  onInteractiveChange,
  onAlertUriOpenerChange,
  onAlignmentChange,
  onEdgeInsetsChange,
  onClose,
}: {
  interactive: boolean;
  alertUriOpener: boolean;
  alignment: CopyrightAlignment;
  edgeInsets: CopyrightEdgeInsets;
  onInteractiveChange: (v: boolean) => void;
  onAlertUriOpenerChange: (v: boolean) => void;
  onAlignmentChange: (a: CopyrightAlignment) => void;
  onEdgeInsetsChange: (m: CopyrightEdgeInsets) => void;
  onClose: () => void;
}) {
  const [leftText, setLeftText] = useState(
    String(edgeInsets.left ?? DEFAULT_EDGE_INSETS.left),
  );
  const [topText, setTopText] = useState(
    String(edgeInsets.top ?? DEFAULT_EDGE_INSETS.top),
  );
  const [rightText, setRightText] = useState(
    String(edgeInsets.right ?? DEFAULT_EDGE_INSETS.right),
  );
  const [bottomText, setBottomText] = useState(
    String(edgeInsets.bottom ?? DEFAULT_EDGE_INSETS.bottom),
  );
  const [selectedAlignment, setSelectedAlignment] = useState(alignment);

  const handleApply = () => {
    onAlignmentChange(selectedAlignment);
    onEdgeInsetsChange({
      left: parseEdgeInset(leftText),
      top: parseEdgeInset(topText),
      right: parseEdgeInset(rightText),
      bottom: parseEdgeInset(bottomText),
    });
    onClose();
  };

  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>Copyright options</Text>
          <ScrollView style={styles.dialogBody}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Map interactive</Text>
              <Switch value={interactive} onValueChange={onInteractiveChange} />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Alert UriOpener</Text>
              <Switch
                value={alertUriOpener}
                onValueChange={onAlertUriOpenerChange}
              />
            </View>

            <Text style={styles.sectionTitle}>Alignment</Text>
            <View style={styles.alignmentGrid}>
              {ALIGNMENTS.map(item => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.alignmentChip,
                    selectedAlignment === item.value &&
                      styles.alignmentChipActive,
                  ]}
                  onPress={() => setSelectedAlignment(item.value)}
                >
                  <Text
                    style={[
                      styles.alignmentChipText,
                      selectedAlignment === item.value &&
                        styles.alignmentChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Edge insets (dp)</Text>
            <View style={styles.marginsRow}>
              <View style={styles.marginInput}>
                <Text style={styles.marginLabel}>Left</Text>
                <TextInput
                  style={styles.input}
                  value={leftText}
                  onChangeText={setLeftText}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.marginInput}>
                <Text style={styles.marginLabel}>Top</Text>
                <TextInput
                  style={styles.input}
                  value={topText}
                  onChangeText={setTopText}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
            <View style={styles.marginsRow}>
              <View style={styles.marginInput}>
                <Text style={styles.marginLabel}>Right</Text>
                <TextInput
                  style={styles.input}
                  value={rightText}
                  onChangeText={setRightText}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.marginInput}>
                <Text style={styles.marginLabel}>Bottom</Text>
                <TextInput
                  style={styles.input}
                  value={bottomText}
                  onChangeText={setBottomText}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </ScrollView>
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.dialogBtn} onPress={onClose}>
              <Text style={styles.dialogBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogBtn, styles.dialogBtnApply]}
              onPress={handleApply}
            >
              <Text style={[styles.dialogBtnText, styles.dialogBtnApplyText]}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function parseEdgeInset(value: string): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatAlignment(alignment: CopyrightAlignment): string {
  return (
    ALIGNMENTS.find(item => item.value === alignment)?.label ??
    String(alignment)
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  statusCard: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: themeRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...cardShadow,
  },
  statusToggle: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...cardShadow,
  },
  statusToggleText: {
    fontSize: 18,
    color: colors.textPrimary,
  },
  statusTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statusText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  buttonColumn: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...cardShadowElevated,
  },
  iconBtnText: { color: colors.textPrimary, fontSize: 20 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: themeRadius.md,
    margin: spacing.xl,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  dialogTitle: {
    ...typography.title,
    color: colors.textPrimary,
    padding: spacing.lg,
    textAlign: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  dialogBody: { padding: spacing.lg },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  switchLabel: {
    ...typography.label,
    color: colors.textPrimary,
    flex: 1,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  alignmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  alignmentChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: themeRadius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  alignmentChipActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  alignmentChipText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  alignmentChipTextActive: {
    color: colors.surface,
  },
  marginsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  marginInput: {
    flex: 1,
  },
  marginLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: themeRadius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    ...typography.caption,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  dialogBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: themeRadius.sm,
  },
  dialogBtnApply: {
    backgroundColor: colors.textPrimary,
  },
  dialogBtnText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  dialogBtnApplyText: {
    color: colors.surface,
  },
});
