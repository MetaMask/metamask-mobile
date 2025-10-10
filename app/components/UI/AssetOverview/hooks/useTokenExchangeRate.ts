import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Hex, CaipChainId } from '@metamask/utils';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import {
  exchangeRateFromMarketData,
  getTokenExchangeRate,
} from '../../Bridge/utils/exchange-rates';
import { selectNativeCurrencyByChainId } from '../../../../selectors/networkController';
import { RootState } from '../../../../reducers';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';

/**
 * Hook to fetch exchange rate for a token.
 * First checks allTokenMarketData (for imported tokens),
 * then fetches from API if not found (for non-imported/search tokens)
 *
 * @param chainId - The chainId of the token
 * @param tokenAddress - The address of the token
 * @param currencyOverride - Optional currency override (defaults to user's selected currency)
 * @returns Object containing the exchange rate and loading state
 */
export const useTokenExchangeRate = ({
  chainId,
  tokenAddress,
  currencyOverride,
}: {
  chainId?: Hex | CaipChainId;
  tokenAddress?: string;
  currencyOverride?: string;
}) => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const allTokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const nativeCurrency = useSelector((state: RootState) =>
    chainId ? selectNativeCurrencyByChainId(state, chainId as Hex) : undefined,
  );
  const [fetchedRate, setFetchedRate] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const currency = currencyOverride ?? currentCurrency;

  // Check if this is a non-EVM chain (e.g., Solana)
  const isNonEvm = chainId ? isNonEvmChainId(chainId) : false;

  // Get the native asset's conversion rate to fiat (e.g., ETH -> USD rate)
  // Only needed for EVM chains
  const nativeAssetConversionRate =
    nativeCurrency && currencyRates?.[nativeCurrency]?.conversionRate;

  // First, try to get exchange rate from allTokenMarketData (for imported tokens)
  const marketDataRate =
    chainId && tokenAddress
      ? exchangeRateFromMarketData(chainId, tokenAddress, allTokenMarketData)
      : undefined;

  // Fetch exchange rate from API if not found in marketData
  useEffect(() => {
    const fetchRate = async () => {
      // Skip if we already have rate from marketData or missing required params
      if (marketDataRate !== undefined || !chainId || !tokenAddress) {
        return;
      }

      // For EVM chains, we need the native asset conversion rate
      // For non-EVM chains, we can fetch directly
      if (!isNonEvm && !nativeAssetConversionRate) {
        return;
      }

      setIsLoading(true);
      try {
        // Fetch token price in fiat currency (e.g., USD)
        const tokenFiatPrice = await getTokenExchangeRate({
          chainId,
          tokenAddress,
          currency,
        });

        if (tokenFiatPrice) {
          if (isNonEvm) {
            // For non-EVM chains (Solana, etc.), the API returns fiat price directly
            // Return as-is, no conversion needed
            setFetchedRate(tokenFiatPrice);
          } else if (nativeAssetConversionRate) {
            // For EVM chains, convert to price relative to native asset
            // Example: If token is $100 and ETH is $3000, then token = 100/3000 = 0.0333 ETH
            const tokenPriceInNativeAsset =
              tokenFiatPrice / nativeAssetConversionRate;
            setFetchedRate(tokenPriceInNativeAsset);
          } else {
            // Should not reach here due to guard above, but handle gracefully
            setFetchedRate(undefined);
          }
        } else {
          setFetchedRate(undefined);
        }
      } catch (error) {
        console.error('Failed to fetch token exchange rate:', error);
        setFetchedRate(undefined);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRate();
  }, [
    chainId,
    tokenAddress,
    currency,
    marketDataRate,
    nativeAssetConversionRate,
    isNonEvm,
  ]);

  // Return marketData rate if available, otherwise return fetched rate
  return {
    exchangeRate: marketDataRate ?? fetchedRate,
    isLoading,
  };
};
