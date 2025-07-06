import { type GasFeeEstimates } from '@metamask/gas-fee-controller';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
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
import { selectEnabledSourceChains } from '../../../../core/redux/slices/bridge';
import { selectCurrencyRates, selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectGasFeeControllerEstimates } from '../../../../selectors/gasFeeController';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { addCurrencySymbol } from '../../../../util/number';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import { useTokensWithBalance } from '../../Bridge/hooks/useTokensWithBalance';
import { getDisplayCurrencyValue } from '../../Bridge/utils/exchange-rates';

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
  const gasFeeEstimates = useSelector(selectGasFeeControllerEstimates);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const multichainAssetRates = useSelector(selectMultichainAssetsRates);

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

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(() => {
    navigation.navigate('PerpsDepositSuccess', {
      amount,
      selectedToken,
    });
  }, [navigation, amount, selectedToken]);

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

  // Real gas fee estimation
  const networkFee = useMemo(() => {
    if (gasFeeEstimates && typeof gasFeeEstimates === 'object') {
      const estimates = gasFeeEstimates as GasFeeEstimates;
      if (estimates.medium?.suggestedMaxFeePerGas) {
        // Get medium fee estimate (in Gwei)
        const mediumFeeGwei = parseFloat(estimates.medium.suggestedMaxFeePerGas);

        // Estimate gas limit for token transfer (approximately 21000 for ETH, 65000 for ERC20)
        const estimatedGasLimit = selectedToken === 'ETH' ? 21000 : 65000;

        // Calculate gas fee in ETH
        const gasFeeEth = (mediumFeeGwei * estimatedGasLimit) / 1e9; // Convert from Gwei to ETH

        const ethPrice = currencyRates?.ETH?.conversionRate || 0;
        const gasFeeUsd = gasFeeEth * ethPrice;

        return addCurrencySymbol(gasFeeUsd.toFixed(2), currentCurrency);
      }
    }

    // If we can't get real gas estimates, return $0 instead of fallback
    return addCurrencySymbol('0.00', currentCurrency);
  }, [gasFeeEstimates, selectedToken, currencyRates, currentCurrency]);

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
            <View style={styles.tokenIcon} />
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

        {/* Transaction Details */}
        <View style={styles.detailsSection}>
          <Card style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default} testID="pay-with-label-detail">
                Pay with
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default} testID="pay-with-amount">
                {exchangeAmount} {selectedToken}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default} testID="network-fee-label">
                Network fee
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default} testID="network-fee-amount">
                {networkFee}
              </Text>
            </View>

            <View style={[styles.detailRow, styles.lastDetailRow]}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default} testID="estimated-time-label">
                Estimated time
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default} testID="estimated-time-value">
                2 minutes
              </Text>
            </View>
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
            testID="confirm-button"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DepositPreviewView;
