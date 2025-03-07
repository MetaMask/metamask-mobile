import React, { useCallback, useEffect } from 'react';
import { StyleSheet, FlatList, View, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box } from '../Box/Box';
import Text, { TextVariant, TextColor } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import { TokenI } from '../Tokens/types';
import AssetElement from '../AssetElement';
import { Hex } from '@metamask/utils';
import { selectChainId, selectNetworkConfigurations } from '../../../selectors/networkController';
import { BridgeToken } from './types';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { setSourceToken } from '../../../core/redux/slices/bridge';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import NetworkAssetLogo from '../NetworkAssetLogo';
import { isMainnetByChainId } from '../../../util/networks';
import images from '../../../images/image-icons';
import { useSourceTokens } from './useSourceTokens';
import Engine from '../../../core/Engine';
import Icon, { IconName } from '../../../component-library/components/Icons/Icon';
import { IconSize } from '../../../component-library/components/Icons/Icon/Icon.types';
import { balanceToFiat } from '../../../util/number';
import { selectCurrentCurrency, selectConversionRate } from '../../../selectors/currencyRateController';
import { selectContractExchangeRates } from '../../../selectors/tokenRatesController';

interface BridgeTokenSelectorProps {
  onClose?: () => void;
}

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      padding: 24,
      backgroundColor: theme.colors.background.default,
      flex: 1,
    },
    ethLogo: {
      width: 40,
      height: 40,
    },
    balances: {
      flex: 1,
      marginLeft: 8,
    },
    assetName: {
      flexDirection: 'column',
    },
    tokenSymbol: {
      marginBottom: 4,
    },
    listContent: {
      paddingBottom: 24,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      position: 'relative',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeIcon: {
      padding: 8,
      position: 'absolute',
      right: 0,
    },
  });
};

export const BridgeTokenSelector: React.FC<BridgeTokenSelectorProps> = () => {
  const { styles, theme } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const currentChainId = useSelector(selectChainId) as Hex;
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const tokensList = useSourceTokens();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);

  useEffect(() => {
    const { BridgeController } = Engine.context;
    BridgeController.setBridgeFeatureFlags();
  }, []);

  const handleTokenPress = useCallback((token: TokenI) => {
    const bridgeToken: BridgeToken = {
      address: token.address,
      symbol: token.symbol,
      image: token.image,
      decimals: token.decimals,
      chainId: token.chainId as SupportedCaipChainId,
    };

    dispatch(setSourceToken(bridgeToken));
    navigation.goBack();
  }, [dispatch, navigation]);

  const getNetworkBadgeDetails = useCallback((chainId: Hex) => {
    const network = networkConfigurations[chainId];
    const isMainnet = isMainnetByChainId(chainId);
    return {
      name: network?.name || '',
      imageSource: isMainnet ? images.ETHEREUM : undefined,
    };
  }, [networkConfigurations]);

  const renderItem = useCallback(({ item: token }: { item: TokenI }) => {
    const networkDetails = getNetworkBadgeDetails(currentChainId);

    // Use the pre-formatted balance from useSourceTokens
    const hasBalance = parseFloat(token.balance) > 0;

    // Calculate fiat value
    const exchangeRate = token.address ? tokenExchangeRates?.[token.address as Hex]?.price : undefined;
    const fiatValue = hasBalance ? balanceToFiat(
      token.balance,
      conversionRate,
      exchangeRate,
      currentCurrency
    ) : undefined;

    const balanceWithSymbol = hasBalance ? `${token.balance} ${token.symbol}` : undefined;

    return (
      <AssetElement
        key={token.address}
        asset={token}
        onPress={() => handleTokenPress(token)}
        mainBalance={balanceWithSymbol}
        balance={fiatValue}
      >
        <BadgeWrapper
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              name={networkDetails.name}
              imageSource={networkDetails.imageSource}
            />
          }
        >
          {token.isNative ? (
            <NetworkAssetLogo
              chainId={currentChainId}
              style={styles.ethLogo}
              ticker={token.ticker || ''}
              big={false}
              biggest={false}
              testID={`network-logo-${token.symbol}`}
            />
          ) : (
            <AvatarToken
              name={token.symbol}
              imageSource={token.image ? { uri: token.image } : undefined}
              size={AvatarSize.Md}
            />
          )}
        </BadgeWrapper>
        <View style={styles.balances}>
          <View style={styles.assetName}>
            <Text
              variant={TextVariant.BodyLGMedium}
              style={styles.tokenSymbol}
            >
              {token.symbol}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
            >
              {token.name}
            </Text>
          </View>
        </View>
      </AssetElement>
    );
  }, [currentChainId, getNetworkBadgeDetails, handleTokenPress, styles, tokenExchangeRates, conversionRate, currentCurrency]);

  const keyExtractor = useCallback((token: TokenI) => token.address, []);

  return (
    <BottomSheet isFullscreen>
      <Box style={styles.content}>
        <BottomSheetHeader>
          <View style={styles.headerContainer}>
            <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
              Select Token
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeIcon} testID="bridge-token-selector-close-button">
              <Icon
                name={IconName.Close}
                size={IconSize.Sm}
                color={theme.colors.icon.default}
              />
            </TouchableOpacity>
          </View>
        </BottomSheetHeader>

        <FlatList
          data={tokensList}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={20}
        />
      </Box>
    </BottomSheet>
  );
};
