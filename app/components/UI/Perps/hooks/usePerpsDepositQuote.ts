import { type GenericQuoteRequest } from '@metamask/bridge-controller';
import { toHex } from '@metamask/controller-utils';
import { BigNumber } from 'bignumber.js';
import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { selectBridgeControllerState } from '../../../../core/redux/slices/bridge';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import {
  selectProviderConfig,
  selectTicker,
} from '../../../../selectors/networkController';
import { selectPrimaryCurrency } from '../../../../selectors/settings';
import { getDecimalChainId } from '../../../../util/networks';
import { calcTokenValue } from '../../../../util/transactions';
import {
  isQuoteExpired,
  shouldRefreshQuote,
} from '../../Bridge/utils/quoteUtils';
import useFiatFormatter from '../../SimulationDetails/FiatDisplay/useFiatFormatter';
import { getTransaction1559GasFeeEstimates } from '../../Swaps/utils/gas';
import type { PerpsToken } from '../components/PerpsTokenSelector';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  DEPOSIT_CONFIG,
  getBridgeInfo,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_SYMBOL,
} from '../constants/hyperLiquidConfig';

interface BridgeQuoteWithMetadata {
  totalNetworkFee?: {
    amount?: string | null;
    valueInCurrency?: string | null;
    usd?: string | null;
  };
  quote?: {
    destTokenAmount?: string;
    totalNetworkFee?: {
      amount?: string | null;
      valueInCurrency?: string | null;
    };
    feeData?: {
      metabridge?: {
        amount?: string;
        asset?: {
          symbol?: string;
          decimals?: number;
        };
      };
    };
  };
  estimatedProcessingTimeInSeconds?: number;
  networkFee?: {
    amount?: string | null;
    valueInCurrency?: string | null;
  };
  trade?: {
    data?: string;
    estimatedGas?: string;
    from?: string;
    gasLimit?: number;
    to?: string;
    value?: string;
  };
}

interface PerpsDepositQuoteParams {
  amount: string;
  selectedToken: PerpsToken;
}

interface FormattedQuoteData {
  networkFee: string;
  estimatedTime: string;
  receivingAmount: string;
  exchangeRate?: string;
}

const DEBOUNCE_WAIT = 700;
const DEFAULT_REFRESH_RATE = 30 * 1000;
const BRIDGE_QUOTE_TIMEOUT = 15 * 1000; // 15 seconds timeout for bridge quotes

/**
 * Hook for getting Perps deposit quote data with BridgeController integration
 * Supports both direct deposits and cross-chain bridging
 * Tracks quote expiration and refresh attempts
 */
export const usePerpsDepositQuote = ({
  amount,
  selectedToken,
}: PerpsDepositQuoteParams) => {
  // Log every single render with all inputs
  DevLogger.log('[usePerpsDepositQuote] ===== HOOK RENDER START =====');
  DevLogger.log('[usePerpsDepositQuote] Input params:', {
    amount,
    amountType: typeof amount,
    amountLength: amount?.length,
    selectedToken: selectedToken
      ? {
          symbol: selectedToken.symbol,
          address: selectedToken.address,
          decimals: selectedToken.decimals,
          chainId: selectedToken.chainId,
        }
      : null,
  });

  const primaryCurrency = useSelector(selectPrimaryCurrency) ?? 'ETH';
  const ticker = useSelector(selectTicker);
  const fiatFormatter = useFiatFormatter();

  const selectedAccount = useSelector(selectSelectedInternalAccountAddress);
  const providerConfig = useSelector(selectProviderConfig);
  const currencyRates = useSelector(selectCurrencyRates);
  const bridgeControllerState = useSelector(selectBridgeControllerState);

  DevLogger.log('[usePerpsDepositQuote] Bridge controller state:', {
    hasQuotes: bridgeControllerState?.quotes
      ? Object.keys(bridgeControllerState.quotes).length
      : 0,
    quoteFetchError: bridgeControllerState?.quoteFetchError,
  });

  const [networkFee, setNetworkFee] = useState<string>('-');
  const [isLoading, setIsLoading] = useState(false);
  const [quoteFetchedTime, setQuoteFetchedTime] = useState<number | null>(null);
  const [quotesRefreshCount, setQuotesRefreshCount] = useState(0);
  const [bridgeQuote, setBridgeQuote] =
    useState<BridgeQuoteWithMetadata | null>(null);
  const [localQuoteFetchError, setLocalQuoteFetchError] = useState<
    string | null
  >(null);
  const bridgeQuoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasQuoteFailed, setHasQuoteFailed] = useState(false);

  // Use refs to store values that shouldn't trigger recalculation
  const currentProviderChainId = useRef(providerConfig.chainId);
  const currentSelectedAccount = useRef(selectedAccount);
  const currentCurrencyRates = useRef(currencyRates);
  const currentPrimaryCurrency = useRef(primaryCurrency);
  const currentTicker = useRef(ticker);
  const currentFiatFormatter = useRef(fiatFormatter);

  // Update refs when values change
  useEffect(() => {
    currentProviderChainId.current = providerConfig.chainId;
    currentSelectedAccount.current = selectedAccount;
    currentCurrencyRates.current = currencyRates;
    currentPrimaryCurrency.current = primaryCurrency;
    currentTicker.current = ticker;
    currentFiatFormatter.current = fiatFormatter;
  }, [
    providerConfig.chainId,
    selectedAccount,
    currencyRates,
    primaryCurrency,
    ticker,
    fiatFormatter,
  ]);

  const maxRefreshCount = 5;
  const refreshRate = DEPOSIT_CONFIG.refreshRate || DEFAULT_REFRESH_RATE;

  const willRefresh = useMemo(
    () => shouldRefreshQuote(false, quotesRefreshCount, maxRefreshCount, false),
    [quotesRefreshCount],
  );

  const isExpired = useMemo(
    () => isQuoteExpired(willRefresh, refreshRate, quoteFetchedTime),
    [willRefresh, refreshRate, quoteFetchedTime],
  );

  const arbitrumChainIdHex = toHex(parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10));
  const isDirectDeposit =
    selectedToken?.symbol === USDC_SYMBOL &&
    selectedToken?.chainId === arbitrumChainIdHex &&
    providerConfig.chainId === arbitrumChainIdHex;

  // Check if this is a same-chain swap (e.g., ETH -> USDC on Arbitrum)
  const isSameChainSwap =
    selectedToken?.symbol !== USDC_SYMBOL &&
    selectedToken?.chainId === arbitrumChainIdHex &&
    providerConfig.chainId === arbitrumChainIdHex;

  // Only need bridge for cross-chain transfers
  const needsBridge = !isDirectDeposit && !isSameChainSwap;

  DevLogger.log('[usePerpsDepositQuote] Deposit type check:', {
    isDirectDeposit,
    isSameChainSwap,
    needsBridge,
    tokenSymbol: selectedToken?.symbol,
    tokenChainId: selectedToken?.chainId,
    providerChainId: providerConfig.chainId,
    arbitrumChainIdHex,
    USDC_SYMBOL,
  });

  // Track previous values to detect changes
  const prevTokenRef = useRef<PerpsToken | undefined>(undefined);
  const prevAmountRef = useRef<string>('');

  // Reset state when token changes
  useEffect(() => {
    const tokenChanged =
      prevTokenRef.current?.address !== selectedToken?.address ||
      prevTokenRef.current?.chainId !== selectedToken?.chainId;

    if (tokenChanged && selectedToken) {
      DevLogger.log('[usePerpsDepositQuote] Token changed, resetting state', {
        prevToken: prevTokenRef.current,
        newToken: selectedToken,
        amount,
        needsBridge,
      });

      // Reset quote state
      setHasQuoteFailed(false);
      setLocalQuoteFetchError(null);
      setQuoteFetchedTime(null);
      setQuotesRefreshCount(0);
      setBridgeQuote(null);

      // Set loading state if we have an amount and need a bridge quote
      const hasValidAmount = amount && amount !== '' && parseFloat(amount) > 0;
      if (needsBridge && hasValidAmount) {
        DevLogger.log(
          '[usePerpsDepositQuote] Setting network fee to calculating for new token',
        );
        setNetworkFee(
          strings('perps.deposit.calculating_fee') || 'Calculating...',
        );
        setIsLoading(true);

        // Clear any existing timeout
        if (bridgeQuoteTimeoutRef.current) {
          clearTimeout(bridgeQuoteTimeoutRef.current);
          bridgeQuoteTimeoutRef.current = null;
        }
      } else {
        setNetworkFee('-');
        setIsLoading(false);
      }
    }

    prevTokenRef.current = selectedToken;
  }, [selectedToken, amount, needsBridge]);

  // Parse amount once and validate
  const parsedAmount = useMemo(() => {
    DevLogger.log('[usePerpsDepositQuote] Parsing amount:', {
      amount,
      type: typeof amount,
    });
    // Be extra defensive about empty values
    if (!amount || amount === '' || amount === '.') {
      DevLogger.log('[usePerpsDepositQuote] Amount is empty or invalid');
      return null;
    }
    try {
      // Ensure we have a valid string
      const amountStr = String(amount).trim();
      if (!amountStr || amountStr === '' || amountStr === '.') {
        return null;
      }

      DevLogger.log(
        '[usePerpsDepositQuote] Creating BigNumber with:',
        amountStr,
      );
      const amountBN = new BigNumber(amountStr);
      DevLogger.log('[usePerpsDepositQuote] BigNumber created:', {
        isNaN: amountBN.isNaN(),
        value: amountBN.toString(),
      });

      if (amountBN.isNaN() || amountBN.lte(0)) {
        DevLogger.log('[usePerpsDepositQuote] Amount is NaN or <= 0');
        return null;
      }

      return amountBN;
    } catch (error) {
      DevLogger.log('[usePerpsDepositQuote] BigNumber creation failed:', error);
      return null;
    }
  }, [amount]);

  // Handle same-chain swap case
  useEffect(() => {
    if (isSameChainSwap && parsedAmount && selectedToken) {
      DevLogger.log('[usePerpsDepositQuote] Same-chain swap detected:', {
        token: selectedToken.symbol,
        amount: parsedAmount.toString(),
      });

      // For same-chain swaps, estimate network fee
      // This is a placeholder - in production, you'd fetch actual swap quotes
      setNetworkFee('$5.00'); // Estimated swap gas fee
      setQuoteFetchedTime(Date.now());
      setIsLoading(false);
    }
  }, [isSameChainSwap, parsedAmount, selectedToken]);

  const calculateDirectFee = useCallback(async () => {
    const account = currentSelectedAccount.current;
    const chainId = currentProviderChainId.current;

    DevLogger.log('[usePerpsDepositQuote] calculateDirectFee called:', {
      isDirectDeposit,
      account,
      chainId,
      parsedAmount: parsedAmount?.toString(),
    });

    if (!isDirectDeposit || !account || !parsedAmount) {
      DevLogger.log('[usePerpsDepositQuote] Skipping direct fee calculation');
      // For bridge quotes, the fee will be set by the bridge quote processing
      // Don't reset it here
      if (!needsBridge) {
        setNetworkFee('-');
      }
      setQuoteFetchedTime(null);
      setBridgeQuote(null);
      setLocalQuoteFetchError(null);
      return;
    }

    try {
      setIsLoading(true);
      setLocalQuoteFetchError(null);

      const bridgeInfo = getBridgeInfo(false);
      const transactionParams = {
        from: account,
        to: bridgeInfo.contractAddress,
        value: '0x0',
        data: '0x',
      };

      const gasEstimates = await getTransaction1559GasFeeEstimates(
        transactionParams,
        chainId,
      );

      if (gasEstimates?.maxFeePerGas) {
        const estimatedGasLimit = new BigNumber(
          DEPOSIT_CONFIG.estimatedGasLimit,
        );
        DevLogger.log('[usePerpsDepositQuote] Creating gasFeeWei:', {
          maxFeePerGas: gasEstimates.maxFeePerGas,
          estimatedGasLimit: estimatedGasLimit.toString(),
        });
        const gasFeeWei = new BigNumber(gasEstimates.maxFeePerGas).times(
          estimatedGasLimit,
        );
        const gasFeeEth = gasFeeWei.div(1e18);

        // Always show fee in USD for consistency
        let formattedFee: string;
        const ethPrice = currentCurrencyRates.current?.ETH?.usdConversionRate;
        if (!ethPrice) {
          formattedFee = '-';
        } else {
          DevLogger.log('[usePerpsDepositQuote] Calculating fiat value:', {
            gasFeeEth: gasFeeEth.toString(),
            ethPrice,
          });
          const fiatValue = gasFeeEth.times(ethPrice);
          formattedFee = fiatValue.lt(0.01)
            ? `$${fiatValue.toFixed(4)}`
            : currentFiatFormatter.current(fiatValue);
        }
        setNetworkFee(formattedFee);
        setQuoteFetchedTime(Date.now());
      } else {
        setNetworkFee('-');
      }
    } catch (error) {
      DevLogger.log('Direct fee calculation error:', error);
      setNetworkFee('-');
      setLocalQuoteFetchError(strings('perps.deposit.quote_fetch_error'));
    } finally {
      setIsLoading(false);
    }
  }, [isDirectDeposit, parsedAmount, needsBridge]);

  // Only trigger direct fee calculation when necessary
  useEffect(() => {
    DevLogger.log('[usePerpsDepositQuote] Direct fee effect:', {
      isDirectDeposit,
      hasParsedAmount: !!parsedAmount,
      parsedAmountValue: parsedAmount?.toString(),
    });
    if (isDirectDeposit && parsedAmount) {
      calculateDirectFee();
    }
  }, [isDirectDeposit, parsedAmount, calculateDirectFee]);

  const updateBridgeQuoteParams = useCallback(async () => {
    const account = currentSelectedAccount.current;

    if (!needsBridge || !selectedToken || !account || !parsedAmount) {
      DevLogger.log(
        '[usePerpsDepositQuote] Skipping bridge update - missing params:',
        {
          needsBridge,
          hasSelectedToken: !!selectedToken,
          hasAccount: !!account,
          hasParsedAmount: !!parsedAmount,
        },
      );
      return;
    }

    DevLogger.log('[usePerpsDepositQuote] Starting bridge quote request:', {
      parsedAmount: parsedAmount.toString(),
      decimals: selectedToken.decimals,
      tokenSymbol: selectedToken.symbol,
      tokenAddress: selectedToken.address,
      tokenChainId: selectedToken.chainId,
      account,
    });

    // Ensure we never pass empty string to calcTokenValue
    const amountStr = parsedAmount.toString();
    if (!amountStr || amountStr === '' || amountStr === '0') {
      DevLogger.log(
        '[usePerpsDepositQuote] Invalid amount for normalization, skipping bridge update',
      );
      return;
    }

    let normalizedAmount: string;
    try {
      normalizedAmount = calcTokenValue(
        amountStr,
        selectedToken.decimals,
      ).toFixed(0);
      DevLogger.log(
        '[usePerpsDepositQuote] Normalized amount:',
        normalizedAmount,
      );
    } catch (error) {
      DevLogger.log('[usePerpsDepositQuote] calcTokenValue error:', error);
      setLocalQuoteFetchError(strings('perps.deposit.quote_fetch_error'));
      setIsLoading(false);
      return;
    }

    const srcChainId = getDecimalChainId(selectedToken.chainId);
    const destChainId = getDecimalChainId(
      toHex(parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10)),
    );

    const params: GenericQuoteRequest = {
      srcChainId,
      srcTokenAddress: selectedToken.address,
      destChainId,
      destTokenAddress: USDC_ARBITRUM_MAINNET_ADDRESS,
      srcTokenAmount: normalizedAmount,
      walletAddress: account,
      destWalletAddress: account,
      slippage: undefined, // Let it use default
      gasIncluded: false,
    };

    DevLogger.log('[usePerpsDepositQuote] Bridge quote request params:', {
      srcChainId,
      srcTokenAddress: selectedToken.address,
      destChainId,
      destTokenAddress: USDC_ARBITRUM_MAINNET_ADDRESS,
      srcTokenAmount: normalizedAmount,
      walletAddress: account,
      slippage: undefined,
      gasIncluded: false,
    });

    try {
      const context = {
        stx_enabled: false,
        token_symbol_source: selectedToken.symbol,
        token_symbol_destination: USDC_SYMBOL,
        security_warnings: [],
      };

      DevLogger.log(
        '[usePerpsDepositQuote] Calling updateBridgeQuoteRequestParams...',
      );
      await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
        params,
        context,
      );
      DevLogger.log(
        '[usePerpsDepositQuote] updateBridgeQuoteRequestParams completed successfully',
      );

      setQuotesRefreshCount((prev) => {
        const newCount = prev + 1;
        DevLogger.log(
          '[usePerpsDepositQuote] Quote refresh count updated:',
          newCount,
        );
        return newCount;
      });
    } catch (error) {
      DevLogger.log(
        '[usePerpsDepositQuote] Update bridge params error:',
        error,
      );
      setLocalQuoteFetchError(strings('perps.deposit.quote_fetch_error'));
      setIsLoading(false);
    }
  }, [needsBridge, selectedToken, parsedAmount]);

  const debouncedUpdateBridgeParams = useMemo(
    () => debounce(updateBridgeQuoteParams, DEBOUNCE_WAIT),
    [updateBridgeQuoteParams],
  );

  useEffect(() => {
    DevLogger.log('[usePerpsDepositQuote] Bridge params effect:', {
      needsBridge,
      isSameChainSwap,
      hasParsedAmount: !!parsedAmount,
      parsedAmountValue: parsedAmount?.toString(),
      hasQuoteFailed,
      parsedAmountGt0: parsedAmount?.gt(0),
    });

    // Check if amount changed
    const amountChanged = prevAmountRef.current !== amount;
    if (amountChanged && amount && hasQuoteFailed) {
      DevLogger.log(
        '[usePerpsDepositQuote] Amount changed, resetting error state',
      );
      setHasQuoteFailed(false);
      setLocalQuoteFetchError(null);
    }
    prevAmountRef.current = amount;

    if (needsBridge && parsedAmount?.gt(0) && !hasQuoteFailed) {
      DevLogger.log(
        '[usePerpsDepositQuote] Setting loading state for bridge quote fetch',
      );
      setIsLoading(true);
      setNetworkFee(
        strings('perps.deposit.calculating_fee') || 'Calculating...',
      );
      debouncedUpdateBridgeParams();

      // Set timeout for bridge quote fetching
      bridgeQuoteTimeoutRef.current = setTimeout(() => {
        DevLogger.log('[usePerpsDepositQuote] Bridge quote timeout reached');
        setLocalQuoteFetchError(strings('perps.deposit.bridge_quote_timeout'));
        setNetworkFee('-');
        setIsLoading(false);
        setHasQuoteFailed(true);
      }, BRIDGE_QUOTE_TIMEOUT);
    } else if (!needsBridge) {
      // Clear bridge-related state when switching to direct deposit
      debouncedUpdateBridgeParams.cancel();
      setBridgeQuote(null);
      if (bridgeQuoteTimeoutRef.current) {
        clearTimeout(bridgeQuoteTimeoutRef.current);
        bridgeQuoteTimeoutRef.current = null;
      }
    }

    return () => {
      debouncedUpdateBridgeParams.cancel();
      if (bridgeQuoteTimeoutRef.current) {
        clearTimeout(bridgeQuoteTimeoutRef.current);
        bridgeQuoteTimeoutRef.current = null;
      }
    };
  }, [
    needsBridge,
    parsedAmount,
    debouncedUpdateBridgeParams,
    hasQuoteFailed,
    isSameChainSwap,
    amount,
  ]);

  // Process bridge quotes from controller state
  useEffect(() => {
    DevLogger.log('[usePerpsDepositQuote] Bridge quote processing effect:', {
      needsBridge,
      hasBridgeControllerState: !!bridgeControllerState,
      bridgeStateKeys: bridgeControllerState
        ? Object.keys(bridgeControllerState)
        : [],
    });

    if (!needsBridge) {
      DevLogger.log(
        '[usePerpsDepositQuote] Direct deposit - skipping bridge quote processing',
      );
      return;
    }

    const { quotes, quoteFetchError } = bridgeControllerState || {};

    DevLogger.log('[usePerpsDepositQuote] Bridge controller quotes:', {
      hasQuotes: !!quotes,
      quotesCount: quotes ? Object.keys(quotes).length : 0,
      quoteFetchError,
      quotesRefreshCount,
      quotesKeys: quotes ? Object.keys(quotes) : [],
      bridgeControllerState: bridgeControllerState
        ? Object.keys(bridgeControllerState)
        : [],
    });

    if (quotes && Object.keys(quotes).length > 0) {
      DevLogger.log('[usePerpsDepositQuote] Processing bridge quotes:', quotes);
      // Find the recommended quote (first one in this simple implementation)
      const recommendedQuote = Object.values(
        quotes,
      )[0] as BridgeQuoteWithMetadata;

      if (recommendedQuote) {
        DevLogger.log('[usePerpsDepositQuote] Using recommended quote:', {
          quote: recommendedQuote,
          hasQuote: !!recommendedQuote.quote,
          destTokenAmount: recommendedQuote.quote?.destTokenAmount,
          totalNetworkFee: recommendedQuote.totalNetworkFee,
          estimatedProcessingTime:
            recommendedQuote.estimatedProcessingTimeInSeconds,
        });

        setBridgeQuote(recommendedQuote);

        let feeStr = '-';

        // Try different possible fee locations in the quote
        const totalNetworkFee =
          recommendedQuote.totalNetworkFee ||
          recommendedQuote.quote?.totalNetworkFee ||
          (recommendedQuote as BridgeQuoteWithMetadata).networkFee;

        DevLogger.log('[usePerpsDepositQuote] Network fee extraction:', {
          totalNetworkFee,
          hasAmount: totalNetworkFee?.amount,
          hasValueInCurrency: totalNetworkFee?.valueInCurrency,
          hasUsd: (totalNetworkFee as { usd?: string | null })?.usd,
          recommendedQuoteKeys: Object.keys(recommendedQuote || {}),
        });

        if (totalNetworkFee) {
          // Handle different fee structures
          const feeAmount = totalNetworkFee.amount;
          const feeValueInCurrency =
            totalNetworkFee.valueInCurrency ||
            (totalNetworkFee as { usd?: string | null })?.usd;

          if (feeAmount && feeValueInCurrency) {
            try {
              DevLogger.log('[usePerpsDepositQuote] Processing fee:', {
                feeAmount,
                feeValueInCurrency,
                primaryCurrency: currentPrimaryCurrency.current,
                ticker: currentTicker.current,
              });

              // Always use USD value if available
              if (feeValueInCurrency) {
                const valueBN = new BigNumber(feeValueInCurrency);
                feeStr = currentFiatFormatter.current(valueBN);
                DevLogger.log(
                  '[usePerpsDepositQuote] Formatted USD fee:',
                  feeStr,
                );
              } else if (feeAmount) {
                // If no USD value, convert ETH to USD
                const amountBN = new BigNumber(feeAmount);
                const ethPrice =
                  currentCurrencyRates.current?.ETH?.usdConversionRate;
                if (ethPrice) {
                  const fiatValue = amountBN.times(ethPrice);
                  feeStr = currentFiatFormatter.current(fiatValue);
                } else {
                  feeStr = '-';
                }
              }
            } catch (error) {
              DevLogger.log(
                '[usePerpsDepositQuote] Fee formatting error:',
                error,
              );
              feeStr = '-';
            }
          } else if (feeAmount === '0' || feeValueInCurrency === '0') {
            // Fee is explicitly 0
            feeStr = '$0.00';
            DevLogger.log('[usePerpsDepositQuote] Zero fee');
          } else {
            DevLogger.log('[usePerpsDepositQuote] Incomplete fee data:', {
              feeAmount,
              feeValueInCurrency,
            });
            feeStr = '-';
          }
        } else {
          // If no fee data is available, check if it might be in feeData
          const feeData = recommendedQuote.quote?.feeData;
          if (feeData) {
            DevLogger.log(
              '[usePerpsDepositQuote] Found feeData in quote:',
              feeData,
            );
            // Try to extract fee from feeData structure
            const metabridgeFee = feeData.metabridge;
            if (metabridgeFee?.amount) {
              try {
                const feeSymbol =
                  metabridgeFee.asset?.symbol || currentTicker.current || 'ETH';
                const feeDecimals = metabridgeFee.asset?.decimals || 18;
                DevLogger.log(
                  '[usePerpsDepositQuote] Using metabridge fee:',
                  metabridgeFee.amount,
                  feeSymbol,
                  'decimals:',
                  feeDecimals,
                );

                // Convert from smallest unit to human-readable value
                const feeAmountBN = new BigNumber(metabridgeFee.amount).div(
                  Math.pow(10, feeDecimals),
                );

                // Try to get token price from asset metadata or currency rates
                let tokenPrice: number | undefined;

                // First check if the asset has price information in metadata
                const assetWithPrice = metabridgeFee.asset as {
                  price?: string;
                  symbol?: string;
                  decimals?: number;
                };
                if (assetWithPrice?.price) {
                  tokenPrice = parseFloat(assetWithPrice.price);
                  DevLogger.log(
                    '[usePerpsDepositQuote] Using price from asset metadata:',
                    tokenPrice,
                  );
                } else {
                  // Fallback to currency rates
                  const rateData = currentCurrencyRates.current?.[feeSymbol];
                  if (rateData?.usdConversionRate) {
                    tokenPrice = rateData.usdConversionRate;
                    DevLogger.log(
                      '[usePerpsDepositQuote] Using price from currency rates:',
                      tokenPrice,
                    );
                  }
                }

                if (tokenPrice) {
                  const fiatValue = feeAmountBN.times(tokenPrice);
                  DevLogger.log('[usePerpsDepositQuote] Fee calculation:', {
                    feeAmount: metabridgeFee.amount,
                    feeDecimals,
                    feeAmountBN: feeAmountBN.toString(),
                    tokenPrice,
                    fiatValue: fiatValue.toString(),
                  });
                  // Show more precision for very small fees
                  if (fiatValue.lt(0.01) && fiatValue.gt(0)) {
                    feeStr = `$${fiatValue.toFixed(4)}`;
                  } else {
                    feeStr = currentFiatFormatter.current(fiatValue);
                  }
                } else {
                  // If no USD price available, show the amount with symbol
                  DevLogger.log(
                    '[usePerpsDepositQuote] No price data available for:',
                    feeSymbol,
                  );
                  feeStr = `${feeAmountBN.toFixed(4)} ${feeSymbol}`;
                }
              } catch (error) {
                DevLogger.log(
                  '[usePerpsDepositQuote] Error processing metabridge fee:',
                  error,
                );
                feeStr = '-';
              }
            }
          } else {
            DevLogger.log(
              '[usePerpsDepositQuote] No network fee data found in quote',
            );
            feeStr = '-';
          }
        }
        setNetworkFee(feeStr);
        setQuoteFetchedTime(Date.now());
        setIsLoading(false);

        // Clear timeout since we got quotes
        if (bridgeQuoteTimeoutRef.current) {
          clearTimeout(bridgeQuoteTimeoutRef.current);
          bridgeQuoteTimeoutRef.current = null;
        }
      }
    } else if (quoteFetchError) {
      DevLogger.log(
        '[usePerpsDepositQuote] Bridge quote fetch error:',
        quoteFetchError,
      );
      setLocalQuoteFetchError(quoteFetchError);
      setNetworkFee('-');
      setIsLoading(false);

      // Clear timeout on error
      if (bridgeQuoteTimeoutRef.current) {
        clearTimeout(bridgeQuoteTimeoutRef.current);
        bridgeQuoteTimeoutRef.current = null;
      }
    } else if (quotes && Object.keys(quotes).length === 0) {
      DevLogger.log(
        '[usePerpsDepositQuote] No bridge quotes available - checking loading status',
      );
      // Don't immediately set error - quotes might be temporarily cleared during refresh
      // Only set error if we're not loading and haven't already processed a quote
      const loadingStatus = bridgeControllerState?.quotesLoadingStatus;
      DevLogger.log('[usePerpsDepositQuote] Loading status:', {
        loadingStatus,
        quotesLastFetched: bridgeControllerState?.quotesLastFetched,
        quotesInitialLoadTime: bridgeControllerState?.quotesInitialLoadTime,
      });

      // Check if loading is complete - status 0 or null both indicate not loading
      // Also check if we've been waiting for quotes for a while
      const hasBeenWaiting = quotesRefreshCount > 0 && !quoteFetchError;

      // Don't set error if we already have a network fee (meaning we processed a quote before)
      const hasProcessedQuote =
        networkFee &&
        networkFee !== '-' &&
        networkFee !== strings('perps.deposit.calculating_fee');

      if (
        (loadingStatus === 0 ||
          loadingStatus === null ||
          loadingStatus === undefined) &&
        hasBeenWaiting &&
        !hasQuoteFailed &&
        !isLoading &&
        !hasProcessedQuote
      ) {
        // Loading is complete but no quotes found - only set failure once
        DevLogger.log(
          '[usePerpsDepositQuote] Bridge loading complete but no quotes found',
        );
        setLocalQuoteFetchError(strings('perps.deposit.no_quotes_available'));
        setNetworkFee('-');
        setIsLoading(false);
        setHasQuoteFailed(true);

        // Clear timeout since we got a response (even if empty)
        if (bridgeQuoteTimeoutRef.current) {
          clearTimeout(bridgeQuoteTimeoutRef.current);
          bridgeQuoteTimeoutRef.current = null;
        }
      }
      // Otherwise quotes might still be loading or we already have a quote
    }
  }, [
    needsBridge,
    bridgeControllerState,
    quotesRefreshCount,
    hasQuoteFailed,
    isLoading,
    networkFee,
  ]);

  const refreshQuote = useCallback(() => {
    setQuoteFetchedTime(null);
    setQuotesRefreshCount(0);
    setBridgeQuote(null);
    setLocalQuoteFetchError(null);
    setNetworkFee('-');
    if (isDirectDeposit) {
      calculateDirectFee();
    } else {
      setIsLoading(true);
      updateBridgeQuoteParams();
    }
  }, [isDirectDeposit, calculateDirectFee, updateBridgeQuoteParams]);

  const hasValidQuote = useMemo(() => {
    if (
      !quoteFetchedTime ||
      networkFee === strings('perps.deposit.calculating_fee')
    ) {
      return false;
    }
    // Consider it valid if we have a quote, even if fee is not available
    return parsedAmount !== null && (bridgeQuote !== null || isDirectDeposit);
  }, [
    quoteFetchedTime,
    networkFee,
    parsedAmount,
    bridgeQuote,
    isDirectDeposit,
  ]);

  // Auto-refresh when expired and can refresh
  useEffect(() => {
    if (isExpired && willRefresh && hasValidQuote) {
      const timer = setTimeout(refreshQuote, 1000);
      return () => clearTimeout(timer);
    }
  }, [isExpired, willRefresh, hasValidQuote, refreshQuote]);

  // Ensure network fee shows "Calculating..." when loading
  useEffect(() => {
    if (isLoading && parsedAmount?.gt(0)) {
      const calculatingText =
        strings('perps.deposit.calculating_fee') || 'Calculating...';
      DevLogger.log(
        '[usePerpsDepositQuote] Ensuring network fee shows calculating state',
      );
      setNetworkFee(calculatingText);
    }
  }, [isLoading, parsedAmount]);

  const formattedQuoteData: FormattedQuoteData = useMemo(() => {
    let estimatedTime = '';
    let receivingAmount = '0.00 USDC';
    let exchangeRate: string | undefined;

    DevLogger.log(
      '[usePerpsDepositQuote] FormattedQuoteData - parsedAmount:',
      parsedAmount?.toString(),
    );
    DevLogger.log(
      '[usePerpsDepositQuote] FormattedQuoteData - networkFee:',
      networkFee,
    );
    DevLogger.log(
      '[usePerpsDepositQuote] FormattedQuoteData - isDirectDeposit:',
      isDirectDeposit,
    );
    DevLogger.log(
      '[usePerpsDepositQuote] FormattedQuoteData - isSameChainSwap:',
      isSameChainSwap,
    );
    DevLogger.log(
      '[usePerpsDepositQuote] FormattedQuoteData - hasQuoteFailed:',
      hasQuoteFailed,
    );
    DevLogger.log(
      '[usePerpsDepositQuote] FormattedQuoteData - localQuoteFetchError:',
      localQuoteFetchError,
    );

    const depositAmount = parsedAmount || new BigNumber(0);
    DevLogger.log(
      '[usePerpsDepositQuote] FormattedQuoteData - depositAmount:',
      depositAmount.toString(),
    );

    // Use the network fee as-is (it will already be "Calculating..." if needed)
    // If there's an error, keep showing the fee as unavailable
    const displayNetworkFee =
      hasQuoteFailed || localQuoteFetchError ? '-' : networkFee;

    if (depositAmount.lte(0)) {
      return {
        networkFee: displayNetworkFee,
        estimatedTime,
        receivingAmount,
        exchangeRate,
      };
    }

    // Step 1: Calculate the USD value of the source token
    let usdValue = new BigNumber(0);

    if (selectedToken?.symbol === USDC_SYMBOL) {
      // Direct USDC - already in USD
      usdValue = depositAmount;
    } else if (selectedToken?.symbol) {
      // Convert any other token to USD using exchange rates
      const tokenRate =
        currentCurrencyRates.current?.[selectedToken.symbol]?.usdConversionRate;

      if (tokenRate && !isNaN(Number(tokenRate)) && Number(tokenRate) > 0) {
        usdValue = depositAmount.times(new BigNumber(String(tokenRate)));

        // Set exchange rate for display
        try {
          const rate = new BigNumber(String(tokenRate));
          exchangeRate = `1 ${selectedToken.symbol} ≈ ${rate.toFixed(2)} USDC`;
        } catch (error) {
          DevLogger.log(
            '[usePerpsDepositQuote] Exchange rate formatting error:',
            error,
          );
        }
      } else {
        DevLogger.log(
          '[usePerpsDepositQuote] No exchange rate found for token:',
          selectedToken.symbol,
        );
        return {
          networkFee,
          estimatedTime,
          receivingAmount: '0.00 USDC',
          exchangeRate: undefined,
        };
      }
    }

    DevLogger.log(
      '[usePerpsDepositQuote] USD value of deposit:',
      usdValue.toString(),
    );

    // Step 2: Deduct fees from USD value
    let totalFeesUSD = new BigNumber(0);

    // Parse network fee if available
    if (
      networkFee &&
      networkFee !== '-' &&
      networkFee !== strings('perps.deposit.calculating_fee')
    ) {
      const feeMatch = networkFee.match(/\$([\d.]+)/);
      if (feeMatch?.[1]) {
        totalFeesUSD = totalFeesUSD.plus(new BigNumber(feeMatch[1]));
      }
    }

    // Add MetaMask fee (if applicable)
    // MetaMask fee is currently $0.00 - will be implemented later
    // const metamaskFeeMatch = METAMASK_DEPOSIT_FEE.match(/\$([\d.]+)/);
    // if (metamaskFeeMatch?.[1]) {
    //   totalFeesUSD = totalFeesUSD.plus(new BigNumber(metamaskFeeMatch[1]));
    // }

    DevLogger.log(
      '[usePerpsDepositQuote] Total fees in USD:',
      totalFeesUSD.toString(),
    );

    // Step 3: Calculate final receiving amount based on route type
    if (bridgeQuote?.quote?.destTokenAmount) {
      // For bridge quotes, use the quote's destination amount (already accounts for conversion and bridge fees)
      try {
        const destAmountBN = new BigNumber(bridgeQuote.quote.destTokenAmount);
        receivingAmount = `${destAmountBN.div(1e6).toFixed(2)} USDC`;

        estimatedTime = bridgeQuote.estimatedProcessingTimeInSeconds
          ? `${Math.ceil(
              bridgeQuote.estimatedProcessingTimeInSeconds / 60,
            )} minutes`
          : '';
      } catch (error) {
        DevLogger.log(
          '[usePerpsDepositQuote] Error parsing bridge destination amount:',
          error,
        );
        receivingAmount = '0.00 USDC';
      }
    } else {
      // For direct deposits and same-chain swaps, calculate from USD value minus fees
      const finalAmount = usdValue.minus(totalFeesUSD);

      if (finalAmount.gt(0)) {
        // Show more precision for very small amounts
        if (finalAmount.lt(0.01) && finalAmount.gt(0)) {
          receivingAmount = `${finalAmount.toFixed(6)} USDC`;
        } else if (finalAmount.gte(1000000)) {
          // For very large amounts, preserve original precision to avoid rounding
          receivingAmount = `${finalAmount.toString()} USDC`;
        } else {
          receivingAmount = `${finalAmount.toFixed(2)} USDC`;
        }
      } else {
        receivingAmount = '0.00 USDC';
      }

      // Set estimated time based on transaction type
      if (isDirectDeposit) {
        estimatedTime = DEPOSIT_CONFIG.estimatedTime.directDeposit;
      } else if (isSameChainSwap) {
        estimatedTime = DEPOSIT_CONFIG.estimatedTime.sameChainSwap;
      }
    }

    DevLogger.log('[usePerpsDepositQuote] Final calculation:', {
      usdValue: usdValue.toString(),
      totalFeesUSD: totalFeesUSD.toString(),
      receivingAmount,
      estimatedTime,
      exchangeRate,
    });

    return {
      networkFee: displayNetworkFee,
      estimatedTime,
      receivingAmount,
      exchangeRate,
    };
  }, [
    parsedAmount,
    isDirectDeposit,
    isSameChainSwap,
    bridgeQuote,
    selectedToken,
    networkFee,
    hasQuoteFailed,
    localQuoteFetchError,
  ]);

  const result = {
    formattedQuoteData,
    isLoading,
    quoteFetchError: localQuoteFetchError,
    quoteFetchedTime,
    isExpired,
    willRefresh,
    refreshQuote,
    hasValidQuote,
    bridgeQuote,
  };

  DevLogger.log('[usePerpsDepositQuote] ===== HOOK RENDER END =====', {
    networkFee: formattedQuoteData.networkFee,
    isLoading,
    hasValidQuote,
    parsedAmount: parsedAmount?.toString(),
  });

  return result;
};
