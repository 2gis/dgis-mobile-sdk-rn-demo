import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme/theme';

interface ScreenProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  contentEdgeToEdge?: boolean;
  children: React.ReactNode;
}

// Android 15+ (targetSdk 35+) enforces edge-to-edge: the status bar overlays
// content and intercepts touches there, so the header must reserve the top
// inset on both platforms or its back/action buttons become untappable.
const headerSafeAreaEdges: Edge[] = ['top', 'left', 'right'];
const contentSafeAreaEdges: Edge[] = ['left', 'right'];

// Shared screen chrome: dark header with a title and an optional back button.
export function Screen({
  title,
  onBack,
  rightAction,
  contentEdgeToEdge = false,
  children,
}: ScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      <SafeAreaView style={styles.headerSafeArea} edges={headerSafeAreaEdges}>
        <View style={styles.header}>
          <View style={styles.headerMain}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.back}>
                <Text style={styles.backText}>←</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.title}>{title}</Text>
          </View>
          {rightAction && (
            <View style={styles.headerAction}>{rightAction}</View>
          )}
        </View>
      </SafeAreaView>
      <SafeAreaView
        style={styles.content}
        edges={contentEdgeToEdge ? [] : contentSafeAreaEdges}
      >
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSafeArea: {
    backgroundColor: colors.header,
  },
  header: {
    backgroundColor: colors.header,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  backText: {
    color: colors.textInverse,
    fontSize: 22,
  },
  title: {
    ...typography.title,
    color: colors.textInverse,
  },
  headerAction: {
    marginLeft: spacing.md,
  },
  content: {
    flex: 1,
  },
});
