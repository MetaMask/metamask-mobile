import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  TouchableWithoutFeedback,
  View,
  Text,
  SectionList,
  ActivityIndicator,
  SectionListRenderItem,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Fuse from 'fuse.js';
import styleSheet from './styles';
import { useStyles } from '../../../component-library/hooks';
import {
  UrlAutocompleteComponentProps,
  TokenSearchResult,
  AutocompleteSearchResult,
  UrlAutocompleteRef,
  UrlAutocompleteCategory,
  PerpsSearchResult,
  PredictionsSearchResult,
  FuseSearchResult,
} from './types';
import { strings } from '../../../../locales/i18n';
import {
  selectBrowserBookmarksWithType,
  selectBrowserHistoryWithType,
} from '../../../selectors/browser';
import {
  MAX_RECENTS,
  BROWSER_SEARCH_SECTIONS_ORDER,
} from './UrlAutocomplete.constants';
import { Result } from './Result';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../Bridge/hooks/useSwapBridgeNavigation';
import { BridgeToken } from '../Bridge/types';
import { useExploreSearch } from '../../Views/TrendingView/hooks/useExploreSearch';
import { type SectionId } from '../../Views/TrendingView/sections.config';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '../Perps/controllers/types';
import type { PredictMarket } from '../Predict/types';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { PerpsConnectionProvider } from '../Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../Perps/providers/PerpsStreamManager';
import { isCaipChainId, parseCaipChainId, type Hex } from '@metamask/utils';

/**
 * Fuse.js options for filtering browser history and bookmarks
 * Matches the original UrlAutocomplete configuration
 */
const HISTORY_FUSE_OPTIONS = {
  shouldSort: true,
  threshold: 0.4,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'url', weight: 0.5 },
  ],
};

export * from './types';

/**
 * Helper to convert CAIP chain ID to hex format
 */
const caipChainIdToHex = (caipChainId: string): Hex => {
  if (!isCaipChainId(caipChainId)) {
    return '0x1' as Hex;
  }
  const { reference } = parseCaipChainId(caipChainId);
  return `0x${parseInt(reference, 10).toString(16)}` as Hex;
};

/**
 * Helper to get token image URL from assetId
 */
const getTrendingTokenImageUrl = (assetId: string): string =>
  `https://token.api.cx.metamask.io/assets/${assetId}/logo.png`;

interface ResultsWithCategory {
  category: UrlAutocompleteCategory | SectionId;
  data: AutocompleteSearchResult[];
  isLoading?: boolean;
}

/**
 * Helper to map SectionId to UrlAutocompleteCategory for display
 */
const sectionIdToCategory = (sectionId: SectionId): UrlAutocompleteCategory => {
  switch (sectionId) {
    case 'sites':
      return UrlAutocompleteCategory.Sites;
    case 'tokens':
      return UrlAutocompleteCategory.Tokens;
    case 'perps':
      return UrlAutocompleteCategory.Perps;
    case 'predictions':
      return UrlAutocompleteCategory.Predictions;
    default:
      return UrlAutocompleteCategory.Sites;
  }
};

/**
 * Transform TrendingAsset to TokenSearchResult
 */
const transformTokenResult = (asset: TrendingAsset): TokenSearchResult => {
  const [caipChainId, assetIdentifier] = asset.assetId.split('/');
  const address = assetIdentifier?.split(':')[1] ?? '';
  const hexChainId = caipChainIdToHex(caipChainId);
  const priceChange = asset.priceChangePct?.h24
    ? parseFloat(asset.priceChangePct.h24)
    : 0;

  return {
    category: UrlAutocompleteCategory.Tokens,
    name: asset.name ?? '',
    symbol: asset.symbol ?? '',
    address,
    decimals: asset.decimals ?? 18,
    chainId: hexChainId,
    logoUrl: getTrendingTokenImageUrl(asset.assetId),
    price: parseFloat(asset.price) || 0,
    percentChange: priceChange,
    isFromSearch: true,
  };
};

/**
 * Transform PerpsMarketData to PerpsSearchResult
 */
const transformPerpsResult = (market: PerpsMarketData): PerpsSearchResult => ({
  category: UrlAutocompleteCategory.Perps,
  symbol: market.symbol,
  name: market.name,
  maxLeverage: market.maxLeverage,
  price: market.price,
  change24h: market.change24h,
  change24hPercent: market.change24hPercent,
  volume: market.volume,
  openInterest: market.openInterest,
  marketType: market.marketType,
  marketSource: market.marketSource,
});

/**
 * Transform PredictMarket to PredictionsSearchResult
 */
const transformPredictionsResult = (
  market: PredictMarket,
): PredictionsSearchResult => ({
  category: UrlAutocompleteCategory.Predictions,
  id: market.id,
  providerId: market.providerId,
  slug: market.slug,
  title: market.title,
  description: market.description,
  endDate: market.endDate,
  image: market.image,
  status: market.status,
  liquidity: market.liquidity,
  volume: market.volume,
});

/**
 * Props for the inner search content component
 */
interface SearchContentProps {
  searchQuery: string;
  filteredRecents: FuseSearchResult[];
  filteredFavorites: FuseSearchResult[];
  onSelect: (item: AutocompleteSearchResult) => void;
  hide: () => void;
  styles: ReturnType<typeof styleSheet>;
}

/**
 * Inner component that uses omni-search hook
 * Must be rendered inside PerpsConnectionProvider and PerpsStreamProvider
 */
const SearchContent: React.FC<SearchContentProps> = ({
  searchQuery,
  filteredRecents,
  filteredFavorites,
  onSelect,
  hide,
  styles,
}) => {
  const navigation = useNavigation();
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  // Use omni-search hook with browser-specific section order (Sites first)
  const {
    data: omniSearchData,
    isLoading: omniSearchLoading,
    sectionsOrder,
  } = useExploreSearch(searchQuery, {
    sectionsOrder: BROWSER_SEARCH_SECTIONS_ORDER,
  });

  // Transform omni-search results and interleave Recents/Favorites after Sites
  // Order: Sites → Recents → Favorites → Tokens → Perps → Predictions
  const searchResults: ResultsWithCategory[] = useMemo(() => {
    if (!searchQuery.trim() || !isBasicFunctionalityEnabled) return [];

    const results: ResultsWithCategory[] = [];

    sectionsOrder.forEach((sectionId) => {
      const sectionData = omniSearchData[sectionId] ?? [];
      const sectionIsLoading = omniSearchLoading[sectionId] ?? false;
      const category = sectionIdToCategory(sectionId);

      // Transform data based on section type
      let transformedData: AutocompleteSearchResult[] = [];

      switch (sectionId) {
        case 'sites':
          transformedData = (sectionData as { name: string; url: string }[])
            .filter((site) => site?.name && site?.url)
            .map((site) => ({
              category: UrlAutocompleteCategory.Sites,
              name: site.name,
              url: site.url,
            }));
          break;
        case 'tokens':
          transformedData = (sectionData as TrendingAsset[])
            .filter((token) => token?.assetId)
            .map(transformTokenResult);
          break;
        case 'perps':
          transformedData = (sectionData as PerpsMarketData[])
            .filter((market) => market?.symbol)
            .map(transformPerpsResult);
          break;
        case 'predictions':
          transformedData = (sectionData as PredictMarket[])
            .filter((market) => market?.id)
            .map(transformPredictionsResult);
          break;
      }

      // Add section if it has data or is loading
      if (transformedData.length > 0 || sectionIsLoading) {
        results.push({
          category,
          data: transformedData,
          isLoading: sectionIsLoading,
        });
      }

      // Insert Recents and Favorites after Sites section
      if (sectionId === 'sites') {
        if (filteredRecents.length > 0) {
          results.push({
            category: UrlAutocompleteCategory.Recents,
            data: filteredRecents,
          });
        }
        if (filteredFavorites.length > 0) {
          results.push({
            category: UrlAutocompleteCategory.Favorites,
            data: filteredFavorites,
          });
        }
      }
    });

    return results;
  }, [
    searchQuery,
    omniSearchData,
    omniSearchLoading,
    sectionsOrder,
    isBasicFunctionalityEnabled,
    filteredRecents,
    filteredFavorites,
  ]);

  const { goToSwaps: goToSwapsHook, networkModal } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenView,
    sourcePage: 'MainView',
  });

  const goToSwaps = useCallback(
    async (tokenResult: TokenSearchResult) => {
      try {
        const bridgeToken = {
          address: tokenResult.address,
          name: tokenResult.name,
          symbol: tokenResult.symbol,
          image: tokenResult.logoUrl,
          decimals: tokenResult.decimals,
          chainId: tokenResult.chainId,
        } satisfies BridgeToken;

        goToSwapsHook(bridgeToken);
      } catch (error) {
        return;
      }
    },
    [goToSwapsHook],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: ResultsWithCategory }) => (
      <View style={styles.categoryWrapper}>
        <Text style={styles.category}>
          {strings(`autocomplete.${section.category}`)}
        </Text>
        {section.isLoading && (
          <ActivityIndicator testID="loading-indicator" size="small" />
        )}
      </View>
    ),
    [styles],
  );

  const renderItem: SectionListRenderItem<AutocompleteSearchResult> =
    useCallback(
      ({ item }) => {
        // Guard against undefined items
        if (!item?.category) return null;
        return (
          <Result
            result={item}
            onPress={() => {
              if (item.category !== UrlAutocompleteCategory.Tokens) {
                hide();
              }
              onSelect(item);
            }}
            onSwapPress={goToSwaps}
            navigation={navigation}
          />
        );
      },
      [hide, onSelect, goToSwaps, navigation],
    );

  const keyExtractor = useCallback(
    (item: AutocompleteSearchResult, index: number) => {
      // Guard against undefined items
      if (!item?.category) return `undefined-${index}`;
      switch (item.category) {
        case UrlAutocompleteCategory.Tokens:
          return `${item.category}-${item.chainId}-${item.address}`;
        case UrlAutocompleteCategory.Perps:
          return `${item.category}-${item.symbol}`;
        case UrlAutocompleteCategory.Predictions:
          return `${item.category}-${item.id}`;
        default:
          return `${item.category}-${'url' in item ? item.url : index}`;
      }
    },
    [],
  );

  if (searchResults.length === 0) {
    return null;
  }

  return (
    <>
      <SectionList<AutocompleteSearchResult, ResultsWithCategory>
        contentContainerStyle={styles.contentContainer}
        sections={searchResults}
        keyExtractor={keyExtractor}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
      />
      {networkModal}
    </>
  );
};

/**
 * Autocomplete list that appears when the browser url bar is focused
 * Integrates omni-search from Explore page with Sites shown first
 */
const UrlAutocomplete = forwardRef<
  UrlAutocompleteRef,
  UrlAutocompleteComponentProps
>(({ onSelect, onDismiss }, ref) => {
  const browserHistory = useSelector(selectBrowserHistoryWithType);
  const bookmarks = useSelector(selectBrowserBookmarksWithType);

  // Track current search query
  const [searchQuery, setSearchQuery] = useState('');

  const resultsRef = useRef<View | null>(null);
  const { styles } = useStyles(styleSheet, {});

  // Deduplicated browser history (Recents)
  const deduplicatedRecents = useMemo(() => {
    const recents = browserHistory.filter(
      (result, index, self) =>
        result.category === UrlAutocompleteCategory.Recents &&
        index ===
          self.findIndex(
            (r) => r.url === result.url && r.category === result.category,
          ),
    );
    return recents.slice(0, MAX_RECENTS);
  }, [browserHistory]);

  // Deduplicated bookmarks (Favorites)
  const deduplicatedFavorites = useMemo(
    () =>
      bookmarks.filter(
        (result, index, self) =>
          result.category === UrlAutocompleteCategory.Favorites &&
          index ===
            self.findIndex(
              (r) => r.url === result.url && r.category === result.category,
            ),
      ),
    [bookmarks],
  );

  // Filtered Recents using Fuse.js (for search mode)
  // Fuse.js v3.x returns T[] directly (not FuseResult<T>[])
  const filteredRecents = useMemo((): FuseSearchResult[] => {
    if (!searchQuery.trim()) return [];
    const recentsArray = [...deduplicatedRecents] as FuseSearchResult[];
    const fuse = new Fuse(recentsArray, HISTORY_FUSE_OPTIONS);
    return fuse.search(searchQuery) as FuseSearchResult[];
  }, [deduplicatedRecents, searchQuery]);

  // Filtered Favorites using Fuse.js (for search mode)
  // Fuse.js v3.x returns T[] directly (not FuseResult<T>[])
  const filteredFavorites = useMemo((): FuseSearchResult[] => {
    if (!searchQuery.trim()) return [];
    const favoritesArray = [...deduplicatedFavorites] as FuseSearchResult[];
    const fuse = new Fuse(favoritesArray, HISTORY_FUSE_OPTIONS);
    return fuse.search(searchQuery) as FuseSearchResult[];
  }, [deduplicatedFavorites, searchQuery]);

  // Empty state: show Recents and Favorites from browser history/bookmarks
  const emptyStateResults: ResultsWithCategory[] = useMemo(() => {
    if (searchQuery.trim()) return [];

    const results: ResultsWithCategory[] = [];

    if (deduplicatedRecents.length > 0) {
      results.push({
        category: UrlAutocompleteCategory.Recents,
        data: deduplicatedRecents,
      });
    }

    if (deduplicatedFavorites.length > 0) {
      results.push({
        category: UrlAutocompleteCategory.Favorites,
        data: deduplicatedFavorites,
      });
    }

    return results;
  }, [searchQuery, deduplicatedRecents, deduplicatedFavorites]);

  const hasEmptyStateResults = emptyStateResults.some(
    (section) => section.data.length > 0,
  );
  const isSearchMode = searchQuery.trim().length > 0;

  const show = useCallback(() => {
    resultsRef.current?.setNativeProps({ style: { display: 'flex' } });
  }, []);

  const reset = useCallback(() => {
    setSearchQuery('');
  }, []);

  const search = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const hide = useCallback(() => {
    reset();
    resultsRef.current?.setNativeProps({ style: { display: 'none' } });
  }, [reset]);

  const dismissAutocomplete = useCallback(() => {
    hide();
    onDismiss();
  }, [hide, onDismiss]);

  useImperativeHandle(ref, () => ({
    search,
    hide,
    show,
  }));

  const { goToSwaps: goToSwapsHook, networkModal } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenView,
    sourcePage: 'MainView',
  });

  const goToSwaps = useCallback(
    async (tokenResult: TokenSearchResult) => {
      try {
        const bridgeToken = {
          address: tokenResult.address,
          name: tokenResult.name,
          symbol: tokenResult.symbol,
          image: tokenResult.logoUrl,
          decimals: tokenResult.decimals,
          chainId: tokenResult.chainId,
        } satisfies BridgeToken;

        goToSwapsHook(bridgeToken);
      } catch (error) {
        return;
      }
    },
    [goToSwapsHook],
  );

  // Render section header for empty state
  const renderSectionHeader = useCallback(
    ({ section }: { section: ResultsWithCategory }) => (
      <View style={styles.categoryWrapper}>
        <Text style={styles.category}>
          {strings(`autocomplete.${section.category}`)}
        </Text>
      </View>
    ),
    [styles],
  );

  // Render item for empty state
  const renderItem: SectionListRenderItem<AutocompleteSearchResult> =
    useCallback(
      ({ item }) => (
        <Result
          result={item}
          onPress={() => {
            hide();
            onSelect(item);
          }}
          onSwapPress={goToSwaps}
        />
      ),
      [hide, onSelect, goToSwaps],
    );

  const keyExtractor = useCallback(
    (item: AutocompleteSearchResult, index: number) => {
      if ('url' in item) {
        return `${item.category}-${item.url}`;
      }
      return `${item.category}-${index}`;
    },
    [],
  );

  // No results and not searching - show empty background
  if (!hasEmptyStateResults && !isSearchMode) {
    return (
      <View ref={resultsRef} style={styles.wrapper}>
        <TouchableWithoutFeedback
          style={styles.bg}
          onPress={dismissAutocomplete}
        >
          <View style={styles.bg} />
        </TouchableWithoutFeedback>
      </View>
    );
  }

  return (
    <View ref={resultsRef} style={styles.wrapper}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        {isSearchMode ? (
          // Search mode: wrap with Perps providers for omni-search
          <PerpsConnectionProvider>
            <PerpsStreamProvider>
              <SearchContent
                searchQuery={searchQuery}
                filteredRecents={filteredRecents}
                filteredFavorites={filteredFavorites}
                onSelect={onSelect}
                hide={hide}
                styles={styles}
              />
            </PerpsStreamProvider>
          </PerpsConnectionProvider>
        ) : (
          // Empty state: show Recents and Favorites
          <SectionList<AutocompleteSearchResult, ResultsWithCategory>
            contentContainerStyle={styles.contentContainer}
            sections={emptyStateResults}
            keyExtractor={keyExtractor}
            renderSectionHeader={renderSectionHeader}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </KeyboardAvoidingView>
      {networkModal}
    </View>
  );
});

export default UrlAutocomplete;
