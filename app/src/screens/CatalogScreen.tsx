import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { demos, TAB_CATEGORIES, type TabCategory } from '../navigation/demos';
import { colors, spacing, typography } from '../theme/theme';

interface CatalogScreenProps {
  onOpen: (name: string) => void;
}

const TAB_LABELS: Record<TabCategory, string> = {
  navigation: 'Navigation',
  map: 'Map',
  directory: 'Directory',
};

export function CatalogScreen({ onOpen }: CatalogScreenProps) {
  const [activeTab, setActiveTab] = useState<TabCategory>('map');
  const [filter, setFilter] = useState('');

  const filteredDemos = useMemo(() => {
    const lower = filter.toLowerCase();
    return demos
      .filter(
        d => d.category === activeTab && d.name.toLowerCase().includes(lower),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeTab, filter]);

  return (
    <View style={styles.container}>
      {/* Filter input */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          value={filter}
          onChangeText={setFilter}
          placeholder="Filter"
          placeholderTextColor={colors.textMuted}
        />
        {filter.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setFilter('')}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TAB_CATEGORIES.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {TAB_LABELS[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Demo list */}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredDemos}
        keyExtractor={item => item.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => onOpen(item.name)}
          >
            <Text style={styles.itemTitle}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No demos found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Filter
  filterContainer: {
    backgroundColor: colors.header,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
  },
  clearBtn: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  clearBtnText: {
    color: colors.textInverse,
    fontSize: 18,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.header,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.tabIndicator,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.tabInactive,
  },
  tabTextActive: {
    color: colors.textInverse,
  },

  // List
  listContent: {
    paddingTop: spacing.xs,
  },
  listItem: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  itemTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
