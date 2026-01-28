import React, {
  forwardRef,
  useCallback,
  useEffect,
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
import dappUrlList from '../../../util/dapp-url-list';
import Fuse from 'fuse.js';
import { useSelector } from 'react-redux';
import styleSheet from './styles';
import { useStyles } from '../../../component-library/hooks';
import {
  UrlAutocompleteComponentProps,
  FuseSearchResult,
  TokenSearchResult,
  AutocompleteSearchResult,
  UrlAutocompleteRef,
  UrlAutocompleteCategory,
} from './types';
import { debounce } from 'lodash';
import { strings } from '../../../../locales/i18n';
import {
  selectBrowserBookmarksWithType,
  selectBrowserHistoryWithType,
} from '../../../selectors/browser';
import { MAX_RECENTS, ORDERED_CATEGORIES } from './UrlAutocomplete.constants';
import { Result } from './Result';
import useTokenSearchDiscovery from '../../hooks/TokenSearchDiscovery/useTokenSearch/useTokenSearch';
import { Hex } from '@metamask/utils';
import Engine from '../../../core/Engine';
import {
  selectCurrentCurrency,
  selectUsdConversionRate,
} from '../../../selectors/currencyRateController';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../Bridge/hooks/useSwapBridgeNavigation';
import { BridgeToken } from '../Bridge/types';

export * from './types';

const dappsWithType: FuseSearchResult[] = dappUrlList.map(
  (i) => ({ ...i, category: UrlAutocompleteCategory.Sites }) as const,
);

const TOKEN_SEARCH_LIMIT = 10;

interface ResultsWithCategory {
  category: UrlAutocompleteCategory;
  data: AutocompleteSearchResult[];
}

/**
 * Autocomplete list that appears when the browser url bar is focused
 */
const UrlAutocomplete = forwardRef<
  UrlAutocompleteRef,
  UrlAutocompleteComponentProps
>(({ onSelect, onDismiss }, ref) => {
  const browserHistory = useSelector(selectBrowserHistoryWithType);
  const bookmarks = useSelector(selectBrowserBookmarksWithType);
  const initialFuseResults = useMemo(
    () => [...browserHistory, ...bookmarks],
    [browserHistory, bookmarks],
  );
  const [fuseResults, setFuseResults] =
    useState<FuseSearchResult[]>(initialFuseResults);
  const {
    searchTokens,
    results: tokenSearchResults,
    reset: resetTokenSearch,
    isLoading: isTokenSearchLoading,
  } = useTokenSearchDiscovery();
  const usdConversionRate = useSelector(selectUsdConversionRate);
  const tokenResults: TokenSearchResult[] = useMemo(
    () =>
      tokenSearchResults
        .map(
          ({
            tokenAddress,
            usdPricePercentChange,
            usdPrice,
            chainId,
            ...rest
          }) => ({
            ...rest,
            category: UrlAutocompleteCategory.Tokens as const,
            address: tokenAddress,
            chainId: chainId as Hex,
            price: usdConversionRate ? usdPrice / usdConversionRate : -1,
            percentChange: usdPricePercentChange.oneDay,
            decimals: 18,
            isFromSearch: true as const,
          }),
        )
        .slice(0, TOKEN_SEARCH_LIMIT),
    [tokenSearchResults, usdConversionRate],
  );

  const hasResults = fuseResults.length > 0 || tokenResults.length > 0;

  const currentCurrency = useSelector(selectCurrentCurrency);

  useEffect(() => {
    if (currentCurrency) {
      Engine.context.CurrencyRateController.updateExchangeRate([
        currentCurrency,
      ]);
    }
  }, [currentCurrency]);

  const resultsByCategory: ResultsWithCategory[] = useMemo(
    () =>
      ORDERED_CATEGORIES.flatMap((category) => {
        if (category === UrlAutocompleteCategory.Tokens) {
          if (tokenResults.length === 0 && !isTokenSearchLoading) {
            return [];
          }
          return {
            category,
            data: tokenResults,
          };
        }

        let data = fuseResults.filter(
          (result, index, self) =>
            result.category === category &&
            index ===
              self.findIndex(
                (r) => r.url === result.url && r.category === result.category,
              ),
        );
        if (data.length === 0) {
          return [];
        }
        if (category === UrlAutocompleteCategory.Recents) {
          data = data.slice(0, MAX_RECENTS);
        }
        return {
          category,
          data,
        };
      }),
    [fuseResults, tokenResults, isTokenSearchLoading],
  );

  const fuseRef = useRef<Fuse<FuseSearchResult> | null>(null);
  const resultsRef = useRef<View | null>(null);
  const { styles } = useStyles(styleSheet, {});

  /**
   * Show the results view
   */
  const show = () => {
    resultsRef.current?.setNativeProps({ style: { display: 'flex' } });
  };

  /**
   * Reset the autocomplete results
   */
  const reset = useCallback(() => {
    setFuseResults(initialFuseResults);
    resetTokenSearch();
  }, [initialFuseResults, resetTokenSearch]);

  const latestSearchTerm = useRef<string | null>(null);
  const search = useCallback(
    (text: string) => {
      latestSearchTerm.current = text;
      if (!text) {
        reset();
        return;
      }
      const fuseSearchResult = fuseRef.current?.search(text);
      if (Array.isArray(fuseSearchResult)) {
        setFuseResults(fuseSearchResult);
      } else {
        setFuseResults([]);
      }

      searchTokens(text);
    },
    [searchTokens, reset],
  );

  /**
   * Debounce the search function
   */
  const debouncedSearch = useMemo(() => debounce(search, 100), [search]);

  /**
   * Hide the results view
   */
  const hide = useCallback(() => {
    // Cancel the search
    debouncedSearch.cancel();
    reset();
    resultsRef.current?.setNativeProps({ style: { display: 'none' } });
  }, [debouncedSearch, reset]);

  const dismissAutocomplete = () => {
    hide();
    // Call the onDismiss callback
    onDismiss();
  };

  useImperativeHandle(ref, () => ({
    search: debouncedSearch,
    hide,
    show,
  }));

  useEffect(() => {
    const allUrls: FuseSearchResult[] = [
      ...dappsWithType,
      ...browserHistory,
      ...bookmarks,
    ];

    // Create the fuse search
    fuseRef.current = new Fuse(allUrls, {
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
    });

    if (latestSearchTerm.current !== null) {
      search(latestSearchTerm.current);
    }
  }, [browserHistory, bookmarks, search]);

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
    ({ section: { category } }: { section: ResultsWithCategory }) => (
      <View style={styles.categoryWrapper}>
        <Text style={styles.category}>
          {strings(`autocomplete.${category}`)}
        </Text>
        {category === UrlAutocompleteCategory.Tokens &&
          isTokenSearchLoading && (
            <ActivityIndicator testID="loading-indicator" size="small" />
          )}
      </View>
    ),
    [styles, isTokenSearchLoading],
  );

  const renderItem: SectionListRenderItem<AutocompleteSearchResult> =
    useCallback(
      ({ item }) => (
        <Result
          result={item}
          onPress={() => {
            if (item.category !== UrlAutocompleteCategory.Tokens) {
              hide();
            }
            onSelect(item);
          }}
          onSwapPress={goToSwaps}
        />
      ),
      [hide, onSelect, goToSwaps],
    );

  if (!hasResults && !isTokenSearchLoading) {
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
        <SectionList<AutocompleteSearchResult, ResultsWithCategory>
          contentContainerStyle={styles.contentContainer}
          sections={resultsByCategory}
          keyExtractor={(item) =>
            item.category === UrlAutocompleteCategory.Tokens
              ? `${item.category}-${item.chainId}-${item.address}`
              : `${item.category}-${item.url}`
          }
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
      {networkModal}
    </View>
  );
});

export default UrlAutocomplete;
