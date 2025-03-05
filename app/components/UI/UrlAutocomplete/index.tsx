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
} from './types';
import { debounce } from 'lodash';
import { strings } from '../../../../locales/i18n';
import { selectBrowserBookmarksWithType, selectBrowserHistoryWithType } from '../../../selectors/browser';
import { MAX_RECENTS, ORDERED_CATEGORIES } from './UrlAutocomplete.constants';
import { Result } from './Result';
import useTokenSearchDiscovery from '../../hooks/useTokenSearchDiscovery/useTokenSearchDiscovery';
import { Hex } from '@metamask/utils';
import Engine from '../../../core/Engine';
import { selectEvmChainId } from '../../../selectors/networkController';
import { useAddNetwork } from '../../hooks/useAddNetwork';
import { PopularList } from '../../../util/networks/customNetworks';
import { swapsUtils } from '@metamask/swaps-controller';
import { useNavigation } from '@react-navigation/native';
import { selectCurrentCurrency, selectUsdConversionRate } from '../../../selectors/currencyRateController';

export * from './types';

const dappsWithType = dappUrlList.map(i => ({...i, type: 'sites'} as const));

const TOKEN_SEARCH_LIMIT = 10;

/**
 * Autocomplete list that appears when the browser url bar is focused
 */
const UrlAutocomplete = forwardRef<
  UrlAutocompleteRef,
  UrlAutocompleteComponentProps
>(({ onSelect, onDismiss }, ref) => {
  const [fuseResults, setFuseResults] = useState<FuseSearchResult[]>([]);
  const {searchTokens, results: tokenSearchResults, reset: resetTokenSearch, isLoading: isTokenSearchLoading} = useTokenSearchDiscovery();
  const usdConversionRate = useSelector(selectUsdConversionRate);
  const tokenResults: TokenSearchResult[] = useMemo(() => tokenSearchResults.map(({tokenAddress, usdPricePercentChange, usdPrice, chainId, ...rest}) => ({
    ...rest,
    type: 'tokens',
    address: tokenAddress,
    chainId: chainId as Hex,
    price: usdConversionRate ? usdPrice / usdConversionRate : -1,
    percentChange: usdPricePercentChange.oneDay,
  })), [tokenSearchResults, usdConversionRate]);

  const hasResults = fuseResults.length > 0 || tokenResults.length > 0;

  const currentCurrency = useSelector(selectCurrentCurrency);

  useEffect(() => {
    if (currentCurrency) {
      Engine.context.CurrencyRateController.updateExchangeRate([currentCurrency]);
    }
  }, [currentCurrency]);

  const resultsByCategory: {category: string, data: AutocompleteSearchResult[]}[] = useMemo(() => (
    ORDERED_CATEGORIES.flatMap((category) => {
      if (category === 'tokens') {
        if (tokenResults.length === 0 && !isTokenSearchLoading) {
          return [];
        }
        return {
          category,
          data: tokenResults,
        };
      }

      let data = fuseResults.filter((result, index, self) =>
        result.type === category &&
        index === self.findIndex(r => r.url === result.url && r.type === result.type)
      );
      if (data.length === 0) {
        return [];
      }
      if (category === 'recents') {
        data = data.slice(0, MAX_RECENTS);
      }
      return {
        category,
        data,
      };
    })
  ), [fuseResults, tokenResults, isTokenSearchLoading]);

  const browserHistory = useSelector(selectBrowserHistoryWithType);
  const bookmarks = useSelector(selectBrowserBookmarksWithType);
  const fuseRef = useRef<Fuse<FuseSearchResult> | null>(null);
  const resultsRef = useRef<View | null>(null);
  const { styles } = useStyles(styleSheet, {});

  /**
   * Show the results view
   */
  const show = () => {
    resultsRef.current?.setNativeProps({ style: { display: 'flex' } });
  };

  const latestSearchTerm = useRef<string | null>(null);
  const search = useCallback((text: string) => {
    latestSearchTerm.current = text;
    if (!text) {
      setFuseResults([
        ...browserHistory,
        ...bookmarks,
      ]);
      resetTokenSearch();
      return;
    }
    const fuseSearchResult = fuseRef.current?.search(text);
    if (Array.isArray(fuseSearchResult)) {
      setFuseResults(fuseSearchResult);
    } else {
      setFuseResults([]);
    }

    searchTokens({
      query: text,
      limit: TOKEN_SEARCH_LIMIT.toString(),
    });

  }, [browserHistory, bookmarks, resetTokenSearch, searchTokens]);

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
    resultsRef.current?.setNativeProps({ style: { display: 'none' } });
    setFuseResults([]);
    resetTokenSearch();
  }, [debouncedSearch, resetTokenSearch]);

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

  useEffect(() => {
    const chainIds = tokenResults.reduce((acc, result) => {
      if (!acc.includes(result.chainId)) {
        acc.push(result.chainId);
      }
      return acc;
    }, [] as Hex[]);

    for (const chainId of chainIds) {
      Engine.context.TokenSearchDiscoveryDataController.fetchSwapsTokens(chainId);
    }

  }, [tokenResults]);

  const selectedChainId = useSelector(selectEvmChainId);

  const { addPopularNetwork, networkModal } = useAddNetwork();

  const navigation = useNavigation();

  const handleSwapNavigation = useCallback((result: TokenSearchResult) => {
    hide();
    onDismiss();
    navigation.navigate('Swaps', {
      screen: 'SwapsAmountView',
      params: {
      sourceToken: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
      destinationToken: result.address,
      sourcePage: 'MainView',
      chainId: result.chainId,
    }});
  }, [navigation, hide, onDismiss]);

  const goToSwaps = useCallback(async (result: TokenSearchResult) => {
    if (result.chainId !== selectedChainId) {
      const { NetworkController, MultichainNetworkController } =
        Engine.context;
      let networkConfiguration =
        NetworkController.getNetworkConfigurationByChainId(
          result.chainId as Hex,
        );

      if (!networkConfiguration) {
        const network = PopularList.find((popularNetwork) => popularNetwork.chainId === result.chainId);
        if (network) {
          try {
            await addPopularNetwork(network);
          } catch (error) {
            return;
          }
          networkConfiguration = NetworkController.getNetworkConfigurationByChainId(
            result.chainId,
          );
        }
      }

      const networkClientId =
        networkConfiguration?.rpcEndpoints?.[
          networkConfiguration.defaultRpcEndpointIndex
        ]?.networkClientId;

      await MultichainNetworkController.setActiveNetwork(
        networkClientId as string,
      );

      setTimeout(() => {
        handleSwapNavigation(result);
      }, 500);
    } else {
      handleSwapNavigation(result);
    }
  }, [
    selectedChainId,
    handleSwapNavigation,
    addPopularNetwork,
  ]);

  const renderSectionHeader = useCallback(({section: {category}}) => (
    <View style={styles.categoryWrapper}>
      <Text style={styles.category}>{strings(`autocomplete.${category}`)}</Text>
      {category === 'tokens' && isTokenSearchLoading && (
        <ActivityIndicator size="small" />
      )}
    </View>
  ), [styles, isTokenSearchLoading]);

  const renderItem: SectionListRenderItem<AutocompleteSearchResult> = useCallback(({item}) => (
    <Result
      result={item}
      onPress={() => {
        hide();
        onSelect(item);
      }}
      onSwapPress={goToSwaps}
    />
  ), [hide, onSelect, goToSwaps]);

  if (!hasResults) {
    return (
      <View ref={resultsRef} style={styles.wrapper}>
        <TouchableWithoutFeedback style={styles.bg} onPress={dismissAutocomplete}>
          <View style={styles.bg} />
        </TouchableWithoutFeedback>
      </View>
    );
  }

  return (
    <View ref={resultsRef} style={styles.wrapper}>
      <SectionList
        contentContainerStyle={styles.contentContainer}
        sections={resultsByCategory}
        keyExtractor={(item) => `${item.type}-${item.type === 'tokens' ? `${item.chainId}-${item.address}` : item.url}`}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
      />
      {networkModal}
    </View>
  );
});

export default UrlAutocomplete;
