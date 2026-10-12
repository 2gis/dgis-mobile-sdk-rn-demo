import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  FormattingType,
  SearchManager,
  SearchQueryBuilder,
  SuggestHandlerKind,
  SuggestQueryBuilder,
} from '@2gis/dgis-mobile-sdk-full';
import type {
  DirectoryObject,
  Page,
  SearchQuery,
  Suggest,
  SuggestQuery,
} from '@2gis/dgis-mobile-sdk-full';
import { useSdk } from '../sdk/useSdk';
import { useNative } from '../hooks/useNative';
import { useLatestFuture } from '../hooks/useLatestFuture';
import { useFutures } from '../hooks/useFutures';
import {
  destroyIfPresent,
  ignoreNativeDestroyedError,
} from '../hooks/nativeObjectLifecycle';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import {
  cardShadow,
  colors,
  radius,
  spacing,
  typography,
} from '../theme/theme';

interface SuggestListItem {
  kind: 'suggest';
  suggest: Suggest;
  title: string;
  subtitle: string;
}

interface DirectoryListItem {
  kind: 'directory';
  title: string;
  subtitle: string;
  address: string;
}

type SearchListItem = SuggestListItem | DirectoryListItem;

function destroyListItems(items: SearchListItem[]): void {
  for (const item of items) {
    if (item.kind === 'suggest') {
      ignoreNativeDestroyedError(() => destroyIfPresent(item.suggest));
    }
  }
}

function createSuggestItem(suggest: Suggest): SuggestListItem {
  return {
    kind: 'suggest',
    suggest,
    title: suggest.title.text,
    subtitle: suggest.subtitle.text,
  };
}

function formatAddress(object: DirectoryObject): string {
  const address = object.formattedAddress(FormattingType.Full);
  if (!address) {
    return '';
  }

  return [address.streetAddress, address.drilldownAddress]
    .filter(Boolean)
    .join(', ');
}

function createDirectoryItem(object: DirectoryObject): DirectoryListItem {
  return {
    kind: 'directory',
    title: object.title || 'Untitled object',
    subtitle: object.subtitle || object.description,
    address: formatAddress(object),
  };
}

function createDirectoryItems(objects: DirectoryObject[]): DirectoryListItem[] {
  const items = objects.map(createDirectoryItem);
  for (const object of objects) {
    ignoreNativeDestroyedError(() => destroyIfPresent(object));
  }
  return items;
}

function buildSuggestQuery(text: string): SuggestQuery {
  const builder = new SuggestQueryBuilder(text);
  try {
    return builder.build();
  } finally {
    ignoreNativeDestroyedError(() => destroyIfPresent(builder));
  }
}

function buildSearchQuery(text: string): SearchQuery {
  const builder = new SearchQueryBuilder();
  try {
    return builder.setQueryText(text).build();
  } finally {
    ignoreNativeDestroyedError(() => destroyIfPresent(builder));
  }
}

function copySearchQuery(query: SearchQuery): SearchQuery {
  const builder = SearchQueryBuilder.fromQuery(query);
  try {
    return builder.build();
  } finally {
    ignoreNativeDestroyedError(() => destroyIfPresent(builder));
  }
}

/**
 * Online directory search demo. Types in the text field trigger suggest queries;
 * submitting the text or tapping a perform-search suggest runs SearchManager.search.
 * Results are shown in a flat list with latest-wins request semantics.
 */
export function SearchDemo() {
  const context = useSdk();
  const searchManager = useNative(
    () => SearchManager.createOnlineManager(context),
    [context],
  );

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingNextPage, setLoadingNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef<SearchListItem[]>([]);
  const pageRef = useRef<Page | null>(null);
  const requestVersionRef = useRef(0);
  const pageVersionRef = useRef(0);
  const runFuture = useLatestFuture();
  const runPageFuture = useFutures();

  const replaceItems = useCallback((nextItems: SearchListItem[]) => {
    destroyListItems(itemsRef.current);
    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const replacePage = useCallback((nextPage: Page | null) => {
    pageVersionRef.current += 1;
    ignoreNativeDestroyedError(() => destroyIfPresent(pageRef.current));
    pageRef.current = nextPage;
  }, []);

  const resetResults = useCallback(() => {
    replaceItems([]);
    replacePage(null);
  }, [replaceItems, replacePage]);

  useEffect(() => {
    return () => {
      destroyListItems(itemsRef.current);
      itemsRef.current = [];
      ignoreNativeDestroyedError(() => destroyIfPresent(pageRef.current));
      pageRef.current = null;
    };
  }, []);

  const runSuggest = useCallback(
    (text: string) => {
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;
      const trimmedText = text.trim();

      if (!trimmedText || !searchManager) {
        resetResults();
        setError(null);
        setSearching(false);
        setLoadingNextPage(false);
        return;
      }

      setSearching(true);
      setError(null);
      setLoadingNextPage(false);
      replacePage(null);

      const suggestQuery = buildSuggestQuery(text);
      runFuture(
        searchManager.suggest(suggestQuery),
        result => {
          if (requestVersionRef.current !== requestVersion) {
            return;
          }

          replaceItems(result.suggests.map(createSuggestItem));
          setSearching(false);
        },
        err => {
          if (requestVersionRef.current !== requestVersion) {
            return;
          }

          setError(String(err));
          resetResults();
          setSearching(false);
        },
      );
    },
    [replaceItems, replacePage, resetResults, runFuture, searchManager],
  );

  const runSearch = useCallback(
    (searchQuery: SearchQuery) => {
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;

      if (!searchManager) {
        return;
      }

      setSearching(true);
      setError(null);
      setLoadingNextPage(false);
      resetResults();

      runFuture(
        searchManager.search(searchQuery),
        result => {
          if (requestVersionRef.current !== requestVersion) {
            return;
          }

          const page = result.firstPage;
          replacePage(page);
          replaceItems(page ? createDirectoryItems(page.items) : []);
          setSearching(false);
        },
        err => {
          if (requestVersionRef.current !== requestVersion) {
            return;
          }

          setError(String(err));
          resetResults();
          setSearching(false);
        },
      );
    },
    [replaceItems, replacePage, resetResults, runFuture, searchManager],
  );

  const onChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      runSuggest(text);
    },
    [runSuggest],
  );

  const onSubmitSearch = useCallback(() => {
    const trimmedText = query.trim();
    if (!trimmedText) {
      requestVersionRef.current += 1;
      resetResults();
      setError(null);
      setSearching(false);
      setLoadingNextPage(false);
      return;
    }

    runSearch(buildSearchQuery(trimmedText));
  }, [query, resetResults, runSearch]);

  const onSuggestPress = useCallback(
    (item: SuggestListItem) => {
      const handler = item.suggest.handler;

      switch (handler.kind) {
        case SuggestHandlerKind.ObjectHandler: {
          const object = handler.value.item;
          requestVersionRef.current += 1;
          setQuery(item.title);
          setError(null);
          setSearching(false);
          setLoadingNextPage(false);
          replacePage(null);
          replaceItems([createDirectoryItem(object)]);
          ignoreNativeDestroyedError(() => destroyIfPresent(object));
          break;
        }
        case SuggestHandlerKind.IncompleteTextHandler: {
          const nextQuery = handler.value.queryText;
          requestVersionRef.current += 1;
          setQuery(nextQuery);
          setError(null);
          setSearching(false);
          setLoadingNextPage(false);
          resetResults();
          break;
        }
        case SuggestHandlerKind.PerformSearchHandler: {
          const sourceQuery = handler.value.searchQuery;
          const searchQuery = copySearchQuery(sourceQuery);
          setQuery(item.title);
          runSearch(searchQuery);
          ignoreNativeDestroyedError(() => destroyIfPresent(sourceQuery));
          break;
        }
        default:
          setError(`Unknown suggest handler: ${String(handler)}`);
      }

      ignoreNativeDestroyedError(() => destroyIfPresent(handler.value));
    },
    [replaceItems, replacePage, resetResults, runSearch],
  );

  const loadNextPage = useCallback(() => {
    const page = pageRef.current;
    if (!page || searching || loadingNextPage) {
      return;
    }

    const requestPageVersion = pageVersionRef.current;
    setLoadingNextPage(true);
    runPageFuture(
      page.fetchNextPage(),
      nextPage => {
        if (
          pageVersionRef.current !== requestPageVersion ||
          pageRef.current !== page
        ) {
          ignoreNativeDestroyedError(() => destroyIfPresent(nextPage));
          return;
        }

        if (!nextPage) {
          replacePage(null);
          setLoadingNextPage(false);
          return;
        }

        replacePage(nextPage);
        const nextItems = createDirectoryItems(nextPage.items);
        const mergedItems = [...itemsRef.current, ...nextItems];
        itemsRef.current = mergedItems;
        setItems(mergedItems);
        setLoadingNextPage(false);
      },
      err => {
        if (
          pageVersionRef.current !== requestPageVersion ||
          pageRef.current !== page
        ) {
          return;
        }

        setError(String(err));
        setLoadingNextPage(false);
      },
    );
  }, [loadingNextPage, replacePage, runPageFuture, searching]);

  const renderItem = useCallback(
    ({ item }: { item: SearchListItem }) => {
      if (item.kind === 'suggest') {
        return <SuggestRow item={item} onPress={onSuggestPress} />;
      }

      return <DirectoryRow item={item} />;
    },
    [onSuggestPress],
  );

  const showEmpty = !searching && query.length > 0 && !error;
  const isSearchButtonDisabled = !query.trim() || !searchManager || searching;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[
            styles.searchButton,
            isSearchButtonDisabled && styles.searchButtonDisabled,
          ]}
          onPress={onSubmitSearch}
          disabled={isSearchButtonDisabled}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {searching && (
        <ActivityIndicator style={styles.loader} color={colors.header} />
      )}

      {error && <ErrorBanner text={error} />}

      <FlatList
        data={items}
        keyExtractor={(_, i) => i.toString()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingNextPage ? (
            <ActivityIndicator style={styles.loader} color={colors.header} />
          ) : null
        }
        ListEmptyComponent={showEmpty ? <EmptyState text="No results" /> : null}
      />
    </View>
  );
}

/** Single suggest entry row. */
function SuggestRow({
  item,
  onPress,
}: {
  item: SuggestListItem;
  onPress: (item: SuggestListItem) => void;
}) {
  return (
    <TouchableOpacity style={rowStyles.container} onPress={() => onPress(item)}>
      <Text style={rowStyles.badge}>Suggest</Text>
      <Text style={rowStyles.title}>{item.title}</Text>
      {item.subtitle ? (
        <Text style={rowStyles.subtitle}>{item.subtitle}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

/** Single directory search result row. */
function DirectoryRow({ item }: { item: DirectoryListItem }) {
  return (
    <View style={rowStyles.container}>
      <Text style={rowStyles.badge}>Search result</Text>
      <Text style={rowStyles.title}>{item.title}</Text>
      {item.subtitle ? (
        <Text style={rowStyles.subtitle}>{item.subtitle}</Text>
      ) : null}
      {item.address ? (
        <Text style={rowStyles.address}>{item.address}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    ...cardShadow,
  },
  searchButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...cardShadow,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    ...typography.label,
    color: colors.textInverse,
    fontWeight: '600',
  },
  loader: { marginVertical: spacing.md },
  list: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
});

const rowStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.md,
    ...cardShadow,
  },
  badge: {
    ...typography.small,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  address: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
