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
  SectionListRenderItem,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Fuse from 'fuse.js';
import styleSheet from './styles';
import { useStyles } from '../../../component-library/hooks';
import {
  UrlAutocompleteComponentProps,
  FuseSearchResult,
  TokenSearchResult,
  AutocompleteSearchResult,
  UrlAutocompleteRef,
  UrlAutocompleteCategory,
  PerpsSearchResult,
  PredictionsSearchResult,
} from './types';
import { strings } from '../../../../locales/i18n';
import {
  selectBrowserBookmarksWithType,
  selectBrowserHistoryWithType,
} from '../../../selectors/browser';
import {
  MAX_RECENTS,
  EMPTY_STATE_CATEGORIES,
  BROWSER_SEARCH_SECTIONS_ORDER,
  HISTORY_FUSE_OPTIONS,
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
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../constants/bridge';

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
  const isNativeToken = assetIdentifier?.startsWith('slip44:');
  const address = isNativeToken
    ? NATIVE_SWAPS_TOKEN_ADDRESS
    : (assetIdentifier?.split(':')[1] ?? '');
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
    assetId: asset.assetId,
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
  browserHistory: FuseSearchResult[];
  bookmarks: FuseSearchResult[];
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
  browserHistory,
  bookmarks,
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

  // Create Fuse instance for filtering Recents and Favorites
  const fuseInstance = useMemo(() => {
    const allLocalUrls: FuseSearchResult[] = [...browserHistory, ...bookmarks];
    return new Fuse(allLocalUrls, HISTORY_FUSE_OPTIONS);
  }, [browserHistory, bookmarks]);

  // Filter Recents and Favorites using Fuse.js
  const filteredLocalResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const fuseResults = fuseInstance.search(searchQuery) as FuseSearchResult[];
    return fuseResults;
  }, [fuseInstance, searchQuery]);

  // Transform omni-search results to AutocompleteSearchResult format
  const searchResults: ResultsWithCategory[] = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const results: ResultsWithCategory[] = [];

    // Always add filtered Recents (local data, not API-dependent)
    const filteredRecents = filteredLocalResults
      .filter((r) => r?.category === UrlAutocompleteCategory.Recents)
      .slice(0, MAX_RECENTS);
    if (filteredRecents.length > 0) {
      results.push({
        category: UrlAutocompleteCategory.Recents,
        data: filteredRecents,
      });
    }

    // Always add filtered Favorites (local data, not API-dependent)
    const filteredFavorites = filteredLocalResults.filter(
      (r) => r?.category === UrlAutocompleteCategory.Favorites,
    );
    if (filteredFavorites.length > 0) {
      results.push({
        category: UrlAutocompleteCategory.Favorites,
        data: filteredFavorites,
      });
    }

    // Skip API-dependent sections if basic functionality is disabled
    if (!isBasicFunctionalityEnabled) {
      return results;
    }

    // Process API-dependent sections in order
    sectionsOrder.forEach((sectionId) => {
      const sectionData = omniSearchData[sectionId] ?? [];
      const sectionIsLoading = omniSearchLoading[sectionId] ?? false;
      const category = sectionIdToCategory(sectionId);

      if (sectionId === 'sites') {
        // Add Sites section (API-dependent)
        if (sectionData.length > 0 || sectionIsLoading) {
          const transformedSites = (
            sectionData as { name: string; url: string }[]
          )
            .filter((site) => site?.name && site?.url)
            .map(
              (site): FuseSearchResult => ({
                category: UrlAutocompleteCategory.Sites,
                name: site.name,
                url: site.url,
              }),
            );

          results.push({
            category,
            data: transformedSites,
            isLoading: sectionIsLoading,
          });
        }
      } else {
        // Skip if empty and not loading
        if (sectionData.length === 0 && !sectionIsLoading) return;

        // Transform data based on section type
        let transformedData: AutocompleteSearchResult[] = [];

        switch (sectionId) {
          case 'tokens':
            transformedData = (sectionData as TrendingAsset[])
              .filter((asset) => asset?.assetId)
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

        results.push({
          category,
          data: transformedData,
          isLoading: sectionIsLoading,
        });
      }
    });

    return results;
  }, [
    searchQuery,
    omniSearchData,
    omniSearchLoading,
    sectionsOrder,
    isBasicFunctionalityEnabled,
    filteredLocalResults,
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
      } catch {
        // Silent catch - swap navigation failed
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
        if (!item?.category) return null;
        return (
          <Result
            result={item}
            onPress={() => {
              // Only hide for URL-based results (user navigates away from browser)
              // Keep open for Tokens/Perps/Predictions so user can explore multiple items
              const isUrlBasedResult =
                item.category === UrlAutocompleteCategory.Sites ||
                item.category === UrlAutocompleteCategory.Recents ||
                item.category === UrlAutocompleteCategory.Favorites;
              if (isUrlBasedResult) {
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
      if (!item?.category) return `unknown-${index}`;
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

  // Empty state: show Recents and Favorites from browser history/bookmarks
  const emptyStateResults: ResultsWithCategory[] = useMemo(() => {
    if (searchQuery.trim()) return [];

    return EMPTY_STATE_CATEGORIES.flatMap((category) => {
      const sourceData =
        category === UrlAutocompleteCategory.Recents
          ? browserHistory
          : bookmarks;

      let data = sourceData.filter(
        (result, index, self) =>
          result.category === category &&
          index ===
            self.findIndex(
              (r) => r.url === result.url && r.category === result.category,
            ),
      );

      if (data.length === 0) return [];

      if (category === UrlAutocompleteCategory.Recents) {
        data = data.slice(0, MAX_RECENTS);
      }

      return { category, data };
    });
  }, [searchQuery, browserHistory, bookmarks]);

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
      } catch {
        // Silent catch - swap navigation failed
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
                browserHistory={browserHistory}
                bookmarks={bookmarks}
                onSelect={onSelect}
                hide={hide}
                styles={styles}
              />
            </PerpsStreamProvider>
          </PerpsConnectionProvider>
        ) : (
          // Empty state: show Recents and Favorites
          <>
            <SectionList<AutocompleteSearchResult, ResultsWithCategory>
              contentContainerStyle={styles.contentContainer}
              sections={emptyStateResults}
              keyExtractor={keyExtractor}
              renderSectionHeader={renderSectionHeader}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
            />
            {networkModal}
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
});

export default UrlAutocomplete;
