import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';

import NetworksFilterBar from '../../../components/NetworksFilterBar';
import NetworksFilterSelector from '../../../components/NetworksFilterSelector/NetworksFilterSelector';

import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ListItemSelect from '../../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../../component-library/components/List/ListItemColumn';
import AvatarToken from '../../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar';
import BadgeNetwork from '../../../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import TextFieldSearch from '../../../../../../../component-library/components/Form/TextFieldSearch';

import styleSheet from './TokenSelectorModal.styles';
import { useStyles } from '../../../../../../hooks/useStyles';
import { useCryptoCurrencies } from '../../../hooks/useCryptoCurrencies';
import useSearchTokenResults from '../../../hooks/useSearchTokenResults';
import { useDepositSDK } from '../../../sdk';

import { selectNetworkConfigurationsByCaipChainId } from '../../../../../../../selectors/networkController';
import { createNavigationDetails } from '../../../../../../../util/navigation/navUtils';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import { DepositCryptoCurrency } from '../../../constants';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';
import { DEPOSIT_NETWORKS_BY_CHAIN_ID } from '../../../constants/networks';
import { useTheme } from '../../../../../../../util/theme';
import useAnalytics from '../../../../hooks/useAnalytics';

export const createTokenSelectorModalNavigationDetails =
  createNavigationDetails(
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

  const {
    setCryptoCurrency,
    selectedRegion,
    fiatCurrency,
    isAuthenticated,
    cryptoCurrency,
  } = useDepositSDK();

  const { cryptoCurrencies: supportedTokens } = useCryptoCurrencies();
  const searchTokenResults = useSearchTokenResults({
    tokens: supportedTokens,
    networkFilter,
    searchString,
  });

  const allNetworkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

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
          currency_source: fiatCurrency.id,
          is_authenticated: isAuthenticated,
        });
        setCryptoCurrency(selectedToken);
      }
      sheetRef.current?.onCloseBottomSheet();
    },
    [
      supportedTokens,
      trackEvent,
      selectedRegion?.isoCode,
      fiatCurrency.id,
      isAuthenticated,
      setCryptoCurrency,
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
    ({ item: token }: { item: DepositCryptoCurrency }) => {
      const networkName = allNetworkConfigurations[token.chainId]?.name;
      const networkImageSource = getNetworkImageSource({
        chainId: token.chainId,
      });
      const depositNetworkName =
        DEPOSIT_NETWORKS_BY_CHAIN_ID[token.chainId]?.name;
      return (
        <ListItemSelect
          isSelected={cryptoCurrency.assetId === token.assetId}
          onPress={() => handleSelectAssetIdCallback(token.assetId)}
          accessibilityRole="button"
          accessible
        >
          <ListItemColumn widthType={WidthType.Auto}>
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <BadgeNetwork
                  name={networkName}
                  imageSource={networkImageSource}
                />
              }
            >
              <AvatarToken
                name={token.name}
                imageSource={{ uri: token.iconUrl }}
                size={AvatarSize.Md}
              />
            </BadgeWrapper>
          </ListItemColumn>
          <ListItemColumn widthType={WidthType.Fill}>
            <Text variant={TextVariant.BodyLGMedium}>{token.symbol}</Text>
            <Text variant={TextVariant.BodyMD} color={colors.text.alternative}>
              {depositNetworkName ?? networkName}
            </Text>
          </ListItemColumn>
        </ListItemSelect>
      );
    },
    [
      allNetworkConfigurations,
      colors.text.alternative,
      handleSelectAssetIdCallback,
      cryptoCurrency.assetId,
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
            extraData={cryptoCurrency.assetId}
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
