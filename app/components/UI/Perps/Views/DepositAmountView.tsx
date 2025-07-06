import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes
} from '../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Keypad from '../../../Base/Keypad';
import Routes from '../../../../constants/navigation/Routes';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import { selectAccounts } from '../../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectCurrentCurrency, selectConversionRate } from '../../../../selectors/currencyRateController';
import { selectContractBalances } from '../../../../selectors/tokenBalancesController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import { selectSelectedNetworkClientId } from '../../../../selectors/networkController';
import { swapsUtils } from '@metamask/swaps-controller';
import {
  balanceToFiat,
  weiToFiat,
  addCurrencySymbol
} from '../../../../util/number';
import { swapsTokensSelector, swapsTokensWithBalanceSelector } from '../../../../reducers/swaps';
import AmountDisplay from '../components/AmountDisplay';
import PayWithRow from '../components/PayWithRow';
import TokenSelectModal from '../../Swaps/components/TokenSelectModal';
import useBalance from '../../Swaps/utils/useBalance';
import { isSwapsNativeAsset } from '../../Swaps/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

interface DepositAmountViewProps {}

interface SelectedToken {
  symbol: string;
  address: string;
  decimals: number;
  iconUrl?: string;
  balance?: string;
  balanceFiat?: number;
  name?: string;
}

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
      justifyContent: 'space-between',
    },
    inputSection: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    amountContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    payWithSection: {
      width: '100%',
    },
    availableBalance: {
      marginTop: -8,
      marginBottom: 20,
    },
    keypadSection: {
      paddingBottom: 16,
    },
    actionButton: {
      marginHorizontal: 24,
      marginBottom: 32,
    },
  });

const DepositAmountView: React.FC<DepositAmountViewProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  // State
  const [amount, setAmount] = useState('0');
  const [selectedToken, setSelectedToken] = useState<SelectedToken>({
    symbol: 'ETH',
    address: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
    decimals: 18,
  });
  const [isTokenSelectorVisible, setTokenSelectorVisible] = useState(false);

  // Selectors
  const accounts = useSelector(selectAccounts);
  const selectedAddress = useSelector(selectSelectedInternalAccountFormattedAddress);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const balances = useSelector(selectContractBalances);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  // const chainId = useSelector(selectEvmChainId); // TODO: Use for chain-specific logic
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const swapsTokens = useSelector(swapsTokensSelector);
  const tokensWithBalance = useSelector(swapsTokensWithBalanceSelector);

  // Fetch tokens on mount if not already loaded
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const { SwapsController } = Engine.context;
        await SwapsController.fetchTokenWithCache({
          networkClientId: selectedNetworkClientId,
        });
      } catch (error) {
        Logger.error(error as Error, 'Failed to fetch tokens for deposit');
      }
    };

    if (!swapsTokens || swapsTokens.length === 0) {
      fetchTokens();
    }
  }, [swapsTokens, selectedNetworkClientId]);

  // Use the same balance hook as Swaps
  const balance = useBalance(
    accounts,
    balances,
    selectedAddress,
    selectedToken,
  );

  // Calculate fiat value for the selected token balance
  const balanceFiat = useMemo(() => {
    if (!selectedToken || !balance) return 0;

    if (isSwapsNativeAsset(selectedToken)) {
      return weiToFiat(
        parseFloat(accounts[selectedAddress || '']?.balance || '0'),
        conversionRate,
        currentCurrency,
      );
    }

    const tokenAddress = selectedToken.address as `0x${string}`;
    const exchangeRate = tokenExchangeRates?.[tokenAddress]?.price;
    if (!exchangeRate) return 0;

    return balanceToFiat(
      balance,
      conversionRate,
      exchangeRate,
      currentCurrency,
    );
  }, [accounts, selectedAddress, selectedToken, balance, conversionRate, currentCurrency, tokenExchangeRates]);

  // Calculate the token amount needed for the deposit
  const tokenAmountNeeded = useMemo(() => {
    const depositAmount = parseFloat(amount) || 0;
    if (depositAmount === 0) return '0';

    // For stablecoins, 1:1 conversion
    if (selectedToken.symbol === 'USDC' || selectedToken.symbol === 'USDT' || selectedToken.symbol === 'DAI') {
      return depositAmount.toFixed(2);
    }

    // For other tokens, use exchange rate if available
    const tokenAddress = selectedToken.address as `0x${string}`;
    const exchangeRate = tokenExchangeRates?.[tokenAddress]?.price;
    if (exchangeRate && conversionRate) {
      // Convert USDC to USD, then to token
      const usdAmount = depositAmount; // USDC is pegged to USD
      const tokenPrice = exchangeRate * conversionRate; // Token price in USD
      const tokenAmount = usdAmount / tokenPrice;
      return tokenAmount.toFixed(6);
    }

    // Fallback for ETH
    if (selectedToken.symbol === 'ETH') {
      const ethPrice = conversionRate || 2000; // Fallback price
      return (depositAmount / ethPrice).toFixed(6);
    }

    return '0';
  }, [amount, selectedToken, tokenExchangeRates, conversionRate]);

  // Format balance display
  const balanceDisplay = useMemo(() => {
    if (!balance) return '0 ' + selectedToken.symbol;

    const numBalance = parseFloat(balance);
    if (numBalance === 0) return '0 ' + selectedToken.symbol;
    if (numBalance < 0.00001) return '< 0.00001 ' + selectedToken.symbol;

    return `${numBalance.toFixed(6)} ${selectedToken.symbol}`;
  }, [balance, selectedToken]);

  const fiatBalanceDisplay = useMemo(() => addCurrencySymbol(balanceFiat, currentCurrency), [balanceFiat, currentCurrency]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleKeypadPress = useCallback(({ value }: { value: string }) => {
    setAmount(value);
  }, []);

  const handleTokenSelectPress = useCallback(() => {
    setTokenSelectorVisible(true);
  }, []);

  const handleTokenSelect = useCallback((token: SelectedToken) => {
    setSelectedToken(token);
    setTokenSelectorVisible(false);
  }, []);

  const handleContinue = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.PERPS.DEPOSIT_PREVIEW,
      params: {
        amount,
        selectedToken,
        tokenAmountNeeded,
      },
    });
  }, [navigation, amount, selectedToken, tokenAmountNeeded]);

  const isValidAmount = useMemo(() => {
    const numericAmount = parseFloat(amount);
    return numericAmount > 0;
  }, [amount]);

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
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
          Amount to deposit
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Input Section */}
        <View style={styles.inputSection}>
          {/* Amount Display */}
          <View style={styles.amountContainer}>
            <AmountDisplay
              amount={amount}
              currency="USDC"
            />
          </View>

          {/* Pay With Section */}
          <View style={styles.payWithSection}>
            <PayWithRow
              selectedToken={selectedToken}
              tokenAmount={tokenAmountNeeded}
              onPress={handleTokenSelectPress}
            />

            {/* Available Balance */}
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Muted}
              style={styles.availableBalance}
            >
              Available: {balanceDisplay} ≈ {fiatBalanceDisplay}
            </Text>
          </View>
        </View>

        {/* Keypad */}
        <View style={styles.keypadSection}>
          <Keypad
            value={amount}
            onChange={handleKeypadPress}
            currency="USD"
            decimals={2}
          />
        </View>

        {/* Continue Button */}
        <View style={styles.actionButton}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Continue"
            onPress={handleContinue}
            disabled={!isValidAmount}
            testID="continue-button"
          />
        </View>
      </View>

      {/* Token Selector Modal */}
      <TokenSelectModal
        isVisible={isTokenSelectorVisible}
        dismiss={() => setTokenSelectorVisible(false)}
        title="Select Token to Deposit"
        tokens={swapsTokens || []}
        initialTokens={tokensWithBalance}
        onItemPress={handleTokenSelect}
        excludeAddresses={[]}
      />
    </SafeAreaView>
  );
};

export default DepositAmountView;
