import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { DEMO_MARKER_TYPE_OPTIONS } from '../mapDemoAssets';
import {
  cardShadow,
  colors,
  radius as themeRadius,
  spacing,
} from '../../theme/theme';
import {
  COLOR_PRESETS,
  type CircleSettings,
  type MarkerSettings,
  type ModelSettings,
  type PolygonSettings,
  type PolylineSettings,
} from './objects/types';

export function ActionButton({
  label,
  onPress,
  destructive,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, destructive && styles.buttonDestructive]}
      onPress={onPress}
    >
      <Text
        style={[styles.buttonText, destructive && styles.buttonTextDestructive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function CircleDialog({
  settings,
  onAdd,
  onCancel,
}: {
  settings: CircleSettings;
  onAdd: (settings: CircleSettings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({ ...settings });
  const update = (patch: Partial<CircleSettings>) =>
    setDraft(current => ({ ...current, ...patch }));

  return (
    <DialogShell
      title="Circle options"
      onAdd={() => onAdd(draft)}
      onCancel={onCancel}
    >
      <Field
        label="Radius, m"
        value={draft.radius}
        onChangeText={value => update({ radius: value })}
        keyboardType="numeric"
      />
      <Field
        label="Stroke width"
        value={draft.strokeWidth}
        onChangeText={value => update({ strokeWidth: value })}
        keyboardType="numeric"
      />
      <Field
        label="Z-index"
        value={draft.zIndex}
        onChangeText={value => update({ zIndex: value })}
        keyboardType="numeric"
      />
      <Field
        label="User data"
        value={draft.userData}
        onChangeText={value => update({ userData: value })}
      />
      <ColorPicker
        label="Fill color"
        selected={draft.color}
        onSelect={value => update({ color: value })}
      />
      <ColorPicker
        label="Stroke color"
        selected={draft.strokeColor}
        onSelect={value => update({ strokeColor: value })}
      />
    </DialogShell>
  );
}

export function MarkerDialog({
  settings,
  onAdd,
  onCancel,
}: {
  settings: MarkerSettings;
  onAdd: (settings: MarkerSettings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({ ...settings });
  const update = (patch: Partial<MarkerSettings>) =>
    setDraft(current => ({ ...current, ...patch }));

  return (
    <DialogShell
      title="Marker options"
      onAdd={() => onAdd(draft)}
      onCancel={onCancel}
    >
      <Field
        label="Text"
        value={draft.text}
        onChangeText={value => update({ text: value })}
      />
      <Field
        label="Elevation"
        value={draft.elevation}
        onChangeText={value => update({ elevation: value })}
        keyboardType="numeric"
      />
      <Field
        label="Icon width"
        value={draft.iconWidth}
        onChangeText={value => update({ iconWidth: value })}
        keyboardType="numeric"
      />
      <Field
        label="Z-index"
        value={draft.zIndex}
        onChangeText={value => update({ zIndex: value })}
        keyboardType="numeric"
      />
      <Field
        label="User data"
        value={draft.userData}
        onChangeText={value => update({ userData: value })}
      />
      <Text style={styles.fieldLabel}>Marker type</Text>
      {DEMO_MARKER_TYPE_OPTIONS.map(option => (
        <TouchableOpacity
          key={option.value}
          style={styles.radioRow}
          onPress={() => update({ markerType: option.value })}
        >
          <View
            style={[
              styles.radio,
              draft.markerType === option.value && styles.radioActive,
            ]}
          />
          <Text style={styles.radioLabel}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </DialogShell>
  );
}

export function ModelDialog({
  settings,
  onAdd,
  onCancel,
}: {
  settings: ModelSettings;
  onAdd: (settings: ModelSettings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({ ...settings });
  const update = (patch: Partial<ModelSettings>) =>
    setDraft(current => ({ ...current, ...patch }));

  return (
    <DialogShell
      title="Model options"
      onAdd={() => onAdd(draft)}
      onCancel={onCancel}
    >
      <Field
        label="Size"
        value={draft.size}
        onChangeText={value => update({ size: value })}
        keyboardType="numeric"
      />
      <Field
        label="User data"
        value={draft.userData}
        onChangeText={value => update({ userData: value })}
      />
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Scale with map zoom</Text>
        <Switch
          value={draft.scaleEnabled}
          onValueChange={value => update({ scaleEnabled: value })}
        />
      </View>
    </DialogShell>
  );
}

export function PolylineDialog({
  settings,
  onAdd,
  onCancel,
}: {
  settings: PolylineSettings;
  onAdd: (settings: PolylineSettings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({ ...settings });
  const update = (patch: Partial<PolylineSettings>) =>
    setDraft(current => ({ ...current, ...patch }));

  return (
    <DialogShell
      title="Polyline options"
      onAdd={() => onAdd(draft)}
      onCancel={onCancel}
    >
      <Field
        label="Point count"
        value={draft.pointCount}
        onChangeText={value => update({ pointCount: value })}
        keyboardType="numeric"
      />
      <Field
        label="Width"
        value={draft.width}
        onChangeText={value => update({ width: value })}
        keyboardType="numeric"
      />
      <Field
        label="Z-index"
        value={draft.zIndex}
        onChangeText={value => update({ zIndex: value })}
        keyboardType="numeric"
      />
      <Field
        label="User data"
        value={draft.userData}
        onChangeText={value => update({ userData: value })}
      />
      <ColorPicker
        label="Color"
        selected={draft.color}
        onSelect={value => update({ color: value })}
      />
    </DialogShell>
  );
}

export function PolygonDialog({
  settings,
  onAdd,
  onCancel,
}: {
  settings: PolygonSettings;
  onAdd: (settings: PolygonSettings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({ ...settings });
  const update = (patch: Partial<PolygonSettings>) =>
    setDraft(current => ({ ...current, ...patch }));

  return (
    <DialogShell
      title="Polygon options"
      onAdd={() => onAdd(draft)}
      onCancel={onCancel}
    >
      <Field
        label="Point count"
        value={draft.pointCount}
        onChangeText={value => update({ pointCount: value })}
        keyboardType="numeric"
      />
      <Field
        label="Stroke width"
        value={draft.strokeWidth}
        onChangeText={value => update({ strokeWidth: value })}
        keyboardType="numeric"
      />
      <Field
        label="Z-index"
        value={draft.zIndex}
        onChangeText={value => update({ zIndex: value })}
        keyboardType="numeric"
      />
      <Field
        label="User data"
        value={draft.userData}
        onChangeText={value => update({ userData: value })}
      />
      <ColorPicker
        label="Fill color"
        selected={draft.color}
        onSelect={value => update({ color: value })}
      />
      <ColorPicker
        label="Stroke color"
        selected={draft.strokeColor}
        onSelect={value => update({ strokeColor: value })}
      />
    </DialogShell>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function ColorPicker({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: number;
  onSelect: (argb: number) => void;
}) {
  return (
    <View style={styles.colorSection}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.colorRow}>
        {COLOR_PRESETS.map(color => (
          <TouchableOpacity
            key={color.argb}
            onPress={() => onSelect(color.argb)}
            style={[
              styles.colorSwatch,
              {
                backgroundColor:
                  '#' + (color.argb & 0xffffff).toString(16).padStart(6, '0'),
                borderWidth: selected === color.argb ? 3 : 1,
                borderColor:
                  selected === color.argb ? colors.accent : colors.divider,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function DialogShell({
  title,
  onAdd,
  onCancel,
  children,
}: {
  title: string;
  onAdd: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <ScrollView style={styles.dialogBody}>{children}</ScrollView>
          <View style={styles.dialogActions}>
            <TouchableOpacity onPress={onCancel} style={styles.dialogBtn}>
              <Text style={styles.dialogBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onAdd}
              style={[styles.dialogBtn, styles.dialogBtnPrimary]}
            >
              <Text style={[styles.dialogBtnText, styles.dialogBtnTextPrimary]}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: themeRadius.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.header,
    ...cardShadow,
  },
  buttonDestructive: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.errorText,
  },
  buttonText: { color: colors.header, fontSize: 13, fontWeight: '600' },
  buttonTextDestructive: { color: colors.errorText },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  dialogBody: { padding: spacing.lg },
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
  dialogBtnPrimary: { backgroundColor: colors.header },
  dialogBtnText: { fontSize: 14, color: colors.textPrimary },
  dialogBtnTextPrimary: { color: colors.textInverse, fontWeight: '600' },

  field: { marginBottom: spacing.md },
  fieldLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: themeRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 15,
    color: colors.textPrimary,
  },

  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.divider,
    marginRight: spacing.sm,
  },
  radioActive: {
    borderWidth: 5,
    borderColor: colors.accent,
  },
  radioLabel: {
    color: colors.textPrimary,
    fontSize: 14,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  switchLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    marginRight: spacing.md,
    flex: 1,
  },

  colorSection: { marginBottom: spacing.md },
  colorRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
