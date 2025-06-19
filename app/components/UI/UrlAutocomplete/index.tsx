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
  Platform
} from 'react-native';
import dappUrlList from '../../../util/dapp-url-list';
import Fuse from 'fuse.js';
import { useSelector } from 'react-redux';
import styleSheet from './styles';
import searchDiscoveryStylesheet from '../SearchDiscoveryResult/styles';
import { useStyles } from '../../../component-library/hooks';
import {
  UrlAutocompleteComponentProps,
  UrlAutocompleteRef
} from './types';
import {
  FuseSearchResult,
  TokenSearchDiscoveryResult,
  SearchDiscoveryResultItem,
  SearchDiscoveryCategory,
} from '../SearchDiscoveryResult/types';
import { debounce } from 'lodash';
import { strings } from '../../../../locales/i18n';
import { selectBrowserBookmarksWithType, selectBrowserHistoryWithType } from '../../../selectors/browser';
import { MAX_RECENTS, ORDERED_CATEGORIES } from './UrlAutocomplete.constants';
import useTokenSearch from '../../hooks/TokenSearchDiscovery/useTokenSearch/useTokenSearch';
import Engine from '../../../core/Engine';
import { selectCurrentCurrency, selectUsdConversionRate } from '../../../selectors/currencyRateController';
import { mapMoralisTokenToResult } from '../../../util/search-discovery/map-moralis-token-to-result';
import { SearchDiscoveryResult } from '../SearchDiscoveryResult';
import { isAddress } from 'viem';
import { createSearchUrl, processUrlForBrowser, testUrl } from '../../../util/browser';
import { selectSearchEngine } from '../../../reducers/browser/selectors';
import { hasProtocol } from '../../../util/regex';
import { IconName } from '../../../component-library/components/Icons/Icon';

export * from './types';

const dappsWithType: FuseSearchResult[] = dappUrlList.map(i => ({...i, category: SearchDiscoveryCategory.Sites} as const));

const TOKEN_SEARCH_LIMIT = 10;

interface ResultsWithCategory {
  category: SearchDiscoveryCategory;
  data: SearchDiscoveryResultItem[];
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
  const initialFuseResults = useMemo(() => [
    ...browserHistory,
    ...bookmarks,
  ], [browserHistory, bookmarks]);
  const [fuseResults, setFuseResults] = useState<FuseSearchResult[]>(initialFuseResults);
  const {searchTokens, results: tokenSearchResults, reset: resetTokenSearch, isLoading: isTokenSearchLoading} = useTokenSearch();
  const usdConversionRate = useSelector(selectUsdConversionRate);
  const tokenResults: TokenSearchDiscoveryResult[] = useMemo(
    () => (
      tokenSearchResults
      .map(token => mapMoralisTokenToResult(token, usdConversionRate))
      .slice(0, TOKEN_SEARCH_LIMIT)
    ),
    [tokenSearchResults, usdConversionRate]
  );

  const hasResults = fuseResults.length > 0 || tokenResults.length > 0;

  const currentCurrency = useSelector(selectCurrentCurrency);

  useEffect(() => {
    if (currentCurrency) {
      Engine.context.CurrencyRateController.updateExchangeRate([currentCurrency]);
    }
  }, [currentCurrency]);

  const resultsByCategory: ResultsWithCategory[] = useMemo(() => (
    ORDERED_CATEGORIES.flatMap((category) => {
      if (category === SearchDiscoveryCategory.Tokens) {
        if (tokenResults.length === 0 && !isTokenSearchLoading) {
          return [];
        }
        return {
          category,
          data: tokenResults,
        };
      }

      let data = fuseResults.filter((result, index, self) =>
        result.category === category &&
        index === self.findIndex(r => r.url === result.url && r.category === result.category)
      );
      if (data.length === 0) {
        return [];
      }
      if (category === SearchDiscoveryCategory.Recents) {
        data = data.slice(0, MAX_RECENTS);
      }
      return {
        category,
        data,
      };
    })
  ), [fuseResults, tokenResults, isTokenSearchLoading]);

  const fuseRef = useRef<Fuse<FuseSearchResult> | null>(null);
  const resultsRef = useRef<View | null>(null);
  const { styles } = useStyles(styleSheet, {});
  const { styles: searchDiscoveryStyles } = useStyles(searchDiscoveryStylesheet, {});

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
  const search = useCallback((text: string) => {
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

  }, [searchTokens, reset]);

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

  const renderSectionHeader = useCallback(({section: { category }}: {section: ResultsWithCategory}) => (
    <View style={searchDiscoveryStyles.categoryWrapper}>
      <Text style={searchDiscoveryStyles.categoryTitle}>{strings(`autocomplete.${category}`)}</Text>
      {category === SearchDiscoveryCategory.Tokens && isTokenSearchLoading && (
        <ActivityIndicator testID="loading-indicator" size="small" style={searchDiscoveryStyles.categoryLoadingIcon} />
      )}
    </View>
  ), [searchDiscoveryStyles, isTokenSearchLoading]);

  const onItemSelect = useCallback((item: SearchDiscoveryResultItem) => {
    if (item.category !== SearchDiscoveryCategory.Tokens) {
      hide();
    }
    onSelect(item);
  }, [hide, onSelect]);

  const renderItem: SectionListRenderItem<SearchDiscoveryResultItem> = useCallback(({item}) => (
    <SearchDiscoveryResult
      result={item}
      onSelect={onItemSelect}
    />
  ), [onItemSelect]);

  const searchEngine = useSelector(selectSearchEngine);

  const renderNoResults = useCallback(() => {
    if (!latestSearchTerm.current) {
      return null;
    }
    if (isAddress(latestSearchTerm.current)) {
      return (
        <Text style={searchDiscoveryStyles.noResultsText}>{strings('autocomplete.tokenNotFound')}</Text>
      );
    }

      return (
        <>
          {testUrl(latestSearchTerm.current) && (
            <SearchDiscoveryResult
              result={{
                category: SearchDiscoveryCategory.Sites,
                name: strings('autocomplete.goToUrl'),
                url: processUrlForBrowser(latestSearchTerm.current, searchEngine),
              }}
              onSelect={onItemSelect}
              iconName={IconName.Global}
            />
          )}
          {!hasProtocol(latestSearchTerm.current) && (
            <SearchDiscoveryResult
              result={{
                category: SearchDiscoveryCategory.Sites,
                name: strings('autocomplete.search', { search_term: latestSearchTerm.current }),
                url: createSearchUrl(latestSearchTerm.current, searchEngine),
              }}
              onSelect={onItemSelect}
              iconName={IconName.Search}
            />
          )}
        </>
      );
  }, [searchEngine, onItemSelect]);

  if (!hasResults && !isTokenSearchLoading) {
    return (
      <View ref={resultsRef} style={styles.wrapper}>
        <TouchableWithoutFeedback style={styles.bg} onPress={dismissAutocomplete}>
          <View style={styles.bg}>
            {renderNoResults()}
          </View>
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
        <SectionList<SearchDiscoveryResultItem, ResultsWithCategory>
          contentContainerStyle={styles.contentContainer}
          sections={resultsByCategory}
          keyExtractor={(item) =>
            item.category === SearchDiscoveryCategory.Tokens
              ? `${item.category}-${item.chainId}-${item.address}`
              : `${item.category}-${item.url}`
          }
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
    </View>
  );
});

export default UrlAutocomplete;
