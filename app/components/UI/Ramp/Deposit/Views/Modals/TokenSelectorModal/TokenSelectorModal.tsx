import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { CaipChainId } from '@metamask/utils';
import { useSelector } from 'react-redux';

import NetworksFilterBar from '../../../components/NetworksFilterBar';
import NetworksFilterSelector from '../../../components/NetworksFilterSelector/NetworksFilterSelector';
import TokenListItem from '../../../../components/TokenListItem';

import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ListItemSelect from '../../../../../../../component-library/components/List/ListItemSelect';
import TextFieldSearch from '../../../../../../../component-library/components/Form/TextFieldSearch';

import styleSheet from './TokenSelectorModal.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import useSearchTokenResults from '../../../hooks/useSearchTokenResults';
import { useDepositSDK } from '../../../sdk';

import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import { useDepositCryptoCurrencyNetworkName } from '../../../hooks/useDepositCryptoCurrencyNetworkName';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../../util/theme';
import useAnalytics from '../../../../hooks/useAnalytics';
import { getRampRoutingDecision } from '../../../../../../../reducers/fiatOrders';

interface TokenSelectorModalParams {
  cryptoCurrencies: DepositCryptoCurrency[];
}

export const createTokenSelectorModalNavigationDetails =
  createNavigationDetails<TokenSelectorModalParams>(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.TOKEN_SELECTOR,
  );

function TokenSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList>(null);
  const [searchString, setSearchString] = useState('');
  const [networkFilter, setNetworkFilter] = useState<CaipChainId[] | null>(
    null,
  );
  const [isEditingNetworkFilter, setIsEditingNetworkFilter] = useState(false);
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const { colors } = useTheme();
  const trackEvent = useAnalytics();
  const getNetworkName = useDepositCryptoCurrencyNetworkName();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);

  const {
    setSelectedCryptoCurrency,
    selectedRegion,
    isAuthenticated,
    selectedCryptoCurrency,
  } = useDepositSDK();

  const { cryptoCurrencies: supportedTokens } =
    useParams<TokenSelectorModalParams>();
  const searchTokenResults = useSearchTokenResults({
    tokens: supportedTokens,
    networkFilter,
    searchString,
  });

  const handleSelectAssetIdCallback = useCallback(
    (assetId: string) => {
      const selectedToken = supportedTokens.find(
        (token) => token.assetId === assetId,
      );
      if (selectedToken) {
        trackEvent('RAMPS_TOKEN_SELECTED', {
          ramp_type: 'DEPOSIT',
          region: selectedRegion?.isoCode || '',
          chain_id: selectedToken.chainId,
          currency_destination: selectedToken.assetId,
          currency_destination_symbol: selectedToken.symbol,
          currency_destination_network: getNetworkName(selectedToken.chainId),
          currency_source: selectedRegion?.currency || '',
          is_authenticated: isAuthenticated,
          token_caip19: selectedToken.assetId,
          token_symbol: selectedToken.symbol,
          ramp_routing: rampRoutingDecision ?? undefined,
        });
        setSelectedCryptoCurrency(selectedToken);
      }
      sheetRef.current?.onCloseBottomSheet();
    },
    [
      getNetworkName,
      supportedTokens,
      trackEvent,
      selectedRegion?.isoCode,
      selectedRegion?.currency,
      isAuthenticated,
      setSelectedCryptoCurrency,
      rampRoutingDecision,
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

  const renderToken = useCallback(
    ({ item: token }: { item: DepositCryptoCurrency }) => (
      <TokenListItem
        token={token}
        isSelected={selectedCryptoCurrency?.assetId === token.assetId}
        onPress={() => handleSelectAssetIdCallback(token.assetId)}
        textColor={colors.text.alternative}
      />
    ),
    [
      colors.text.alternative,
      handleSelectAssetIdCallback,
      selectedCryptoCurrency?.assetId,
    ],
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
      uniqueNetworksSet.add(token.chainId);
    }
    return Array.from(uniqueNetworksSet);
  }, [supportedTokens]);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingMD}>
          {isEditingNetworkFilter
            ? strings('deposit.networks_filter_selector.select_network')
            : strings('deposit.token_modal.select_token')}
        </Text>
      </BottomSheetHeader>
      {isEditingNetworkFilter ? (
        <NetworksFilterSelector
          networks={uniqueNetworks}
          networkFilter={networkFilter}
          setNetworkFilter={setNetworkFilter}
          setIsEditingNetworkFilter={setIsEditingNetworkFilter}
        />
      ) : (
        <>
          <NetworksFilterBar
            networks={uniqueNetworks}
            networkFilter={networkFilter}
            setNetworkFilter={setNetworkFilter}
            setIsEditingNetworkFilter={setIsEditingNetworkFilter}
          />
          <View style={styles.searchContainer}>
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
          </View>
          <FlatList
            style={styles.list}
            ref={listRef}
            data={searchTokenResults}
            renderItem={renderToken}
            extraData={selectedCryptoCurrency?.assetId}
            keyExtractor={(item) => item.assetId}
            ListEmptyComponent={renderEmptyList}
            keyboardDismissMode="none"
            keyboardShouldPersistTaps="always"
          ></FlatList>
        </>
      )}
    </BottomSheet>
  );
}
export default TokenSelectorModal;
