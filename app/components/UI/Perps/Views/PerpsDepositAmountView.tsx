import type { CaipAssetId, Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes
} from '../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Engine from '../../../../core/Engine';
import { swapsTokensWithBalanceSelector } from '../../../../reducers/swaps';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectConversionRate, selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectEvmChainId, selectSelectedNetworkClientId } from '../../../../selectors/networkController';
import { selectContractBalances, selectContractBalancesPerChainId } from '../../../../selectors/tokenBalancesController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import Logger from '../../../../util/Logger';
import { safeToChecksumAddress } from '../../../../util/address';
import {
  addCurrencySymbol,
  balanceToFiatNumber,
  hexToBN,
  renderFromTokenMinimalUnit,
  renderFromWei,
  weiToFiat
} from '../../../../util/number';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import Keypad from '../../../Base/Keypad';
import { isSwapsNativeAsset } from '../../Swaps/utils';
import PerpsAmountDisplay from '../components/PerpsAmountDisplay';
import PerpsDepositPreviewModal from '../components/PerpsDepositPreviewModal';
import PerpsPayWithRow from '../components/PerpsPayWithRow';
import PerpsTokenSelector, { type PerpsToken } from '../components/PerpsTokenSelector';
import type { DepositParams } from '../controllers/types';
import { usePerpsController } from '../hooks/usePerpsController';

interface PerpsDepositAmountViewProps { }

// Use the PerpsToken interface from PerpsTokenSelector
type SelectedToken = PerpsToken;

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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 20,
      paddingHorizontal: 16,
    },
    availableLabel: {
      fontSize: 14,
      color: colors.text.muted,
    },
    availableValue: {
      fontSize: 14,
      color: colors.text.muted,
      textAlign: 'right',
    },
    keypadSection: {
      paddingBottom: 16,
    },
    actionButton: {
      marginHorizontal: 24,
      marginBottom: 32,
    },
    disabledButton: {
      opacity: 0.5,
    },
  });

const PerpsDepositAmountView: React.FC<PerpsDepositAmountViewProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  // State
  const [amount, setAmount] = useState('0');
  const [selectedToken, setSelectedToken] = useState<SelectedToken>({
    symbol: 'USDC',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Official USDC on Arbitrum
    decimals: 6,
    name: 'USD Coin',
    chainId: '0xa4b1', // Arbitrum chain ID
  });
  const [isTokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const [isPreviewModalVisible, setPreviewModalVisible] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Selectors
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const selectedAddress = useSelector(selectSelectedInternalAccountFormattedAddress);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const balances = useSelector(selectContractBalances);
  const balancesPerChain = useSelector(selectContractBalancesPerChainId);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const chainId = useSelector(selectEvmChainId);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const tokensWithBalance = useSelector(swapsTokensWithBalanceSelector);

  // Convert tokens from swaps format to PerpsToken format
  const perpsTokens = useMemo(() => {
    if (!tokensWithBalance || tokensWithBalance.length === 0) return [];
    return tokensWithBalance.map((token: { symbol?: string; address?: string; decimals?: number; iconUrl?: string; balance?: string; balanceFiat?: number; name?: string; chainId?: string }): PerpsToken => ({
      symbol: token.symbol || '',
      address: token.address || '',
      decimals: token.decimals || 18,
      iconUrl: token.iconUrl,
      balance: token.balance,
      balanceFiat: token.balanceFiat,
      name: token.name,
      chainId: token.chainId,
    }));
  }, [tokensWithBalance]);

  // Fetch tokens on mount and when network changes
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const { SwapsController } = Engine.context;
        await SwapsController.fetchTokenWithCache({
          networkClientId: selectedNetworkClientId,
        });
        Logger.log('Perps: Tokens fetched successfully');
      } catch (error) {
        Logger.error(error as Error, 'Failed to fetch tokens for deposit');
      }
    };

    // Always fetch tokens to ensure we have the latest data
    fetchTokens();
  }, [selectedNetworkClientId, chainId]);

  // Get PerpsController instance
  const perpsController = usePerpsController();

  // Calculate token balance following MetaMask patterns
  const balance = useMemo(() => {
    if (!selectedToken || !selectedAddress) return '0';

    // For tokens with specific chainId (like USDC on Arbitrum), use that chain's balance
    const tokenChainId = selectedToken.chainId ? selectedToken.chainId as Hex : chainId;

    // Handle native ETH
    if (isSwapsNativeAsset(selectedToken)) {
      return renderFromWei(
        accountsByChainId[tokenChainId]?.[selectedAddress]?.balance || '0x0'
      );
    }

    // Handle ERC20 tokens - check specific chain first, then fallback to current chain
    const tokenAddress = safeToChecksumAddress(selectedToken.address);
    if (tokenAddress) {
      // Check balance on token's specific chain (e.g., Arbitrum for USDC)
      const tokenBalance = balancesPerChain[tokenChainId]?.[tokenAddress] ||
        balances[tokenAddress];

      if (tokenBalance) {
        return renderFromTokenMinimalUnit(
          tokenBalance,
          selectedToken.decimals
        );
      }
    }

    return '0';
  }, [selectedToken, selectedAddress, accountsByChainId, chainId, balances, balancesPerChain]);

  // Calculate fiat value for the selected token balance
  const balanceFiat = useMemo(() => {
    if (!selectedToken || !balance || !selectedAddress) return 0;

    const tokenChainId = selectedToken.chainId ? selectedToken.chainId as Hex : chainId;

    if (isSwapsNativeAsset(selectedToken)) {
      const balanceWei = hexToBN(
        accountsByChainId[tokenChainId]?.[selectedAddress]?.balance || '0x0'
      );
      return weiToFiat(
        balanceWei,
        conversionRate,
        currentCurrency,
      );
    }

    const tokenAddress = safeToChecksumAddress(selectedToken.address);
    const exchangeRate = tokenAddress ? tokenExchangeRates?.[tokenAddress as Hex]?.price : undefined;

    // For stablecoins like USDC, they're already pegged 1:1 to USD, so no conversion needed
    const isStablecoin = selectedToken.symbol === 'USDC' || selectedToken.symbol === 'USDT' || selectedToken.symbol === 'DAI';

    if (isStablecoin) {
      // Stablecoins are 1:1 with USD, just return the balance as the fiat value
      return parseFloat(balance) || 0;
    }

    const effectiveExchangeRate = exchangeRate || 0;
    if (!effectiveExchangeRate || !conversionRate) return 0;

    const fiatNumber = balanceToFiatNumber(
      balance,
      conversionRate,
      effectiveExchangeRate,
    );

    return fiatNumber || 0;
  }, [selectedToken, balance, selectedAddress, accountsByChainId, chainId, conversionRate, currentCurrency, tokenExchangeRates]);

  // Calculate the token amount needed for the deposit
  const tokenAmountNeeded = useMemo(() => {
    const depositAmount = parseFloat(amount) || 0;
    if (depositAmount === 0) return '0';

    // For stablecoins, 1:1 conversion (USDC is the primary deposit token for HyperLiquid)
    if (selectedToken.symbol === 'USDC' || selectedToken.symbol === 'USDT' || selectedToken.symbol === 'DAI') {
      // Show no decimals if it's a whole number, otherwise show up to 2 decimals
      return depositAmount % 1 === 0 ? depositAmount.toString() : depositAmount.toFixed(2);
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

  const handleTokenSelect = useCallback((token: PerpsToken) => {
    setSelectedToken(token);
    setTokenSelectorVisible(false);
  }, []);

  const handleContinue = useCallback(() => {
    setPreviewModalVisible(true);
  }, []);

  const handleConfirmDeposit = useCallback(async () => {
    if (!perpsController || !selectedAddress) {
      setDepositError('Controller or account not available');
      return;
    }

    setIsDepositing(true);
    setDepositError(null);

    try {
      // Prepare deposit parameters
      const depositParams: DepositParams = {
        amount,
        assetId: `eip155:1/erc20:${selectedToken.address}` as CaipAssetId,
      };

      const result = await perpsController.deposit(depositParams);
      if (result.success) {
        setPreviewModalVisible(false);
        // Navigate to processing/success view
        navigation.navigate('PerpsDepositProcessing' as never, {
          amount,
          selectedToken: selectedToken.symbol,
          txHash: result.txHash,
        });
      } else {
        setDepositError(result.error || 'Deposit failed');
      }
    } catch (error) {
      setDepositError(error instanceof Error ? error.message : 'Unknown error occurred');
      Logger.error(error as Error, 'Failed to execute deposit');
    } finally {
      setIsDepositing(false);
    }
  }, [perpsController, selectedAddress, amount, selectedToken, navigation]);

  const handleClosePreview = useCallback(() => {
    setPreviewModalVisible(false);
    setDepositError(null);
  }, []);

  const isValidAmount = useMemo(() => {
    const numericAmount = parseFloat(amount);
    const requiredTokenAmount = parseFloat(tokenAmountNeeded);
    const availableBalance = parseFloat(balance || '0');

    return numericAmount > 0 && requiredTokenAmount <= availableBalance;
  }, [amount, tokenAmountNeeded, balance]);

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
            <PerpsAmountDisplay
              amount={amount}
              currency="USDC"
              showCursor
            />
          </View>

          {/* Pay With Section */}
          <View style={styles.payWithSection}>
            <PerpsPayWithRow
              selectedToken={selectedToken}
              tokenAmount={tokenAmountNeeded}
              onPress={handleTokenSelectPress}
            />

            {/* Available Balance */}
            <View style={styles.availableBalance}>
              <Text style={styles.availableLabel}>
                Available
              </Text>
              <Text style={styles.availableValue}>
                {balanceDisplay} ≈ {fiatBalanceDisplay}
              </Text>
            </View>
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
        <View style={[styles.actionButton, !isValidAmount && styles.disabledButton]}>
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
      <PerpsTokenSelector
        isVisible={isTokenSelectorVisible}
        onClose={() => setTokenSelectorVisible(false)}
        onTokenSelect={handleTokenSelect}
        tokens={perpsTokens}
        selectedTokenAddress={selectedToken?.address}
        title="Select token to pay with"
      />

      {/* Deposit Preview Modal */}
      <PerpsDepositPreviewModal
        isVisible={isPreviewModalVisible}
        onClose={handleClosePreview}
        onConfirm={handleConfirmDeposit}
        amount={amount}
        selectedToken={selectedToken}
        tokenAmount={tokenAmountNeeded}
        networkFee="$4.83"
        estimatedTime="2 minutes"
        isLoading={isDepositing}
        error={depositError}
      />
    </SafeAreaView>
  );
};

export default PerpsDepositAmountView;
