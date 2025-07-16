import { parseCaipAssetId, parseCaipChainId, type Hex } from '@metamask/utils';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
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
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { RootState } from '../../../../reducers';
import { swapsTokensWithBalanceSelector } from '../../../../reducers/swaps';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectConversionRate, selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectGasFeeEstimatesByChainId } from '../../../../selectors/gasFeeController';
import { selectEvmChainId, selectSelectedNetworkClientId } from '../../../../selectors/networkController';
import { selectIsIpfsGatewayEnabled } from '../../../../selectors/preferencesController';
import { selectContractBalances, selectContractBalancesPerChainId } from '../../../../selectors/tokenBalancesController';
import { selectTokenList } from '../../../../selectors/tokenListController';
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
import { useGasFeeEstimates } from '../../../Views/confirmations/hooks/gas/useGasFeeEstimates';
import { isSwapsNativeAsset } from '../../Swaps/utils';
import PerpsAmountDisplay from '../components/PerpsAmountDisplay';
import PerpsDepositPreviewModal from '../components/PerpsDepositPreviewModal';
import PerpsPayWithRow from '../components/PerpsPayWithRow';
import PerpsTokenSelector, { type PerpsToken } from '../components/PerpsTokenSelector';
import type { AssetRoute, DepositParams, PerpsNavigationParamList } from '../controllers/types';
import {
  usePerpsDeposit,
  usePerpsTrading
} from '../hooks';
import { enhanceTokenWithIcon } from '../utils/tokenIconUtils';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  HYPERLIQUID_ASSET_CONFIGS,
} from '../constants/hyperLiquidConfig';

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
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // Selectors (moved up to avoid use-before-define)
  const chainId = useSelector(selectEvmChainId);

  // Get deposit state and methods from different hooks
  const {
    status: depositStatus,
    flowType: depositFlowType,
    currentTxHash: currentDepositTxHash,
    error: depositError,
    requiresModalDismissal,
  } = usePerpsDeposit();
  const {
    getDepositRoutes,
    deposit,
    resetDepositState,
  } = usePerpsTrading();


  // State
  const [amount, setAmount] = useState('0');
  const [selectedToken, setSelectedToken] = useState<SelectedToken>(() => {
    // Extract USDC address from config
    const usdcMainnetConfig = HYPERLIQUID_ASSET_CONFIGS.USDC.mainnet;
    const usdcAddress = usdcMainnetConfig.split('/erc20:')[1]?.split('/')[0] || '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

    return {
      symbol: 'USDC',
      address: usdcAddress,
      decimals: 6,
      name: 'USD Coin',
      chainId: `0x${parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10).toString(16)}` as Hex,
    };
  });
  const [isTokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const [isPreviewModalVisible, setPreviewModalVisible] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [localDepositError, setLocalDepositError] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [hasResetState, setHasResetState] = useState(false);

  // Remaining selectors
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const selectedAddress = useSelector(selectSelectedInternalAccountFormattedAddress);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);
  const balances = useSelector(selectContractBalances);
  const balancesPerChain = useSelector(selectContractBalancesPerChainId);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  // Get tokens using the original selector that works, but enhance with proper token metadata
  const tokensWithBalance = useSelector(swapsTokensWithBalanceSelector);
  const tokenList = useSelector(selectTokenList);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  // Get default token from PerpsController supported routes or fall back to native token
  const getDefaultToken = useMemo((): SelectedToken => {
    let baseToken;
    try {
      const supportedRoutes = getDepositRoutes();

      if (supportedRoutes.length > 0) {
        // Parse first supported deposit route using MetaMask CAIP utilities
        const firstRoute = supportedRoutes[0];
        const parsedAsset = parseCaipAssetId(firstRoute.assetId);
        baseToken = {
          symbol: 'USDC',
          address: parsedAsset.assetReference, // Token contract address
          decimals: 6,
          name: 'USD Coin',
          chainId: `0x${parseInt(parsedAsset.chainId.split(':')[1], 10).toString(16)}` as Hex, // Convert to hex
        };
      }
    } catch (error) {
      // If parsing fails, fall through to native token fallback
    }

    // Fallback to current network native token
    if (!baseToken) {
      baseToken = {
        symbol: 'ETH',
        address: '', // Empty for native token
        decimals: 18,
        name: 'Ethereum',
        chainId,
      };
    }

    // Enhance the default token with proper icon
    return enhanceTokenWithIcon({
      token: baseToken,
      tokenList,
      isIpfsGatewayEnabled,
    });
  }, [getDepositRoutes, chainId, tokenList, isIpfsGatewayEnabled]);

  // Get real gas fee estimates for time calculation
  const gasFeeEstimates = useSelector((state: RootState) =>
    selectGasFeeEstimatesByChainId(state, chainId)
  );

  // Helper function to get estimated time using real network data
  const getEstimatedTime = useCallback((token: PerpsToken): string => {
    // Use gas fee estimates to get real network-based time estimates
    if (!gasFeeEstimates) {
      return '';
    }

    try {
      // For direct deposits on Arbitrum (no bridging needed)
      // Get deposit routes from PerpsController
      const depositRoutes = getDepositRoutes();
      const matchingRoute = depositRoutes.find((route: AssetRoute) => {
        // Parse token asset ID using MetaMask CAIP utilities
        const parsedAsset = parseCaipAssetId(route.assetId);
        const chainHex = `0x${parseInt(parsedAsset.chainId.split(':')[1], 10).toString(16)}`;

        return chainHex === token.chainId && parsedAsset.assetReference.toLowerCase() === token.address.toLowerCase();
      });

      if (matchingRoute && token.chainId && token.symbol === 'USDC') {
        // Use MetaMask's CAIP utilities to parse chain ID
        const parsedChain = parseCaipChainId(matchingRoute.chainId);
        const targetChainHex = `0x${parseInt(parsedChain.reference, 10).toString(16)}`;

        if (token.chainId === targetChainHex) {
          // Use medium gas level time estimates
          if (gasFeeEstimates && typeof gasFeeEstimates === 'object' && 'medium' in gasFeeEstimates) {
            const medium = gasFeeEstimates.medium;
            if (medium && typeof medium === 'object' &&
              'minWaitTimeEstimate' in medium && 'maxWaitTimeEstimate' in medium) {
              const minWait = Math.ceil((medium.minWaitTimeEstimate as number) / 1000); // Convert ms to seconds
              const maxWait = Math.ceil((medium.maxWaitTimeEstimate as number) / 1000);

              DevLogger.log('PerpsDepositAmountView: Gas estimates timing', {
                minWaitTimeEstimate: medium.minWaitTimeEstimate,
                maxWaitTimeEstimate: medium.maxWaitTimeEstimate,
                minWait,
                maxWait,
              });

              // For Arbitrum, gas estimates are often very low (1-2 seconds)
              // Use more realistic time estimates for transaction confirmation
              const realisticMinWait = Math.max(minWait, 15); // At least 15 seconds
              const realisticMaxWait = Math.max(maxWait, 30); // At least 30 seconds

              DevLogger.log('PerpsDepositAmountView: Realistic timing', {
                realisticMinWait,
                realisticMaxWait,
              });

              if (realisticMinWait < 60 && realisticMaxWait < 60) {
                const result = `${realisticMinWait}-${realisticMaxWait} seconds`;
                DevLogger.log('PerpsDepositAmountView: Final time result', { result });
                return result;
              }
              const minMin = Math.ceil(realisticMinWait / 60);
              const maxMin = Math.ceil(realisticMaxWait / 60);
              const result = `${minMin}-${maxMin} minutes`;
              DevLogger.log('PerpsDepositAmountView: Final time result (minutes)', { result });
              return result;
            }
          }
          // Fallback for direct deposits if no gas estimates
          return '';
        }
      }

      // For cross-chain deposits that require bridging
      // TODO: Integrate with Bridge API for real bridge time estimates
      return ''; // Don't show estimate until we have real data
    } catch (error) {
      return '';
    }
  }, [gasFeeEstimates, getDepositRoutes]);


  // Convert tokens from swaps selector but enhance with proper token metadata for icons
  const perpsTokens = useMemo(() => {
    DevLogger.log('PerpsDepositAmountView: Token debug info', {
      tokensWithBalance: tokensWithBalance?.length || 0,
      tokenListAvailable: !!tokenList,
      tokenListSize: tokenList ? Object.keys(tokenList).length : 0,
      balancesPerChain: Object.keys(balancesPerChain || {}),
      accountsByChainId: Object.keys(accountsByChainId || {}),
      currentChainId: chainId,
      selectedAddress,
    });

    if (!tokensWithBalance || tokensWithBalance.length === 0) {
      DevLogger.log('PerpsDepositAmountView: No tokens from swaps selector');
      return [];
    }

    // Get all tokens and add balance information from all chains
    const tokensWithBalanceInfo = tokensWithBalance.map((token: { symbol?: string; address?: string; decimals?: number; iconUrl?: string; image?: string; balance?: string; balanceFiat?: number; name?: string; chainId?: string }): PerpsToken => {
      const tokenAddress = safeToChecksumAddress(token.address || '');
      const tokenChainId = (token.chainId || chainId) as Hex;

      // Get balance from specific chain
      let balance = '0';
      let balanceFiat = 0;
      let balanceFiatString = '';

      if (tokenAddress && tokenChainId && selectedAddress) {
        // For native tokens (ETH)
        if (isSwapsNativeAsset(token)) {
          const accountBalance = accountsByChainId[tokenChainId]?.[selectedAddress]?.balance || '0x0';
          balance = renderFromWei(accountBalance);
          const fiatValue = weiToFiat(hexToBN(accountBalance), conversionRate, currentCurrency);
          balanceFiat = typeof fiatValue === 'number' ? fiatValue : 0;
          balanceFiatString = balanceFiat > 0 ? addCurrencySymbol(balanceFiat, currentCurrency) : '';
        } else {
          // For ERC20 tokens
          const tokenBalance = balancesPerChain[tokenChainId]?.[tokenAddress] || balances[tokenAddress];
          if (tokenBalance) {
            balance = renderFromTokenMinimalUnit(tokenBalance, token.decimals || 18);

            // Calculate fiat value
            const exchangeRate = tokenExchangeRates?.[tokenAddress]?.price;
            if (exchangeRate && conversionRate) {
              balanceFiat = balanceToFiatNumber(balance, conversionRate, exchangeRate);
              balanceFiatString = balanceFiat > 0 ? addCurrencySymbol(balanceFiat, currentCurrency) : '';
            } else {
              // No exchange rate available, set fiat values to 0
              balanceFiat = 0;
              balanceFiatString = '';
            }
          }
        }
      }

      // Enhanced: Get proper token icon using the new utility
      const baseToken = {
        symbol: token.symbol || '',
        address: token.address || '',
        decimals: token.decimals || 18,
        name: token.name,
        chainId: tokenChainId,
        image: token.image,
        balance,
        balanceFiat: balanceFiatString,
        tokenFiatAmount: balanceFiat,
      };

      // Use the improved token enhancement utility
      const enhancedToken = enhanceTokenWithIcon({
        token: baseToken,
        tokenList,
        isIpfsGatewayEnabled,
      });

      DevLogger.log('PerpsDepositAmountView: Token processing', {
        symbol: token.symbol,
        address: token.address,
        chainId: tokenChainId,
        balance,
        balanceFiat,
        hasBalance: parseFloat(balance) > 0,
        originalIconUrl: token.iconUrl,
        originalImage: token.image,
        enhancedImage: enhancedToken.image,
        tokenListMetadata: tokenAddress && tokenList ? !!tokenList[tokenAddress.toLowerCase()] : false,
      });

      return enhancedToken;
    });

    const tokensWithActualBalance = tokensWithBalanceInfo.filter((token: PerpsToken) =>
      token.balance && parseFloat(token.balance) > 0
    );

    DevLogger.log('PerpsDepositAmountView: Final tokens with balance', {
      totalTokens: tokensWithBalanceInfo.length,
      tokensWithBalance: tokensWithActualBalance.length,
      tokens: tokensWithActualBalance.map((t: PerpsToken) => ({ symbol: t.symbol, balance: t.balance, chainId: t.chainId, hasIcon: !!t.image })),
    });

    return tokensWithBalanceInfo;
  }, [tokensWithBalance, tokenList, accountsByChainId, selectedAddress, balances, balancesPerChain, tokenExchangeRates, conversionRate, currentCurrency, chainId, isIpfsGatewayEnabled]);


  // Reset deposit state immediately when starting a new deposit flow
  useEffect(() => {
    resetDepositState();
    setHasResetState(true);
  }, [resetDepositState]);

  // Update selectedToken with enhanced version when tokenList becomes available
  useEffect(() => {
    if (tokenList && !selectedToken.image) {
      setSelectedToken(getDefaultToken);
    }
  }, [getDefaultToken, selectedToken.image, tokenList]);


  // Update estimated time when token changes
  useEffect(() => {
    if (!selectedToken) return;

    // Update estimated time
    const newEstimatedTime = getEstimatedTime(selectedToken);
    setEstimatedTime(newEstimatedTime);
  }, [selectedToken, getEstimatedTime]);

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

    if (!selectedToken) return '0';

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

    // For ETH, use the current conversion rate (no hardcoded fallback)
    if (selectedToken.symbol === 'ETH' && conversionRate) {
      return (depositAmount / conversionRate).toFixed(6);
    }

    return '0';
  }, [amount, selectedToken, tokenExchangeRates, conversionRate]);

  // Start gas polling using MetaMask's standard pattern
  useGasFeeEstimates(selectedNetworkClientId);

  // Calculate gas fees using MetaMask's standard approach with proper unit conversion
  const estimatedGasFeeFiat = useMemo(() => {
    if (!gasFeeEstimates || !conversionRate) return '-';

    try {
      // Use standard ERC20 gas limit
      const gasLimitForERC20 = 120000;
      let gasPrice = 0;

      // Get actual gas price from estimates (following MetaMask patterns)
      if (gasFeeEstimates && typeof gasFeeEstimates === 'object') {
        if ('medium' in gasFeeEstimates && gasFeeEstimates.medium) {
          // EIP-1559 networks - gas price is in GWEI
          if (typeof gasFeeEstimates.medium === 'object' && 'suggestedMaxFeePerGas' in gasFeeEstimates.medium) {
            const rawGasPrice = gasFeeEstimates.medium.suggestedMaxFeePerGas;
            gasPrice = parseFloat(rawGasPrice);

            DevLogger.log('PerpsDeposit: Gas price extraction', {
              rawGasPrice,
              parsedGasPrice: gasPrice,
              gasFeeEstimatesType: typeof gasFeeEstimates,
              mediumType: typeof gasFeeEstimates.medium,
              chainId
            });
          }
        } else if ('gasPrice' in gasFeeEstimates) {
          // Legacy networks - gas price is in GWEI
          const rawGasPrice = gasFeeEstimates.gasPrice as string;
          gasPrice = parseFloat(rawGasPrice);

          DevLogger.log('PerpsDeposit: Legacy gas price extraction', {
            rawGasPrice,
            parsedGasPrice: gasPrice,
            chainId
          });
        }
      }

      if (gasPrice === 0) return '-';

      // CRITICAL FIX: Proper unit conversion following MetaMask patterns
      // 1. Gas price is in GWEI, multiply by gas limit to get total cost in GWEI
      // 2. Convert GWEI to ETH by dividing by 1e9 (1 GWEI = 1e-9 ETH)
      // 3. Convert ETH to fiat using conversion rate
      const totalFeeGwei = gasPrice * gasLimitForERC20;
      const totalFeeEth = totalFeeGwei / 1e9; // Convert GWEI to ETH
      const totalFeeFiat = totalFeeEth * conversionRate;

      DevLogger.log('PerpsDeposit: Final gas fee calculation', {
        gasPrice,
        gasLimitForERC20,
        conversionRate,
        totalFeeGwei,
        totalFeeEth,
        totalFeeFiat,
        formattedFee: `$${totalFeeFiat.toFixed(2)}`,
        chainId
      });

      // For very small amounts, show more precision
      if (totalFeeFiat < 0.01) {
        return `$${totalFeeFiat.toFixed(4)}`;
      }

      return `$${totalFeeFiat.toFixed(2)}`;
    } catch (error) {
      return '-';
    }
  }, [gasFeeEstimates, conversionRate, chainId]);

  // Use the calculated gas fee directly (MetaMask's utilities handle fallbacks)
  const networkFee = estimatedGasFeeFiat;

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

  const handleTokenSelect = useCallback(async (token: PerpsToken) => {
    setSelectedToken(token);
    setTokenSelectorVisible(false);

    // Update estimated time based on selected token
    const newEstimatedTime = getEstimatedTime(token);
    setEstimatedTime(newEstimatedTime);
  }, [getEstimatedTime]);

  const handleContinue = useCallback(() => {
    DevLogger.log('PerpsDepositAmountView: Opening preview modal', {
      amount,
      selectedToken,
      tokenAmountNeeded,
      networkFee,
      estimatedTime,
    });
    setPreviewModalVisible(true);
  }, [amount, selectedToken, tokenAmountNeeded, networkFee, estimatedTime]);

  const handleConfirmDeposit = useCallback(async () => {
    if (!selectedAddress) {
      setLocalDepositError('Account not available');
      return;
    }

    setIsDepositing(true);
    setLocalDepositError(null);

    try {
      // Find the exact matching supported asset ID from PerpsController
      const supportedRoutes = getDepositRoutes();
      const supportedAssets = supportedRoutes.map(route => route.assetId);
      const selectedTokenAddress = selectedToken.address.toLowerCase();

      // Find exact match from supported paths
      const assetId = supportedAssets.find(path =>
        path.toLowerCase().includes(selectedTokenAddress)
      );

      if (!assetId) {
        setLocalDepositError(`Token ${selectedToken.symbol} not supported for deposits`);
        return;
      }

      // Prepare deposit parameters using exact supported asset ID
      const depositParams: DepositParams = {
        amount,
        assetId,
      };

      DevLogger.log('PerpsDeposit: Calling deposit with reactive pattern', {
        depositParams,
        selectedToken,
        amount,
        selectedAddress,
        reactivePattern: 'Controller will handle flow, UI will react to state changes'
      });

      // Single call to controller - it handles the complete flow internally
      // Reactive useEffect hooks will handle modal dismissal and navigation
      await deposit(depositParams);

    } catch (error) {
      DevLogger.log('PerpsDeposit: Deposit error caught', {
        error: error instanceof Error ? error.message : 'Unknown error',
        selectedToken,
        supportedAssets: getDepositRoutes().map(route => route.assetId)
      });
      setLocalDepositError(error instanceof Error ? error.message : 'Unknown error occurred');
      Logger.error(error as Error, 'Failed to execute deposit');
    } finally {
      setIsDepositing(false);
    }
  }, [deposit, getDepositRoutes, selectedAddress, amount, selectedToken]);

  const handleClosePreview = useCallback(() => {
    setPreviewModalVisible(false);
    setLocalDepositError(null);
  }, []);

  // Reactive navigation effects based on deposit state
  useEffect(() => {
    // Auto-dismiss modal when controller signals it's required
    if (requiresModalDismissal) {
      setPreviewModalVisible(false);
    }
  }, [requiresModalDismissal]);

  useEffect(() => {
    // Only auto-navigate for legitimate deposits (not persisted old state)
    // hasResetState ensures we've cleared old state, and we need both success + txHash
    if (hasResetState && depositStatus === 'success' && currentDepositTxHash && amount !== '0') {
      navigation.navigate('PerpsDepositProcessing', {
        amount,
        fromToken: selectedToken.symbol,
        transactionHash: currentDepositTxHash,
      });
    }
  }, [hasResetState, depositStatus, currentDepositTxHash, navigation, amount, selectedToken, depositFlowType]);

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
          {strings('perps.deposit.title')}
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
              currency={selectedToken.symbol}
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
                {strings('perps.deposit.available')}
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
            label={strings('perps.deposit.continue')}
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
        selectedTokenChainId={selectedToken?.chainId}
        title={strings('perps.deposit.selectToken')}
      />

      {/* Deposit Preview Modal */}
      <PerpsDepositPreviewModal
        isVisible={isPreviewModalVisible}
        onClose={handleClosePreview}
        onConfirm={handleConfirmDeposit}
        amount={amount}
        selectedToken={selectedToken}
        tokenAmount={tokenAmountNeeded}
        networkFee={networkFee}
        estimatedTime={estimatedTime}
        isLoading={isDepositing}
        error={localDepositError || depositError}
      />
    </SafeAreaView>
  );
};

export default PerpsDepositAmountView;
