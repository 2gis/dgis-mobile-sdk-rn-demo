import React from 'react';
import {
  Platform,
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
  children: React.ReactNode;
}

const safeAreaEdges: Edge[] =
  Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right'];

// Shared screen chrome: dark header with a title and an optional back button.
export function Screen({ title, onBack, rightAction, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={safeAreaEdges}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      <View style={styles.header}>
        <View style={styles.headerMain}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.back}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>{title}</Text>
        </View>
        {rightAction && <View style={styles.headerAction}>{rightAction}</View>}
      </View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
