import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../theme/theme';

// Centered placeholder text for an empty list.
export function EmptyState({ text }: { text: string }) {
  return <Text style={styles.text}>{text}</Text>;
}

const styles = StyleSheet.create({
  text: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xl * 2,
  },
});
