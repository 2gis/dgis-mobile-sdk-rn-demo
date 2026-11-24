import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

export type NavigationRouteType = 'Car' | 'Pedestrian' | 'Bicycle';

export interface NavigationDemoSettings {
  freeRoam: boolean;
  useSimulation: boolean;
  speedKph: number;
  allowableSpeedExcessKph: number;
  routeType: NavigationRouteType;
  cacheDistanceOnRouteM: number;
  cacheRadiusOnRouteM: number;
  cacheRadiusM: number;
}

export const defaultNavigationDemoSettings: NavigationDemoSettings = {
  freeRoam: false,
  useSimulation: true,
  speedKph: 60,
  allowableSpeedExcessKph: 0,
  routeType: 'Car',
  cacheDistanceOnRouteM: 0,
  cacheRadiusOnRouteM: 0,
  cacheRadiusM: 0,
};

function SpeedSetting({
  label,
  value,
  step,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <Text style={styles.rowLabel}>
        {label}: {value} km/h
      </Text>
      {([-1, 1] as const).map(direction => {
        const unavailable =
          disabled || (direction < 0 ? value <= min : value >= max);
        return (
          <Pressable
            key={direction}
            accessibilityRole="button"
            accessibilityLabel={`${
              direction < 0 ? 'Decrease' : 'Increase'
            } ${label}`}
            disabled={unavailable}
            style={[styles.stepperButton, unavailable && styles.disabled]}
            onPress={() =>
              onChange(Math.min(max, Math.max(min, value + direction * step)))
            }
          >
            <Text style={styles.stepperText}>{direction < 0 ? '−' : '+'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DistanceSetting({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label} (m)</Text>
      <TextInput
        accessibilityLabel={`${label} (m)`}
        style={styles.numberInput}
        keyboardType="number-pad"
        value={value === 0 ? '' : String(value)}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        maxLength={9}
        onChangeText={text => {
          if (/^\d*$/.test(text)) {
            onChange(Number(text));
          }
        }}
      />
    </View>
  );
}

export function NavigationDemoSettingsForm({
  value,
  onChange,
}: {
  value: NavigationDemoSettings;
  onChange: (value: NavigationDemoSettings) => void;
}) {
  const [freeRoamExpanded, setFreeRoamExpanded] = useState(false);
  const update = (patch: Partial<NavigationDemoSettings>) =>
    onChange({ ...value, ...patch });
  return (
    <View style={styles.form}>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Free roam</Text>
        <Switch
          accessibilityLabel="Free roam"
          value={value.freeRoam}
          onValueChange={freeRoam =>
            update({
              freeRoam,
              useSimulation: freeRoam ? false : value.useSimulation,
            })
          }
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Use simulation</Text>
        <Switch
          accessibilityLabel="Use simulation"
          value={value.useSimulation}
          disabled={value.freeRoam}
          onValueChange={useSimulation => update({ useSimulation })}
        />
      </View>
      {value.freeRoam && (
        <Text style={styles.hint}>
          Free roam uses your location without a route or simulation.
        </Text>
      )}
      <SpeedSetting
        label="Simulation speed"
        value={value.speedKph}
        step={5}
        min={5}
        max={200}
        disabled={!value.useSimulation || value.freeRoam}
        onChange={speedKph => update({ speedKph })}
      />
      <SpeedSetting
        label="Permissible speeding"
        value={value.allowableSpeedExcessKph}
        step={1}
        onChange={allowableSpeedExcessKph =>
          update({ allowableSpeedExcessKph })
        }
      />
      <Text style={styles.hint}>
        Allowed excess above the road speed limit.
      </Text>
      <Text style={styles.sectionTitle}>Route type</Text>
      <View style={styles.routeTypes}>
        {(['Car', 'Pedestrian', 'Bicycle'] as const).map(routeType => (
          <Pressable
            key={routeType}
            accessibilityRole="radio"
            accessibilityState={{
              checked: value.routeType === routeType,
              disabled: value.freeRoam,
            }}
            disabled={value.freeRoam}
            style={[
              styles.routeType,
              value.routeType === routeType && styles.selectedRouteType,
              value.freeRoam && styles.disabled,
            ]}
            onPress={() => update({ routeType })}
          >
            <Text
              style={
                value.routeType === routeType
                  ? styles.selectedText
                  : styles.routeTypeText
              }
            >
              {routeType}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Free roam settings"
        accessibilityState={{ expanded: freeRoamExpanded }}
        style={styles.disclosure}
        onPress={() => setFreeRoamExpanded(expanded => !expanded)}
      >
        <Text style={styles.sectionTitle}>Free roam settings</Text>
        <Text style={styles.sectionTitle}>{freeRoamExpanded ? '−' : '+'}</Text>
      </Pressable>
      {freeRoamExpanded && (
        <View style={styles.form}>
          <Text style={styles.hint}>
            Road graph cache prefetching. Set 0 to disable a parameter. On-route
            settings also apply during route navigation.
          </Text>
          <DistanceSetting
            label="Cache distance on route"
            value={value.cacheDistanceOnRouteM}
            onChange={cacheDistanceOnRouteM =>
              update({ cacheDistanceOnRouteM })
            }
          />
          <DistanceSetting
            label="Cache radius on route"
            value={value.cacheRadiusOnRouteM}
            onChange={cacheRadiusOnRouteM => update({ cacheRadiusOnRouteM })}
          />
          <DistanceSetting
            label="Cache radius"
            value={value.cacheRadiusM}
            onChange={cacheRadiusM => update({ cacheRadiusM })}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  disclosure: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: { flex: 1, color: colors.textPrimary, ...typography.body },
  hint: { color: colors.textMuted, ...typography.caption },
  sectionTitle: { color: colors.textPrimary, ...typography.subtitle },
  disabled: { opacity: 0.4 },
  stepperButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  stepperText: { color: colors.textPrimary, ...typography.title },
  numberInput: {
    width: 110,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    textAlign: 'right',
    ...typography.body,
  },
  routeTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  routeType: {
    padding: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  selectedRouteType: { backgroundColor: colors.accent },
  routeTypeText: { color: colors.textPrimary, ...typography.label },
  selectedText: { color: colors.textInverse, ...typography.label },
});
