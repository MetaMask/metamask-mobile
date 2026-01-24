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
import TokenNetworkFilterBar from '../TokenNetworkFilterBar';
import TokenListItem from '../TokenListItem';
import { createUnsupportedTokenModalNavigationDetails } from '../UnsupportedTokenModal/UnsupportedTokenModal';

import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';

import useSearchTokenResults from '../../Deposit/hooks/useSearchTokenResults';
import { useRampTokens, RampsToken } from '../../hooks/useRampTokens';
import { useDepositCryptoCurrencyNetworkName } from '../../Deposit/hooks/useDepositCryptoCurrencyNetworkName';
import useRampsUnifiedV2Enabled from '../../hooks/useRampsUnifiedV2Enabled';
import { useRampsController } from '../../hooks/useRampsController';
import Engine from '../../../../../core/Engine';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { getDepositNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { useRampNavigation } from '../../hooks/useRampNavigation';
import useAnalytics from '../../hooks/useAnalytics';
import {
  getRampRoutingDecision,
  getDetectedGeolocation,
} from '../../../../../reducers/fiatOrders';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';

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
  const isV2UnifiedEnabled = useRampsUnifiedV2Enabled();

  const {
    tokens: controllerTokens,
    tokensLoading: controllerTokensLoading,
    tokensError: controllerTokensError,
  } = useRampsController();
  const legacyTokens = useRampTokens();

  const trackEvent = useAnalytics();
  const getNetworkName = useDepositCryptoCurrencyNetworkName();

  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const detectedGeolocation = useSelector(getDetectedGeolocation);
  const networksByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const { topTokens, allTokens, isLoading, error } = useMemo(() => {
    if (!isV2UnifiedEnabled) {
      return legacyTokens;
    }

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

    return {
      topTokens: filterTokens(controllerTokens?.topTokens) as
        | RampsToken[]
        | null,
      allTokens: filterTokens(controllerTokens?.allTokens) as
        | RampsToken[]
        | null,
      isLoading: controllerTokensLoading,
      error: controllerTokensError,
    };
  }, [
    isV2UnifiedEnabled,
    controllerTokens,
    legacyTokens,
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
    tokens: supportedTokens as RampsToken[],
    networkFilter,
    searchString,
  });

  const { goToBuy } = useRampNavigation();
  const isRampsUnifiedV2Enabled = useRampsUnifiedV2Enabled();

  const handleSelectAssetIdCallback = useCallback(
    (assetId: string) => {
      const selectedToken = supportedTokens.find(
        (token) => token.assetId === assetId,
      );
      if (selectedToken) {
        trackEvent('RAMPS_TOKEN_SELECTED', {
          ramp_type: 'UNIFIED BUY',
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
        });

        if (isRampsUnifiedV2Enabled) {
          console.log(
            '[TokenSelection] V2 enabled - calling RampsController.setSelectedToken:',
            {
              assetId: selectedToken.assetId,
              symbol: selectedToken.symbol,
            },
          );
          Engine.context.RampsController.setSelectedToken({
            assetId: selectedToken.assetId,
            symbol: selectedToken.symbol,
            name: selectedToken.name,
            decimals: selectedToken.decimals,
            chainId: selectedToken.chainId as string,
            iconUrl: selectedToken.iconUrl,
          }).catch((error: Error) => {
            console.log(
              '[TokenSelection] Error calling RampsController.setSelectedToken:',
              error,
            );
          });
        }
      }
      // V1 flow: close the modal before navigating to Deposit/Aggregator
      // V2 flow: navigate within the same stack, no need to close modal
      if (!isRampsUnifiedV2Enabled) {
        navigation.dangerouslyGetParent()?.goBack();
      }
      goToBuy({ assetId });
    },
    [
      supportedTokens,
      trackEvent,
      getNetworkName,
      detectedGeolocation,
      rampRoutingDecision,
      isRampsUnifiedV2Enabled,
      navigation,
      goToBuy,
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

  const handleUnsupportedInfoPress = useCallback(() => {
    navigation.navigate(...createUnsupportedTokenModalNavigationDetails());
  }, [navigation]);

  const renderToken = useCallback(
    ({ item: token }: { item: RampsToken }) => (
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
        <Text variant={TextVariant.BodyLGMedium}>
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

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        {
          title: strings('deposit.token_modal.select_token'),
          showBack: false,
        },
        theme,
      ),
    );
  }, [navigation, theme]);

  if (isLoading) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <Box twClassName="flex-1 items-center justify-center">
            <ActivityIndicator
              size="large"
              color={theme.colors.primary.default}
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
          <Box twClassName="flex-1 items-center justify-center px-4">
            <Box twClassName="text-center">
              <Text variant={TextVariant.BodyMD}>
                {strings('deposit.token_modal.error_loading_tokens')}
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
        <Box twClassName="py-2">
          <TokenNetworkFilterBar
            networks={uniqueNetworks}
            networkFilter={networkFilter}
            setNetworkFilter={setNetworkFilter}
          />
        </Box>
        <Box twClassName="px-4 py-3">
          <TextFieldSearch
            value={searchString}
            showClearButton={searchString.length > 0}
            onPressClearButton={clearSearchText}
            onFocus={scrollToTop}
            onChangeText={handleSearchTextChange}
            placeholder={strings(
              'deposit.token_modal.search_by_name_or_address',
            )}
          />
        </Box>
        <FlatList
          ref={listRef}
          data={searchTokenResults as unknown as RampsToken[]}
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
