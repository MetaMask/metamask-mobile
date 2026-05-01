import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { CaipChainId } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import TokenNetworkFilterBar from '../../components/TokenNetworkFilterBar';
import TokenListItem from '../../components/TokenListItem';
import { createUnsupportedTokenModalNavigationDetails } from '../Modals/UnsupportedTokenModal/UnsupportedTokenModal';

import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';

import useSearchTokenResults from '../../Deposit/hooks/useSearchTokenResults';
import { useDepositCryptoCurrencyNetworkName } from '../../Deposit/hooks/useDepositCryptoCurrencyNetworkName';
import { useRampsController } from '../../hooks/useRampsController';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  getRampRoutingDecision,
  getDetectedGeolocation,
} from '../../../../../reducers/fiatOrders';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { selectTokenSelectors } from '../../Aggregator/components/TokenSelectModal/SelectToken.testIds';
import { TokenSelectionSelectors } from './TokenSelection.testIds';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

type TokenSelectionRampsToken = DepositCryptoCurrency & {
  tokenSupported?: boolean;
};

export const createTokenSelectionNavDetails = createNavigationDetails(
  Routes.RAMP.TOKEN_SELECTION,
);

function TokenSelection() {
  const listRef = useRef<FlatList>(null);
  const [searchString, setSearchString] = useState('');
  const [networkFilter, setNetworkFilter] = useState<CaipChainId[] | null>(
    null,
  );
  const theme = useTheme();
  const navigation = useNavigation();

  const {
    tokens: controllerTokens,
    tokensLoading: controllerTokensLoading,
    tokensError: controllerTokensError,
    setSelectedToken,
  } = useRampsController();

  const { trackEvent, createEventBuilder } = useAnalytics();
  const getNetworkName = useDepositCryptoCurrencyNetworkName();

  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const detectedGeolocation = useSelector(getDetectedGeolocation);
  const networksByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const { topTokens, allTokens, isLoading, error } = useMemo(() => {
    const filterTokens = <T extends { chainId?: string }>(
      tokens: T[] | undefined,
    ): T[] | null => {
      if (!tokens) return null;
      return tokens.filter((token) => {
        if (!token.chainId) return false;
        return (
          networksByCaipChainId[token.chainId as CaipChainId] !== undefined
        );
      });
    };

    // When tokens have never been loaded, controllerTokens is null and
    // controllerTokensLoading is false (default state). Treat that as loading
    // so we show spinner instead of "No tokens match" on first load before
    // controller.init() has completed (e.g. fresh install or update).
    const tokensNotYetLoaded =
      controllerTokens === null && !controllerTokensError;

    return {
      topTokens: filterTokens(controllerTokens?.topTokens) as
        | TokenSelectionRampsToken[]
        | null,
      allTokens: filterTokens(controllerTokens?.allTokens) as
        | TokenSelectionRampsToken[]
        | null,
      isLoading: controllerTokensLoading || tokensNotYetLoaded,
      error: controllerTokensError,
    };
  }, [
    controllerTokens,
    controllerTokensLoading,
    controllerTokensError,
    networksByCaipChainId,
  ]);

  // Use topTokens for initial display, allTokens when searching
  const supportedTokens = useMemo(() => {
    const tokensToUse = searchString.trim() ? allTokens : topTokens;
    return tokensToUse || [];
  }, [searchString, allTokens, topTokens]);

  const searchTokenResults = useSearchTokenResults({
    tokens: supportedTokens,
    networkFilter,
    searchString,
  });

  const debouncedSearchString = useDebouncedValue(searchString, 500);

  const rampType = 'UNIFIED_BUY_2';

  const hasTrackedScreenViewRef = useRef(false);
  useEffect(() => {
    if (hasTrackedScreenViewRef.current) return;
    if (rampRoutingDecision != null) {
      hasTrackedScreenViewRef.current = true;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_SCREEN_VIEWED)
          .addProperties({
            location: 'Token Selection',
            ramp_type: rampType,
            ramp_routing: rampRoutingDecision,
          })
          .build(),
      );
    }
  }, [rampRoutingDecision, rampType, createEventBuilder, trackEvent]);

  const prevSearchStringRef = useRef('');
  useEffect(() => {
    if (
      debouncedSearchString.trim().length > 0 &&
      debouncedSearchString !== prevSearchStringRef.current
    ) {
      prevSearchStringRef.current = debouncedSearchString;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_TOKEN_SEARCHED)
          .addProperties({
            search_query: debouncedSearchString,
            results_count: searchTokenResults?.length ?? 0,
            location: 'Token Selection',
            ramp_type: rampType,
          })
          .build(),
      );
    }
  }, [
    debouncedSearchString,
    searchTokenResults?.length,
    rampType,
    createEventBuilder,
    trackEvent,
  ]);

  const handleSelectAssetIdCallback = useCallback(
    (assetId: string) => {
      const selectedToken = supportedTokens.find(
        (token) => token.assetId === assetId,
      );
      if (selectedToken) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.RAMPS_TOKEN_SELECTED)
            .addProperties({
              ramp_type: 'UNIFIED_BUY_2',
              region: detectedGeolocation || '',
              chain_id: selectedToken.chainId,
              currency_destination: selectedToken.assetId,
              currency_destination_symbol: selectedToken.symbol,
              currency_destination_network: getNetworkName(
                selectedToken.chainId as string,
              ),
              currency_source: '',
              is_authenticated: false,
              token_caip19: selectedToken.assetId,
              token_symbol: selectedToken.symbol,
              ramp_routing: rampRoutingDecision ?? undefined,
            })
            .build(),
        );
      }
      setSelectedToken(assetId);
      navigation.navigate(Routes.RAMP.AMOUNT_INPUT, { assetId });
    },
    [
      supportedTokens,
      trackEvent,
      createEventBuilder,
      getNetworkName,
      detectedGeolocation,
      rampRoutingDecision,
      navigation,
      setSelectedToken,
    ],
  );

  const scrollToTop = useCallback(() => {
    if (listRef?.current) {
      listRef?.current.scrollToOffset({
        animated: false,
        offset: 0,
      });
    }
  }, []);

  const handleSearchTextChange = useCallback(
    (text: string) => {
      setSearchString(text);
      scrollToTop();
    },
    [scrollToTop],
  );

  const clearSearchText = useCallback(() => {
    handleSearchTextChange('');
  }, [handleSearchTextChange]);

  const handleNetworkFilterChange = useCallback(
    (newFilter: CaipChainId[] | null) => {
      setNetworkFilter(newFilter);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_NETWORK_FILTER_CLICKED)
          .addProperties({
            network_chain_id: newFilter?.[0] ?? undefined,
            location: 'Token Selection',
            ramp_type: rampType,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent, rampType],
  );

  const handleUnsupportedInfoPress = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.RAMPS_UNSUPPORTED_TOKEN_TOOLTIP_CLICKED,
      )
        .addProperties({
          location: 'Token Selection',
          ramp_type: rampType,
        })
        .build(),
    );
    navigation.navigate(...createUnsupportedTokenModalNavigationDetails());
  }, [navigation, createEventBuilder, trackEvent, rampType]);

  const renderToken = useCallback(
    ({ item: token }: { item: TokenSelectionRampsToken }) => (
      <TokenListItem
        token={token}
        onPress={() => handleSelectAssetIdCallback(token.assetId)}
        isDisabled={!token.tokenSupported}
        onInfoPress={handleUnsupportedInfoPress}
      />
    ),
    [handleSelectAssetIdCallback, handleUnsupportedInfoPress],
  );

  const renderEmptyList = useCallback(
    () => (
      <ListItemSelect isSelected={false} isDisabled>
        <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
          {strings('deposit.token_modal.no_tokens_found', {
            searchString,
          })}
        </Text>
      </ListItemSelect>
    ),
    [searchString],
  );

  const uniqueNetworks = useMemo(() => {
    const uniqueNetworksSet = new Set<CaipChainId>();
    for (const token of supportedTokens) {
      if (token.chainId) {
        uniqueNetworksSet.add(
          token.chainId as `${string}:${string}` as CaipChainId,
        );
      }
    }
    return Array.from(uniqueNetworksSet);
  }, [supportedTokens]);

  const handleHeaderBack = useCallback(() => {
    navigation.goBack();
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BACK_BUTTON_CLICKED)
        .addProperties({
          location: 'Token Selection',
          ramp_type: rampType,
        })
        .build(),
    );
  }, [navigation, trackEvent, createEventBuilder, rampType]);

  if (isLoading) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <HeaderCompactStandard
            title={strings('deposit.token_modal.select_token')}
            onBack={handleHeaderBack}
            backButtonProps={{ testID: 'deposit-back-navbar-button' }}
            includesTopInset
          />
          <Box twClassName="flex-1 items-center justify-center">
            <ActivityIndicator
              size="large"
              color={theme.colors.primary.default}
              testID={TokenSelectionSelectors.LOADING_INDICATOR}
            />
          </Box>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <HeaderCompactStandard
            title={strings('deposit.token_modal.select_token')}
            onBack={handleHeaderBack}
            backButtonProps={{ testID: 'deposit-back-navbar-button' }}
            includesTopInset
          />
          <Box twClassName="flex-1 items-center justify-center px-4">
            <Box twClassName="text-center">
              <Text variant={TextVariant.BodyMd}>
                {strings('deposit.token_modal.error_loading_tokens')}
              </Text>
              <Text variant={TextVariant.BodyMd}>
                {parseUserFacingError(
                  error,
                  strings('deposit.token_modal.error_loading_tokens'),
                )}
              </Text>
            </Box>
          </Box>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <HeaderCompactStandard
          title={strings('deposit.token_modal.select_token')}
          onBack={handleHeaderBack}
          backButtonProps={{ testID: 'deposit-back-navbar-button' }}
          includesTopInset
        />
        <Box twClassName="px-4 pb-3">
          <TextFieldSearch
            testID={selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT}
            value={searchString}
            onPressClearButton={clearSearchText}
            onFocus={scrollToTop}
            onChangeText={handleSearchTextChange}
            placeholder={strings(
              'deposit.token_modal.search_by_name_or_address',
            )}
          />
        </Box>
        <Box twClassName="pt-2 pb-4 pl-4">
          <TokenNetworkFilterBar
            networks={uniqueNetworks}
            networkFilter={networkFilter}
            setNetworkFilter={handleNetworkFilterChange}
          />
        </Box>
        <FlatList
          ref={listRef}
          data={searchTokenResults}
          renderItem={renderToken}
          keyExtractor={(item) => item.assetId}
          ListEmptyComponent={renderEmptyList}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
        />
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default TokenSelection;
