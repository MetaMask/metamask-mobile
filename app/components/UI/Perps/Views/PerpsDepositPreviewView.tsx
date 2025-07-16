import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import React, { useCallback, useMemo } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import KeyValueRow from '../../../../component-library/components-temp/KeyValueRow';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes
} from '../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import Card from '../../../../component-library/components/Cards/Card';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant
} from '../../../../component-library/components/Texts/Text';
import Routes from '../../../../constants/navigation/Routes';
import { selectEnabledSourceChains } from '../../../../core/redux/slices/bridge';
import { selectCurrencyRates, selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import { getDisplayCurrencyValue } from '../../Bridge/utils/exchange-rates';
import { addCurrencySymbol } from '../../../../util/number';
import type { PerpsToken } from '../components/PerpsTokenSelector';
import { ARBITRUM_MAINNET_CHAIN_ID, HYPERLIQUID_ASSET_CONFIGS } from '../constants/hyperLiquidConfig';
import { usePerpsDepositQuote, usePerpsTrading } from '../hooks';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { selectIsIpfsGatewayEnabled } from '../../../../selectors/preferencesController';
import { enhanceTokenWithIcon } from '../utils/tokenIconUtils';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import BadgeNetwork from '../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, { BadgePosition } from '../../../../component-library/components/Badges/BadgeWrapper';
import { getNetworkImageSource, BLOCKAID_SUPPORTED_NETWORK_NAMES } from '../../../../util/networks';

interface DepositPreviewParams {
  amount: string;
  selectedToken: string;
}

// Define proper navigation types for this screen
interface DepositPreviewParamList {
  'PerpsDepositPreview': DepositPreviewParams;
  'PerpsDepositSuccess': DepositPreviewParams;
  'PerpsDepositProcessing': DepositPreviewParams;
  [key: string]: object | undefined;
}

type DepositPreviewScreenNavigationProp = NavigationProp<DepositPreviewParamList, 'PerpsDepositPreview'>;
type DepositPreviewScreenRouteProp = RouteProp<DepositPreviewParamList, 'PerpsDepositPreview'>;

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

  // Real pricing and gas data selectors
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const multichainAssetRates = useSelector(selectMultichainAssetsRates);
  const tokenList = useSelector(selectTokenList);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  // Get enabled chains from Redux instead of hardcoding
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const enabledChainIds = useMemo(
    () => enabledSourceChains.map((chain) => chain.chainId),
    [enabledSourceChains]
  );

  // Get real token data with balances using enabled chains from Redux
  const tokens = useTokensWithBalance({
    chainIds: enabledChainIds
  });

  // Convert string selectedToken to PerpsToken object with enhanced token metadata
  const selectedTokenObject: PerpsToken = useMemo(() => {
    // Find the selected token in our real token data
    const selectedTokenData = tokens.find(token =>
      token.symbol.toUpperCase() === selectedToken.toUpperCase()
    );

    if (selectedTokenData) {
      const baseToken = {
        symbol: selectedTokenData.symbol,
        address: selectedTokenData.address || '',
        decimals: selectedTokenData.decimals || 18,
        name: selectedTokenData.name || selectedTokenData.symbol,
        chainId: selectedTokenData.chainId || `0x${parseInt('1', 10).toString(16)}`,
        balance: selectedTokenData.balance,
        balanceFiat: selectedTokenData.balanceFiat ? addCurrencySymbol(parseFloat(selectedTokenData.balanceFiat.toString()), currentCurrency) : undefined,
      };

      // Enhance with proper token icon using our utility
      return enhanceTokenWithIcon({
        token: baseToken,
        tokenList,
        isIpfsGatewayEnabled,
      });
    }

    // Fallback for USDC on Arbitrum with enhanced icon
    const fallbackToken = {
      symbol: 'USDC',
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      decimals: 6,
      name: 'USD Coin',
      chainId: `0x${parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10).toString(16)}` as Hex,
    };

    return enhanceTokenWithIcon({
      token: fallbackToken,
      tokenList,
      isIpfsGatewayEnabled,
    });
  }, [selectedToken, tokens, tokenList, isIpfsGatewayEnabled, currentCurrency]);

  // Get deposit functionality
  const { deposit, getDepositRoutes } = usePerpsTrading();
  // Get quote data using Bridge patterns
  const { formattedQuoteData, isLoading: isQuoteLoading } = usePerpsDepositQuote({
    amount,
    selectedToken: selectedTokenObject,
    getDepositRoutes,
  });

  // Debug logging
  DevLogger.log('PerpsDepositPreviewView: Quote data', {
    amount,
    selectedToken,
    selectedTokenObject,
    formattedQuoteData,
    isQuoteLoading,
  });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(async () => {
    try {
      // Check if this is a direct deposit (USDC on Arbitrum only)
      const isDirectDeposit = selectedToken === 'USDC' && selectedTokenObject.chainId === `0x${parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10).toString(16)}`;

      // Navigate to processing screen first
      navigation.navigate(Routes.PERPS.DEPOSIT_PROCESSING, {
        amount,
        selectedToken,
        isDirectDeposit,
      });

      // Start the deposit process
      // TODO: Convert selectedToken to proper CAIP asset ID format
      // Using configuration constants instead of hardcoded values
      const usdcArbitrumAssetId = HYPERLIQUID_ASSET_CONFIGS.USDC.mainnet;
      await deposit({
        amount,
        assetId: usdcArbitrumAssetId,
      });
    } catch (error) {
      console.error('Failed to initiate deposit:', error);
      // Error handling is managed by the processing screen
    }
  }, [navigation, amount, selectedToken, selectedTokenObject.chainId, deposit]);

  // Real exchange rate calculation using MetaMask pricing data - NO HARDCODED VALUES
  const exchangeAmount = useMemo(() => {
    const usdcAmount = parseFloat(amount || '0');
    if (usdcAmount === 0 || !selectedToken) return '0.00';

    // Find the selected token in our real token data
    const selectedTokenData = tokens.find(token =>
      token.symbol.toUpperCase() === selectedToken.toUpperCase()
    );

    if (!selectedTokenData) {
      // No token data available, cannot calculate exchange rate
      return '0.00';
    }

    // Get token price using the same utilities as Bridge
    try {
      const displayValue = getDisplayCurrencyValue({
        token: selectedTokenData,
        amount: '1', // Get price per 1 token
        evmMultiChainMarketData: tokenMarketData,
        networkConfigurationsByChainId: networkConfigurations,
        evmMultiChainCurrencyRates: currencyRates,
        currentCurrency,
        nonEvmMultichainAssetRates: multichainAssetRates
      });

      // Parse the display value to get numeric price
      const tokenPriceInUsd = parseFloat(displayValue.replace(/[^0-9.-]+/g, '')) || 0;

      if (tokenPriceInUsd > 0) {
        const tokenAmount = usdcAmount / tokenPriceInUsd;
        return tokenAmount.toFixed(4);
      }
    } catch (error) {
      console.warn('Failed to calculate token exchange rate:', error);
    }

    // If we can't get real pricing data, return 0 instead of using fallbacks
    return '0.00';
  }, [amount, selectedToken, tokens, tokenMarketData, currencyRates, currentCurrency, networkConfigurations, multichainAssetRates]);

  // Use formattedQuoteData instead of manual calculations

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          onPress={handleBack}
          iconColor={IconColor.Default}
          style={styles.backButton}
          testID="buttonicon-arrowleft"
        />
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle} testID="header-title">
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
          <Text variant={TextVariant.BodySM} color={TextColor.Muted} style={styles.sectionLabel} testID="pay-with-label">
            PAY WITH
          </Text>

          <View style={styles.payWithContainer}>
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <BadgeNetwork
                  name={getNetworkImageSource({ chainId: selectedTokenObject.chainId || '' }) ?
                    BLOCKAID_SUPPORTED_NETWORK_NAMES[selectedTokenObject.chainId as keyof typeof BLOCKAID_SUPPORTED_NETWORK_NAMES] || selectedTokenObject.chainId :
                    selectedTokenObject.chainId}
                  imageSource={getNetworkImageSource({ chainId: selectedTokenObject.chainId || '' })}
                />
              }
            >
              <AvatarToken
                size={AvatarSize.Xs}
                name={selectedTokenObject.name || selectedTokenObject.symbol}
                imageSource={selectedTokenObject.image ? { uri: selectedTokenObject.image } : undefined}
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
