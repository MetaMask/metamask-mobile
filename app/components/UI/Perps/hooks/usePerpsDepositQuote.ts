import { parseCaipAssetId, parseCaipChainId } from '@metamask/utils';
import { RequestStatus } from '@metamask/bridge-controller';
import { BigNumber } from 'bignumber.js';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { selectGasFeeEstimatesByChainId } from '../../../../selectors/gasFeeController';
import {
  selectProviderConfig,
  selectTicker,
} from '../../../../selectors/networkController';
import { selectPrimaryCurrency } from '../../../../selectors/settings';
import useFiatFormatter from '../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { formatAmount } from '../../SimulationDetails/formatAmount';
import { getTransaction1559GasFeeEstimates } from '../../Swaps/utils/gas';
import Engine from '../../../../core/Engine';
import I18n, { strings } from '../../../../../locales/i18n';
import type { PerpsToken } from '../components/PerpsTokenSelector';
import {
  getBridgeInfo,
  DEPOSIT_CONFIG,
  USDC_SYMBOL,
} from '../constants/hyperLiquidConfig';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { AssetRoute } from '../controllers/types';
import { getDecimalChainId } from '../../../../util/networks';
import { calcTokenValue } from '../../../../util/transactions';

interface PerpsDepositQuoteParams {
  amount: string;
  selectedToken: PerpsToken;
  getDepositRoutes?: () => AssetRoute[];
}

interface FormattedQuoteData {
  networkFee: string;
  estimatedTime: string;
  receivingAmount: string;
  exchangeRate?: string;
}

/**
 * Hook for getting Perps deposit quote data following Bridge patterns
 *
 * IMPORTANT: This follows Bridge's approach of getting quote data from backend APIs
 * - Gas fees come from quote.totalNetworkFee (NOT hardcoded gas limits)
 * - Processing time comes from quote.estimatedProcessingTimeInSeconds
 * - All data should be fetched from HyperLiquid quote API, not calculated locally
 *
 * Current implementation uses mock data with TODOs for real API integration
 */
export const usePerpsDepositQuote = ({
  amount,
  selectedToken,
  getDepositRoutes,
}: PerpsDepositQuoteParams) => {
  // Store getDepositRoutes in a ref to prevent it from causing re-renders
  const getDepositRoutesRef = useRef(getDepositRoutes);
  useEffect(() => {
    getDepositRoutesRef.current = getDepositRoutes;
  }, [getDepositRoutes]);
  const primaryCurrency = useSelector(selectPrimaryCurrency) ?? 'ETH';
  const ticker = useSelector(selectTicker);
  const fiatFormatter = useFiatFormatter();
  const locale = I18n.locale;

  // Quote refresh state following Bridge pattern
  const [isLoading, setIsLoading] = useState(false);
  const [quoteFetchError, setQuoteFetchError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());

  const REFRESH_RATE = DEPOSIT_CONFIG.refreshRate;

  // Get selectors for gas estimation and pricing data
  const selectedAccount = useSelector(selectSelectedInternalAccountAddress);
  const providerConfig = useSelector(selectProviderConfig);
  const currencyRates = useSelector(selectCurrencyRates);
  const chainId = providerConfig.chainId;
  const gasFeeEstimates = useSelector((state: RootState) =>
    selectGasFeeEstimatesByChainId(state, chainId),
  );

  // Network fee calculation using real gas estimation
  const getNetworkFee = useCallback(async (sourceAmount?: string) => {
    const amountToUse = sourceAmount || amount;
    if (
      !selectedAccount ||
      !amountToUse ||
      parseFloat(amountToUse) === 0 ||
      !selectedToken
    )
      return '-';

    try {
      // Path determination logic
      const currentNetworkChainId = providerConfig.chainId;
      const tokenChainId = selectedToken.chainId;
      const isArbitrumToken = tokenChainId === '0xa4b1';
      const isUSDC = selectedToken.symbol === USDC_SYMBOL;
      const isOnCorrectNetwork = currentNetworkChainId === tokenChainId;
      const isDirectDeposit = isUSDC && isArbitrumToken && isOnCorrectNetwork;

      DevLogger.log('PerpsDepositQuote: Network fee calculation', {
        currentNetworkChainId,
        tokenChainId,
        isArbitrumToken,
        tokenSymbol: selectedToken.symbol,
        isUSDC,
        isOnCorrectNetwork,
        isDirectDeposit,
      });

      // For direct USDC deposits on Arbitrum, estimate deposit transaction gas
      if (isDirectDeposit) {
        // Get bridge contract info from configuration
        const bridgeInfo = getBridgeInfo(false); // false = mainnet

        // Create transaction parameters for USDC deposit to HyperLiquid bridge
        const transactionParams = {
          from: selectedAccount,
          to: bridgeInfo.contractAddress,
          value: '0x0',
          data: '0x', // Would be actual deposit call data
        };

        const gasEstimates = await getTransaction1559GasFeeEstimates(
          transactionParams,
          providerConfig.chainId,
        );

        DevLogger.log('PerpsDepositQuote: Gas estimates result', {
          gasEstimates,
          hasMaxFeePerGas: !!gasEstimates?.maxFeePerGas,
        });

        if (gasEstimates?.maxFeePerGas) {
          // Estimate gas limit for deposit transaction (typical ERC20 transfer + bridge call)
          const estimatedGasLimit = new BigNumber(DEPOSIT_CONFIG.estimatedGasLimit);
          const gasFeeWei = new BigNumber(
            gasEstimates.maxFeePerGas,
          ).multipliedBy(estimatedGasLimit);
          const gasFeeEth = gasFeeWei.dividedBy(new BigNumber(10).pow(18));

          if (primaryCurrency === 'ETH') {
            const formattedAmount = formatAmount(locale, gasFeeEth);
            return `${formattedAmount} ${ticker}`;
          }
          // Use actual currency rates for fiat conversion
          const ethPrice = currencyRates?.ETH?.usdConversionRate;
          if (!ethPrice) {
            // If currency rates unavailable, show dash instead of guessing
            return '-';
          }
          const fiatValue = gasFeeEth.multipliedBy(ethPrice);

          // For very small amounts, show more precision
          if (fiatValue.isLessThan(0.01)) {
            return `$${fiatValue.toFixed(4)}`;
          }

          return fiatFormatter(fiatValue);
        }

        // If gas estimates are not available yet, show calculating
        return strings('perps.deposit.calculating_fee');
      }

      // If user is on wrong network for the selected token
      if (!isOnCorrectNetwork && isUSDC && isArbitrumToken) {
        return strings('perps.deposit.switch_network');
      }

      // For bridging scenarios, get real bridge quotes
      if (!isDirectDeposit && amountToUse && parseFloat(amountToUse) > 0) {
        try {
          DevLogger.log('PerpsDepositQuote: Getting bridge quote for cross-chain deposit');

          // Get bridge quotes from BridgeController
          const bridgeController = Engine.context.BridgeController;
          if (bridgeController) {
            // Calculate source token amount in minimal units
            const srcTokenAmount = selectedToken.decimals
              ? calcTokenValue(amountToUse, selectedToken.decimals).toFixed(0)
              : '0';

            // Update bridge quote parameters
            await bridgeController.updateBridgeQuoteRequestParams({
              srcChainId: getDecimalChainId(currentNetworkChainId),
              destChainId: getDecimalChainId(tokenChainId),
              srcTokenAddress: selectedToken.address,
              destTokenAddress: selectedToken.address,
              srcTokenAmount,
              slippage: DEPOSIT_CONFIG.defaultSlippage,
              walletAddress: selectedAccount,
              gasIncluded: false,
            }, {
              stx_enabled: false,
              token_symbol_source: selectedToken.symbol,
              token_symbol_destination: selectedToken.symbol,
              security_warnings: [] as string[], // Proper type for security_warnings
            });

            // Poll for quotes with proper loading state check
            let attempts = 0;
            const maxAttempts = 10;
            const pollInterval = 200; // 200ms

            while (attempts < maxAttempts) {
              const bridgeState = bridgeController.state;

              // Check if quotes are loaded
              if (bridgeState.quotesLoadingStatus !== RequestStatus.LOADING && bridgeState.quotes && bridgeState.quotes.length > 0) {
                DevLogger.log('PerpsDepositQuote: Bridge quotes received', {
                  quotesCount: bridgeState.quotes.length,
                  status: bridgeState.quotesLoadingStatus,
                });

                // Get the first quote - bridge quotes come with metadata
                const bestQuote = bridgeState.quotes[0];
                // Type guard to check if quote has metadata
                if ('totalNetworkFee' in bestQuote && bestQuote.totalNetworkFee) {
                  const networkFee = bestQuote.totalNetworkFee as {
                    amount: string;
                    valueInCurrency: string;
                  };

                  if (networkFee.amount && networkFee.valueInCurrency) {
                    // Format based on primary currency preference
                    if (primaryCurrency === 'ETH') {
                      const formattedAmount = formatAmount(locale, new BigNumber(networkFee.amount));
                      return `${formattedAmount} ${ticker}`;
                    }
                    const fiatValue = new BigNumber(networkFee.valueInCurrency);
                    if (fiatValue.isLessThan(0.01)) {
                      return `$${fiatValue.toFixed(4)}`;
                    }
                    return fiatFormatter(fiatValue);
                  }
                }
                break;
              }

              // Wait before next attempt
              await new Promise(resolve => setTimeout(resolve, pollInterval));
              attempts++;
            }

            DevLogger.log('PerpsDepositQuote: Bridge quote polling completed', { attempts });
          }
        } catch (bridgeError) {
          DevLogger.log('PerpsDepositQuote: Bridge quote failed', { bridgeError });
        }

        // If bridge quote fails or no fee data, show dash
        return '-';
      }

      // Default fallback
      return '-';
    } catch (error) {
      DevLogger.log('PerpsDepositQuote: Error in getNetworkFee', { error });
      // Gas fee estimation can fail during initial load or when TransactionController is not ready
      // This is expected and not an error condition
      return '-';
    }
  }, [
    selectedAccount,
    amount,
    selectedToken,
    providerConfig,
    primaryCurrency,
    ticker,
    locale,
    fiatFormatter,
    currencyRates,
  ]);

  // Dynamic estimated time calculation using real gas fee estimates and path analysis
  const getEstimatedTime = useCallback((): string => {
    // Use gas fee estimates to get real network-based time estimates
    if (!gasFeeEstimates || !selectedToken) {
      // Don't log this as it's expected during initial load
      return '';
    }

    try {
      // For direct deposits on Arbitrum (no bridging needed)
      // Get deposit routes from PerpsController if available
      if (getDepositRoutesRef.current) {
        const depositRoutes = getDepositRoutesRef.current();
        DevLogger.log('PerpsDepositQuote: Got deposit routes', {
          depositRoutes,
        });
        const matchingRoute = depositRoutes.find((route: AssetRoute) => {
          // Parse token asset ID using MetaMask CAIP utilities
          const parsedAsset = parseCaipAssetId(route.assetId);
          const chainHex = `0x${parseInt(
            parsedAsset.chainId.split(':')[1],
            10,
          ).toString(16)}`;

          return (
            chainHex === selectedToken.chainId &&
            parsedAsset.assetReference.toLowerCase() ===
            selectedToken.address.toLowerCase()
          );
        });

        DevLogger.log('PerpsDepositQuote: Route matching', {
          matchingRoute,
          selectedTokenChainId: selectedToken.chainId,
          selectedTokenSymbol: selectedToken.symbol,
        });

        if (
          matchingRoute &&
          selectedToken.chainId &&
          selectedToken.symbol === USDC_SYMBOL
        ) {
          // Use MetaMask's CAIP utilities to parse chain ID
          const parsedChain = parseCaipChainId(matchingRoute.chainId);
          const targetChainHex = `0x${parseInt(
            parsedChain.reference,
            10,
          ).toString(16)}`;

          DevLogger.log('PerpsDepositQuote: Chain comparison', {
            selectedTokenChainId: selectedToken.chainId,
            targetChainHex,
            matches: selectedToken.chainId === targetChainHex,
          });

          if (selectedToken.chainId === targetChainHex) {
            // Use medium gas level time estimates
            if (
              gasFeeEstimates &&
              typeof gasFeeEstimates === 'object' &&
              'medium' in gasFeeEstimates
            ) {
              const medium = gasFeeEstimates.medium;
              if (
                medium &&
                typeof medium === 'object' &&
                'minWaitTimeEstimate' in medium &&
                'maxWaitTimeEstimate' in medium
              ) {
                const minWait = Math.ceil(
                  (medium.minWaitTimeEstimate as number) / 1000,
                ); // Convert ms to seconds
                const maxWait = Math.ceil(
                  (medium.maxWaitTimeEstimate as number) / 1000,
                );

                DevLogger.log('PerpsDepositQuote: Gas estimates timing', {
                  minWaitTimeEstimate: medium.minWaitTimeEstimate,
                  maxWaitTimeEstimate: medium.maxWaitTimeEstimate,
                  minWait,
                  maxWait,
                });

                // For Arbitrum, gas estimates are often very low (1-2 seconds)
                // Use more realistic time estimates for transaction confirmation
                const realisticMinWait = Math.max(minWait, 15); // At least 15 seconds
                const realisticMaxWait = Math.max(maxWait, 30); // At least 30 seconds

                DevLogger.log('PerpsDepositQuote: Realistic timing', {
                  realisticMinWait,
                  realisticMaxWait,
                });

                if (realisticMinWait < 60 && realisticMaxWait < 60) {
                  const result = `${realisticMinWait}-${realisticMaxWait} seconds`;
                  DevLogger.log('PerpsDepositQuote: Final time result', {
                    result,
                  });
                  return result;
                }
                const minMin = Math.ceil(realisticMinWait / 60);
                const maxMin = Math.ceil(realisticMaxWait / 60);
                const result = `${minMin}-${maxMin} minutes`;
                DevLogger.log(
                  'PerpsDepositQuote: Final time result (minutes)',
                  { result },
                );
                return result;
              }
            }
            // Fallback for direct deposits if no gas estimates
            DevLogger.log(
              'PerpsDepositQuote: No gas estimates structure found',
            );
            return '';
          }
        }
      } else {
        DevLogger.log(
          'PerpsDepositQuote: No getDepositRoutes function available',
        );
      }

      // For cross-chain deposits that require bridging
      // TODO: Integrate with Bridge API for real bridge time estimates
      DevLogger.log(
        'PerpsDepositQuote: No matching route found, returning empty',
      );
      return ''; // Don't show estimate until we have real data
    } catch (error) {
      DevLogger.log('PerpsDepositQuote: Error in getEstimatedTime', { error });
      return '';
    }
  }, [gasFeeEstimates, selectedToken]);

  // Calculate receiving amount (1:1 for USDC, estimated for other tokens)
  const getReceivingAmount = useCallback(() => {
    const depositAmount = parseFloat(amount || '0');
    if (depositAmount === 0) return '0.00';

    // Check if token is selected
    if (!selectedToken) return '0.00';

    // For USDC deposits, it's 1:1
    if (selectedToken.symbol === USDC_SYMBOL) {
      return `${depositAmount.toFixed(2)} ${USDC_SYMBOL}`;
    }

    // For other tokens, we'd typically show estimated USDC amount
    // This would come from real quote data in production
    return `~${depositAmount.toFixed(2)} ${USDC_SYMBOL}`;
  }, [amount, selectedToken]);

  // Exchange rate display (if not direct USDC) using real price data
  const getExchangeRate = useCallback(() => {
    if (!selectedToken) return undefined;
    if (selectedToken.symbol === USDC_SYMBOL) return undefined;

    try {
      // For ETH, use currency rates
      if (
        selectedToken.symbol === 'ETH' &&
        currencyRates?.ETH?.usdConversionRate
      ) {
        const ethPriceUsd = new BigNumber(
          currencyRates.ETH.usdConversionRate,
        ).toFixed(2);
        return `1 ETH ≈ ${ethPriceUsd} ${USDC_SYMBOL}`;
      }

      // For other tokens, use a simple placeholder until real price API integration
      // TODO: Integrate with proper token price APIs for other tokens
      return `1 ${selectedToken.symbol} ≈ ? ${USDC_SYMBOL}`;
    } catch (error) {
      console.warn(strings('perps.errors.exchangeRateFailed'), error);
      return `1 ${selectedToken.symbol} ≈ ? ${USDC_SYMBOL}`;
    }
  }, [selectedToken, currencyRates]);

  // Refresh quotes automatically (calling real gas estimation)
  useEffect(() => {
    const refreshQuotes = async () => {
      if (!amount || parseFloat(amount) === 0) return;

      setIsLoading(true);
      setQuoteFetchError(null);

      try {
        // TODO: Call PerpsController.getDepositQuote() for real quote data
        // const quote = await Engine.context.PerpsController.getDepositQuote({
        //   amount,
        //   token: selectedToken,
        //   fromChain: providerConfig.chainId
        // });

        setLastRefreshTime(Date.now());
        setIsLoading(false);
      } catch (error) {
        console.error(strings('perps.errors.refreshQuoteFailed'), error);
        setQuoteFetchError(strings('perps.errors.refreshQuoteFailed'));
        setIsLoading(false);
      }
    };

    // Initial refresh
    refreshQuotes();

    // Set up interval for automatic refresh
    const interval = setInterval(refreshQuotes, REFRESH_RATE);

    return () => clearInterval(interval);
  }, [amount, selectedToken, REFRESH_RATE]);

  // State for async network fee calculation
  const [networkFee, setNetworkFee] = useState<string>('-');

  // Calculate network fee when dependencies change
  useEffect(() => {
    const calculateNetworkFee = async () => {
      const fee = await getNetworkFee();
      setNetworkFee(fee);
    };

    calculateNetworkFee();
  }, [amount, selectedToken, selectedAccount, providerConfig.chainId, getNetworkFee]);

  const formattedQuoteData: FormattedQuoteData = useMemo(() => {
    const estimatedTime = getEstimatedTime();
    const result = {
      networkFee,
      estimatedTime,
      receivingAmount: getReceivingAmount(),
      exchangeRate: getExchangeRate(),
    };

    return result;
  }, [networkFee, getEstimatedTime, getReceivingAmount, getExchangeRate]);

  return {
    formattedQuoteData,
    isLoading,
    quoteFetchError,
    lastRefreshTime,
  };
};
