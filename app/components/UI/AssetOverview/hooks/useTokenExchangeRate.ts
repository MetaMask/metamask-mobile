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

  // Get the native asset's conversion rate to fiat (e.g., ETH -> USD rate)
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
      if (
        marketDataRate !== undefined ||
        !chainId ||
        !tokenAddress ||
        !nativeAssetConversionRate
      ) {
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
          // Convert to price relative to native asset
          // Example: If token is $100 and ETH is $3000, then token = 100/3000 = 0.0333 ETH
          const tokenPriceInNativeAsset =
            tokenFiatPrice / nativeAssetConversionRate;
          setFetchedRate(tokenPriceInNativeAsset);
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
  ]);

  // Return marketData rate if available, otherwise return fetched rate
  return {
    exchangeRate: marketDataRate ?? fetchedRate,
    isLoading,
  };
};
