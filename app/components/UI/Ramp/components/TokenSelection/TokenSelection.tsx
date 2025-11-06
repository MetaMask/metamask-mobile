import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';

import TokenNetworkFilterBar from '../TokenNetworkFilterBar';

import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import BadgeNetwork from '../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';

import styleSheet from './TokenSelection.styles';
import { useStyles } from '../../../../hooks/useStyles';
import useSearchTokenResults from '../../Deposit/hooks/useSearchTokenResults';

import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { useParams } from '../../../../../util/navigation/navUtils';
import { getNetworkImageSource } from '../../../../../util/networks';
import { DepositCryptoCurrency } from '@consensys/native-ramps-sdk';
import { strings } from '../../../../../../locales/i18n';
import { DEPOSIT_NETWORKS_BY_CHAIN_ID } from '../../Deposit/constants/networks';
import { useTheme } from '../../../../../util/theme';
import { MOCK_CRYPTOCURRENCIES } from '../../Deposit/constants/mockCryptoCurrencies';
// TODO: Fetch these tokens from the API new enpoint for top 25 with supported status
//https://consensyssoftware.atlassian.net/browse/TRAM-2816

interface TokenSelectionParams {
  rampType: 'BUY' | 'DEPOSIT';
  selectedCryptoAssetId?: string;
}

function TokenSelection() {
  const listRef = useRef<FlatList>(null);
  const [searchString, setSearchString] = useState('');
  const [networkFilter, setNetworkFilter] = useState<CaipChainId[] | null>(
    null,
  );
  const { styles } = useStyles(styleSheet, {});

  const { colors } = useTheme();
  const theme = useTheme();
  const navigation = useNavigation();

  const { selectedCryptoAssetId } = useParams<TokenSelectionParams>();

  const supportedTokens = MOCK_CRYPTOCURRENCIES;

  const searchTokenResults = useSearchTokenResults({
    tokens: supportedTokens,
    networkFilter,
    searchString,
  });

  const allNetworkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const handleSelectAssetIdCallback = useCallback((_assetId: string) => {
    // TODO: Handle token by routing to the appropriate agg or deposit screen with asset id as param and pre-select it
    // https://consensyssoftware.atlassian.net/browse/TRAM-2795
  }, []);

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
          isSelected={selectedCryptoAssetId === token.assetId}
          onPress={() => handleSelectAssetIdCallback(token.assetId)}
          accessibilityRole="button"
          accessible
        >
          {/*TODO: disable token if not supported
          https://consensyssoftware.atlassian.net/browse/TRAM-2816 */}
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
      selectedCryptoAssetId,
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

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerLeft: () => null,
      headerTitle: () => (
        <Text variant={TextVariant.HeadingMD}>
          {strings('deposit.token_modal.select_token')}
        </Text>
      ),
      headerRight: () => (
        <ButtonIcon
          size={ButtonIconSize.Lg}
          iconName={IconName.Close}
          onPress={() => navigation.goBack()}
          twClassName="mr-1"
          testID="token-selection-close-button"
        />
      ),
      headerStyle: {
        backgroundColor: theme.colors.background.default,
        shadowColor: 'transparent',
        elevation: 0,
      },
    });
  }, [navigation, theme.colors.background.default]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <View style={styles.filterBarContainer}>
        <TokenNetworkFilterBar
          networks={uniqueNetworks}
          networkFilter={networkFilter}
          setNetworkFilter={setNetworkFilter}
        />
      </View>
      <View style={styles.searchContainer}>
        <TextFieldSearch
          value={searchString}
          showClearButton={searchString.length > 0}
          onPressClearButton={clearSearchText}
          onFocus={scrollToTop}
          onChangeText={handleSearchTextChange}
          placeholder={strings('deposit.token_modal.search_by_name_or_address')}
        />
      </View>
      <FlatList
        style={styles.list}
        ref={listRef}
        data={searchTokenResults}
        renderItem={renderToken}
        extraData={selectedCryptoAssetId}
        keyExtractor={(item) => item.assetId}
        ListEmptyComponent={renderEmptyList}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="always"
      />
    </SafeAreaView>
  );
}

export default TokenSelection;
