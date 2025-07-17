import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import React, { useCallback, useMemo } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import KeyValueRow from '../../../../component-library/components-temp/KeyValueRow';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import Card from '../../../../component-library/components/Cards/Card';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Routes from '../../../../constants/navigation/Routes';
import { selectEnabledSourceChains } from '../../../../core/redux/slices/bridge';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import { getDisplayCurrencyValue } from '../../Bridge/utils/exchange-rates';
import { addCurrencySymbol } from '../../../../util/number';
import type { PerpsToken } from '../components/PerpsTokenSelector';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  HYPERLIQUID_ASSET_CONFIGS,
  USDC_SYMBOL,
} from '../constants/hyperLiquidConfig';
import { usePerpsDepositQuote, usePerpsTrading } from '../hooks';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { selectIsIpfsGatewayEnabled } from '../../../../selectors/preferencesController';
import { enhanceTokenWithIcon } from '../utils/tokenIconUtils';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import BadgeNetwork from '../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import {
  getNetworkImageSource,
  BLOCKAID_SUPPORTED_NETWORK_NAMES,
} from '../../../../util/networks';
import BigNumber from 'bignumber.js';
import { toHex } from '@metamask/controller-utils';

interface DepositPreviewParams {
  amount: string;
  selectedToken: string;
}

// Define proper navigation types for this screen
interface DepositPreviewParamList {
  PerpsDepositPreview: DepositPreviewParams;
  PerpsDepositSuccess: DepositPreviewParams;
  PerpsDepositProcessing: DepositPreviewParams;
  [key: string]: object | undefined;
}

type DepositPreviewScreenNavigationProp = NavigationProp<
  DepositPreviewParamList,
  'PerpsDepositPreview'
>;
type DepositPreviewScreenRouteProp = RouteProp<
  DepositPreviewParamList,
  'PerpsDepositPreview'
>;

interface DepositPreviewViewProps { }

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      width: 24,
      height: 24,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 24,
      height: 24,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 32,
    },
    amountSection: {
      alignItems: 'center',
      marginBottom: 40,
    },
    amountText: {
      fontSize: 48,
      lineHeight: 60,
      fontWeight: '300',
      color: colors.text.muted,
    },
    payWithSection: {
      marginBottom: 32,
    },
    sectionLabel: {
      marginBottom: 8,
    },
    payWithContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
    },
    tokenIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary.default,
    },
    detailsSection: {
      marginBottom: 40,
    },
    detailCard: {
      padding: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    lastDetailRow: {
      marginBottom: 0,
    },
    actionButton: {
      marginTop: 'auto',
      marginBottom: 32,
    },
    swapIcon: {
      alignSelf: 'center',
      marginVertical: 16,
      backgroundColor: colors.background.alternative,
      borderRadius: 20,
      padding: 8,
    },
  });

const DepositPreviewView: React.FC<DepositPreviewViewProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<DepositPreviewScreenNavigationProp>();
  const route = useRoute<DepositPreviewScreenRouteProp>();

  const { amount, selectedToken } = route.params;

  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const tokenList = useSelector(selectTokenList);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const enabledChainIds = useMemo(
    () => enabledSourceChains.map((chain) => chain.chainId),
    [enabledSourceChains],
  );

  const tokens = useTokensWithBalance({
    chainIds: enabledChainIds,
  });

  const selectedTokenObject: PerpsToken = useMemo(() => {
    const selectedTokenData = tokens.find(
      (token) => token.symbol.toUpperCase() === selectedToken.toUpperCase(),
    );

    if (selectedTokenData) {
      const baseToken = {
        symbol: selectedTokenData.symbol,
        address: selectedTokenData.address || '',
        decimals: selectedTokenData.decimals || 18,
        name: selectedTokenData.name || selectedTokenData.symbol,
        chainId:
          selectedTokenData.chainId || `0x${parseInt('1', 10).toString(16)}`,
        balance: selectedTokenData.balance,
        balanceFiat: selectedTokenData.balanceFiat
          ? addCurrencySymbol(
            parseFloat(selectedTokenData.balanceFiat.toString()),
            currentCurrency,
          )
          : undefined,
      };

      return enhanceTokenWithIcon({
        token: baseToken,
        tokenList,
        isIpfsGatewayEnabled,
      });
    }

    const fallbackToken = {
      symbol: 'USDC',
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      decimals: 6,
      name: 'USD Coin',
      chainId: `0x${parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10).toString(
        16,
      )}` as Hex,
    };

    return enhanceTokenWithIcon({
      token: fallbackToken,
      tokenList,
      isIpfsGatewayEnabled,
    });
  }, [selectedToken, tokens, tokenList, isIpfsGatewayEnabled, currentCurrency]);

  const { deposit, getDepositRoutes } = usePerpsTrading();
  const { formattedQuoteData, isLoading: isQuoteLoading } =
    usePerpsDepositQuote({
      amount,
      selectedToken: selectedTokenObject,
      getDepositRoutes,
    });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(async () => {
    try {
      const isDirectDeposit =
        selectedToken === USDC_SYMBOL &&
        selectedTokenObject.chainId ===
        toHex(ARBITRUM_MAINNET_CHAIN_ID) as Hex;

      navigation.navigate(Routes.PERPS.DEPOSIT_PROCESSING, {
        amount,
        selectedToken,
        isDirectDeposit,
      });

      const usdcArbitrumAssetId = HYPERLIQUID_ASSET_CONFIGS.USDC.mainnet;
      await deposit({
        amount,
        assetId: usdcArbitrumAssetId,
      });
    } catch (error) {
      // Error handling is managed by the processing screen
    }
  }, [navigation, amount, selectedToken, selectedTokenObject.chainId, deposit]);

  const exchangeAmount = useMemo(() => {
    const usdcAmount = parseFloat(amount || '0');
    if (usdcAmount === 0 || !selectedToken) return '0.00';

    const selectedTokenData = tokens.find(
      (token) => token.symbol.toUpperCase() === selectedToken.toUpperCase(),
    );

    if (!selectedTokenData) {
      return '0.00';
    }

    try {
      const displayValue = getDisplayCurrencyValue({
        token: selectedTokenData,
        amount: '1', // Get price per 1 token
        evmMultiChainMarketData: tokenMarketData,
        networkConfigurationsByChainId: networkConfigurations,
        evmMultiChainCurrencyRates: currencyRates,
        currentCurrency,
        nonEvmMultichainAssetRates: {},
      });

      // Use a more robust parsing approach that handles locale-specific formats
      // First, normalize the display value by removing currency symbols and spaces
      const normalizedValue = displayValue
        .replace(/[^\d.,-]/g, '') // Keep digits, dots, commas, and minus
        .replace(/,/g, ''); // Remove thousand separators (commas)

      // Parse the normalized value
      const tokenPriceInUsd = parseFloat(normalizedValue);

      if (!isNaN(tokenPriceInUsd) && tokenPriceInUsd > 0) {
        // Use BigNumber for precise division to avoid floating-point errors
        const usdcAmountBN = new BigNumber(usdcAmount);
        const tokenPriceBN = new BigNumber(tokenPriceInUsd);
        const tokenAmountBN = usdcAmountBN.dividedBy(tokenPriceBN);

        // Return with appropriate decimal places
        return tokenAmountBN.toFixed(4, BigNumber.ROUND_DOWN);
      }
    } catch (error) {
      // Silent failure - return 0 if pricing data unavailable
    }

    return '0.00';
  }, [
    amount,
    selectedToken,
    tokens,
    tokenMarketData,
    currencyRates,
    currentCurrency,
    networkConfigurations,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          onPress={handleBack}
          iconColor={IconColor.Default}
          style={styles.backButton}
          testID="buttonicon-arrowleft"
        />
        <Text
          variant={TextVariant.HeadingMD}
          style={styles.headerTitle}
          testID="header-title"
        >
          Amount to deposit
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Amount Display */}
        <View style={styles.amountSection}>
          <Text
            variant={TextVariant.DisplayMD}
            style={styles.amountText}
            testID="amount-display"
          >
            {amount || '0'} USDC
          </Text>
        </View>

        {/* Pay With Section */}
        <View style={styles.payWithSection}>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Muted}
            style={styles.sectionLabel}
            testID="pay-with-label"
          >
            PAY WITH
          </Text>

          <View style={styles.payWithContainer}>
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <BadgeNetwork
                  name={
                    getNetworkImageSource({
                      chainId: selectedTokenObject.chainId || '',
                    })
                      ? BLOCKAID_SUPPORTED_NETWORK_NAMES[
                      selectedTokenObject.chainId as keyof typeof BLOCKAID_SUPPORTED_NETWORK_NAMES
                      ] || selectedTokenObject.chainId
                      : selectedTokenObject.chainId
                  }
                  imageSource={getNetworkImageSource({
                    chainId: selectedTokenObject.chainId || '',
                  })}
                />
              }
            >
              <AvatarToken
                size={AvatarSize.Xs}
                name={selectedTokenObject.name || selectedTokenObject.symbol}
                imageSource={
                  selectedTokenObject.image
                    ? { uri: selectedTokenObject.image }
                    : undefined
                }
              />
            </BadgeWrapper>
            <Text variant={TextVariant.BodyMDMedium} testID="exchange-amount">
              {exchangeAmount} {selectedToken}
            </Text>
            <ButtonIcon
              iconName={IconName.SwapHorizontal}
              iconColor={IconColor.Default}
              testID="buttonicon-swaphorizontal"
            />
          </View>
        </View>

        {/* Swap Icon */}
        <View style={styles.swapIcon}>
          <ButtonIcon
            iconName={IconName.SwapVertical}
            iconColor={IconColor.Default}
            testID="buttonicon-swapvertical"
          />
        </View>

        {/* Transaction Details using Bridge pattern */}
        <View style={styles.detailsSection}>
          <Card style={styles.detailCard}>
            <KeyValueRow
              field={{
                label: {
                  text: 'Pay with',
                  variant: TextVariant.BodyMDMedium,
                },
              }}
              value={{
                label: {
                  text: `${exchangeAmount} ${selectedToken}`,
                  variant: TextVariant.BodyMD,
                },
              }}
            />

            <KeyValueRow
              field={{
                label: {
                  text: 'Network fee',
                  variant: TextVariant.BodyMDMedium,
                },
              }}
              value={{
                label: {
                  text: formattedQuoteData?.networkFee || '-',
                  variant: TextVariant.BodyMD,
                },
              }}
            />

            <KeyValueRow
              field={{
                label: {
                  text: 'Estimated time',
                  variant: TextVariant.BodyMDMedium,
                },
              }}
              value={{
                label: {
                  text: formattedQuoteData?.estimatedTime || '-',
                  variant: TextVariant.BodyMD,
                },
              }}
            />

            <KeyValueRow
              field={{
                label: {
                  text: 'You will receive',
                  variant: TextVariant.BodyMDMedium,
                },
              }}
              value={{
                label: {
                  text: formattedQuoteData?.receivingAmount || '-',
                  variant: TextVariant.BodyMD,
                },
              }}
            />

            {formattedQuoteData?.exchangeRate && (
              <KeyValueRow
                field={{
                  label: {
                    text: 'Exchange rate',
                    variant: TextVariant.BodyMDMedium,
                  },
                }}
                value={{
                  label: {
                    text: formattedQuoteData.exchangeRate,
                    variant: TextVariant.BodyMD,
                  },
                }}
              />
            )}
          </Card>
        </View>

        {/* Confirm Button */}
        <View style={styles.actionButton}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Confirm deposit"
            onPress={handleConfirm}
            loading={isQuoteLoading}
            testID="confirm-button"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DepositPreviewView;
