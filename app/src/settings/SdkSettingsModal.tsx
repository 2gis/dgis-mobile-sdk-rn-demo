import React, { useEffect, useState } from 'react';
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
import type { LogLevel } from '@2gis/dgis-mobile-sdk-map';
import { colors, radius, spacing, typography } from '../theme/theme';
import { useSdkController } from '../sdk/SdkProvider';
import {
  defaultSdkSettings,
  sdkMapGraphicsPresetOptions,
  sdkMapThemeModes,
  sdkLogLevels,
  validateSdkSettings,
  type HttpOptionsSettings,
  type LocationOptionsSettings,
  type LogOptionsSettings,
  type MapGraphicsPresetMode,
  type MapSettings,
  type MapThemeMode,
  type SdkSettings,
} from './index';

interface SdkSettingsModalProps {
  onClose: () => void;
  visible: boolean;
}

export function SdkSettingsModal({ onClose, visible }: SdkSettingsModalProps) {
  const { isSettingsReady, saveSettings, settings } = useSdkController();
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setDraft(settings);
    setError(null);
    setIsSaving(false);
  }, [settings, visible]);

  const handleSave = async () => {
    const validationError = validateSdkSettings(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveSettings(draft);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>SDK settings</Text>
          {!isSettingsReady ? (
            <View style={styles.loadingBody}>
              <Text style={styles.note}>Loading SDK settings...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
            >
              <SettingsSection title="Http Options">
                <Field
                  label="Timeout, ms"
                  value={draft.http.timeoutMs}
                  onChangeText={value =>
                    setHttpDraftField(setDraft, 'timeoutMs', value)
                  }
                  keyboardType="numeric"
                />
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Use cache</Text>
                  <Switch
                    value={draft.http.useCache}
                    onValueChange={value =>
                      setHttpDraftField(setDraft, 'useCache', value)
                    }
                  />
                </View>
                <Field
                  label="Cache storage path"
                  value={draft.http.cacheStoragePath}
                  onChangeText={value =>
                    setHttpDraftField(setDraft, 'cacheStoragePath', value)
                  }
                  keyboardType="default"
                />
                <Field
                  label="Cache max size, bytes"
                  value={draft.http.cacheMaxSizeBytes}
                  onChangeText={value =>
                    setHttpDraftField(setDraft, 'cacheMaxSizeBytes', value)
                  }
                  keyboardType="numeric"
                />
              </SettingsSection>

              <SettingsSection title="Log Options">
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Use custom logger</Text>
                  <Switch
                    value={draft.log.useCustom}
                    onValueChange={value =>
                      setLogDraftField(setDraft, 'useCustom', value)
                    }
                  />
                </View>
                <EnumSelector<LogLevel>
                  label="System level"
                  options={sdkLogLevels}
                  value={draft.log.systemLevel}
                  onChange={value =>
                    setLogDraftField(setDraft, 'systemLevel', value)
                  }
                />
                <EnumSelector<LogLevel>
                  label="Custom level"
                  options={sdkLogLevels}
                  value={draft.log.customLevel}
                  onChange={value =>
                    setLogDraftField(setDraft, 'customLevel', value)
                  }
                />
              </SettingsSection>

              <SettingsSection title="Location options">
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>
                    useCustomLocationProvider
                  </Text>
                  <Switch
                    value={draft.location.useCustomLocationProvider}
                    onValueChange={value =>
                      setLocationDraftField(
                        setDraft,
                        'useCustomLocationProvider',
                        value,
                      )
                    }
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>
                    useCustomHeadingProvider
                  </Text>
                  <Switch
                    value={draft.location.useCustomHeadingProvider}
                    onValueChange={value =>
                      setLocationDraftField(
                        setDraft,
                        'useCustomHeadingProvider',
                        value,
                      )
                    }
                  />
                </View>
              </SettingsSection>

              <SettingsSection title="Map settings">
                <EnumSelector<MapThemeMode>
                  label="Map theme"
                  options={sdkMapThemeModes}
                  value={draft.map.theme}
                  onChange={value => setMapDraftField(setDraft, 'theme', value)}
                />
                <EnumSelector<MapGraphicsPresetMode>
                  label="GraphicPresets"
                  options={sdkMapGraphicsPresetOptions}
                  value={draft.map.graphicsPreset}
                  onChange={value =>
                    setMapDraftField(setDraft, 'graphicsPreset', value)
                  }
                />
                <Field
                  label="Style file path"
                  value={draft.map.styleFilePath}
                  onChangeText={value =>
                    setMapDraftField(setDraft, 'styleFilePath', value)
                  }
                  keyboardType="default"
                />
              </SettingsSection>

              <Text style={styles.note}>
                Map settings are used for newly created maps. Context settings
                are used the next time the SDK context is created; restart the
                app if it is already initialized.
              </Text>

              {error && <Text style={styles.errorText}>{error}</Text>}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setDraft(defaultSdkSettings);
                setError(null);
              }}
            >
              <Text style={styles.actionText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={onClose}>
              <Text style={styles.actionText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
              onPress={() => {
                void handleSave();
              }}
              disabled={!isSettingsReady || isSaving}
            >
              <Text style={[styles.actionText, styles.primaryActionText]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SettingsSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  keyboardType,
  label,
  onChangeText,
  value,
}: {
  keyboardType: 'default' | 'numeric';
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

type SelectorValue = string | number;

interface SelectorOption<T extends SelectorValue> {
  readonly label: string;
  readonly value: T;
}

function EnumSelector<T extends SelectorValue>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: readonly SelectorOption<T>[];
  value: T;
}) {
  const selectedIndex = options.findIndex(option => option.value === value);
  const currentOption = options[selectedIndex >= 0 ? selectedIndex : 0];

  if (!currentOption) {
    return null;
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.enumSwitcher}>
        <TouchableOpacity
          style={styles.enumSwitcherButton}
          onPress={() =>
            onChange(getAdjacentOptionValue(options, currentOption.value, -1))
          }
        >
          <Text style={styles.enumSwitcherButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.enumSwitcherValue}>
          <Text style={styles.enumSwitcherValueText}>
            {currentOption.label}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.enumSwitcherButton}
          onPress={() =>
            onChange(getAdjacentOptionValue(options, currentOption.value, 1))
          }
        >
          <Text style={styles.enumSwitcherButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getAdjacentOptionValue<T extends SelectorValue>(
  options: readonly SelectorOption<T>[],
  current: T,
  offset: -1 | 1,
): T {
  if (options.length === 0) {
    return current;
  }

  const currentIndex = options.findIndex(option => option.value === current);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeIndex + offset + options.length) % options.length;

  return options[nextIndex]?.value ?? current;
}

function setHttpDraftField<K extends keyof HttpOptionsSettings>(
  setDraft: React.Dispatch<React.SetStateAction<SdkSettings>>,
  key: K,
  value: HttpOptionsSettings[K],
) {
  setDraft(current => ({
    ...current,
    http: {
      ...current.http,
      [key]: value,
    },
  }));
}

function setMapDraftField<K extends keyof MapSettings>(
  setDraft: React.Dispatch<React.SetStateAction<SdkSettings>>,
  key: K,
  value: MapSettings[K],
) {
  setDraft(current => ({
    ...current,
    map: {
      ...current.map,
      [key]: value,
    },
  }));
}

function setLogDraftField<K extends keyof LogOptionsSettings>(
  setDraft: React.Dispatch<React.SetStateAction<SdkSettings>>,
  key: K,
  value: LogOptionsSettings[K],
) {
  setDraft(current => ({
    ...current,
    log: {
      ...current.log,
      [key]: value,
    },
  }));
}

function setLocationDraftField<K extends keyof LocationOptionsSettings>(
  setDraft: React.Dispatch<React.SetStateAction<SdkSettings>>,
  key: K,
  value: LocationOptionsSettings[K],
) {
  setDraft(current => ({
    ...current,
    location: {
      ...current.location,
      [key]: value,
    },
  }));
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingBody: {
    padding: spacing.xl,
  },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionBody: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: {
    ...typography.label,
    color: colors.textPrimary,
    flex: 1,
  },
  enumSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  enumSwitcherButton: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.sm,
    minWidth: 44,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enumSwitcherButtonText: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  enumSwitcherValue: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.header,
    borderRadius: radius.sm,
    backgroundColor: colors.header,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  enumSwitcherValueText: {
    ...typography.label,
    color: colors.textInverse,
  },
  note: {
    ...typography.caption,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.caption,
    color: colors.errorText,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  actionText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  primaryAction: {
    backgroundColor: colors.header,
  },
  primaryActionText: {
    color: colors.textInverse,
  },
});
