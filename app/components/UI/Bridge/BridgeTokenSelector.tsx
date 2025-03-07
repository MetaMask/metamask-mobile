import React, { useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
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
import { selectTokensBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import { selectTokenSortConfig } from '../../../selectors/preferencesController';
import { selectTokens } from '../../../selectors/tokensController';
import { sortAssets } from '../Tokens/util';
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
import { constants, utils } from 'ethers';
import { isMainnetByChainId } from '../../../util/networks';
import images from '../../../images/image-icons';
import { selectTokenMarketData } from '../../../selectors/tokenRatesController';
import { selectCurrencyRates, selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { zeroAddress } from 'ethereumjs-util';
import { addCurrencySymbol } from '../../../util/number';

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
  });
};

export const BridgeTokenSelector: React.FC<BridgeTokenSelectorProps> = ({
  onClose,
}) => {
  const { styles } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const selectedInternalAccountAddress = useSelector(selectSelectedInternalAccountAddress) as Hex;
  const tokenBalances = useSelector(selectTokensBalances);
  const tokens = useSelector(selectTokens);
  const currentChainId = useSelector(selectChainId) as Hex;
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const multiChainMarketData = useSelector(selectTokenMarketData);
  const multiChainCurrencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const tokensList = useMemo(() => {
    const tokensWithBalances = tokens.map((token) => {
      const balance = tokenBalances?.[selectedInternalAccountAddress]?.[currentChainId]?.[token.address as Hex];
      const formattedBalance = balance ? utils.formatUnits(balance, token.decimals) : '0';

      const exchangeRates = multiChainMarketData?.[currentChainId];
      const nativeCurrency = networkConfigurations[currentChainId]?.nativeCurrency;
      const conversionRate = multiChainCurrencyRates?.[nativeCurrency]?.conversionRate || 0;

      const tokenAddress = token.address as Hex;
      const tokenMarketData = token.address === constants.AddressZero ? exchangeRates?.[zeroAddress() as Hex] : exchangeRates?.[tokenAddress];
      const tokenPrice = tokenMarketData?.price || 0;
      const fiatValue = parseFloat(formattedBalance) * tokenPrice * conversionRate;
      const balanceFiat = fiatValue >= 0.01 || fiatValue === 0
        ? addCurrencySymbol(fiatValue, currentCurrency)
        : `< ${addCurrencySymbol('0.01', currentCurrency)}`;

      const tokenWithRequiredProps: TokenI = {
        ...token,
        balance: formattedBalance,
        balanceFiat,
        logo: token.image || '',
        isETH: token.address === constants.AddressZero,
        isNative: token.address === constants.AddressZero,
        aggregators: token.aggregators || [],
        image: token.image || '',
        name: token.name || token.symbol,
        hasBalanceError: false,
      };

      const pricePercentChange1d = tokenMarketData?.pricePercentChange1d || 0;

      return {
        ...tokenWithRequiredProps,
        chainId: currentChainId,
        balance: formattedBalance,
        tokenFiatAmount: fiatValue,
        balanceFiat,
        pricePercentChange1d,
      };
    });

    return sortAssets(tokensWithBalances, tokenSortConfig);
  }, [
    tokens,
    tokenSortConfig,
    tokenBalances,
    selectedInternalAccountAddress,
    currentChainId,
    multiChainMarketData,
    multiChainCurrencyRates,
    currentCurrency,
    networkConfigurations,
  ]);

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

  const renderTokenAvatar = useCallback((token: TokenI) => {
    if (token.isNative) {
      return (
        <NetworkAssetLogo
          chainId={currentChainId}
          style={styles.ethLogo}
          ticker={token.ticker || ''}
          big={false}
          biggest={false}
          testID={`network-logo-${token.symbol}`}
        />
      );
    }

    return (
      <AvatarToken
        name={token.symbol}
        imageSource={token.image ? { uri: token.image } : undefined}
        size={AvatarSize.Md}
      />
    );
  }, [currentChainId, styles.ethLogo]);

  const getNetworkBadgeDetails = useCallback((chainId: Hex) => {
    const network = networkConfigurations[chainId];
    const isMainnet = isMainnetByChainId(chainId);
    return {
      name: network?.name || '',
      imageSource: isMainnet ? images.ETHEREUM : undefined,
    };
  }, [networkConfigurations]);

  return (
    <BottomSheet isFullscreen>
      <Box style={styles.content}>
        <BottomSheetHeader onClose={onClose}>
          <Text variant={TextVariant.HeadingMD}>Select Token</Text>
        </BottomSheetHeader>

        <ScrollView>
          {tokensList.map((token) => {
            const networkDetails = getNetworkBadgeDetails(currentChainId);
            const balanceWithSymbol = `${token.balance} ${token.symbol}`;

            return (
              <AssetElement
                key={token.address}
                asset={token}
                onPress={() => handleTokenPress(token)}
                mainBalance={balanceWithSymbol}
                balance={token.balanceFiat}
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
                  {renderTokenAvatar(token)}
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
          })}
        </ScrollView>
      </Box>
    </BottomSheet>
  );
};
