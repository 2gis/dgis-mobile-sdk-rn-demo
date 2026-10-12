import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Screen } from '../components/Screen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { colors, spacing } from '../theme/theme';
import { demos } from './demos';
import { SdkDemoGate } from '../sdk/SdkDemoGate';
import { SdkSettingsModal } from '../settings/SdkSettingsModal';

// Minimal router: shows the catalog, or the selected demo wrapped in a Screen
// with a back button. The active demo is looked up by name from the registry.
export function Navigator() {
  const [active, setActive] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const demo = demos.find(d => d.name === active);

  if (!demo) {
    return (
      <Screen
        title="React Native SDK test app"
        rightAction={
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.settingsButtonText}>⚙</Text>
          </TouchableOpacity>
        }
      >
        <CatalogScreen onOpen={setActive} />
        <SdkSettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </Screen>
    );
  }

  const Demo = demo.component;
  return (
    <Screen
      title={demo.name}
      onBack={() => setActive(null)}
      contentEdgeToEdge={demo.edgeToEdge}
    >
      <SdkDemoGate>
        <Demo />
      </SdkDemoGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  settingsButtonText: {
    color: colors.textInverse,
    fontSize: 20,
  },
});
