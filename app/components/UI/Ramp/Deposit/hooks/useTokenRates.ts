import { useState, useEffect } from 'react';
import { handleFetch } from '@metamask/controller-utils';
import { DepositCryptoCurrency, DepositFiatCurrency } from '../constants';

interface UseFetchTokenRatesMultiResult {
  rates: Record<string, number | null>;
  isLoading: boolean;
  error: Error | null;
}

export const useFetchTokenRatesMulti = ({
  tokens,
  fiatCurrency,
}: {
  tokens: DepositCryptoCurrency[];
  fiatCurrency: DepositFiatCurrency;
}): UseFetchTokenRatesMultiResult => {
  const [rates, setRates] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTokenRates = async () => {
      setIsLoading(true);
      try {
        const assetIds = tokens.map((token) => token.assetId).join(',');
        const baseUrl = 'https://price.api.cx.metamask.io/v3/spot-prices';
        const url = new URL(baseUrl);
        const params = new URLSearchParams({
          assetIds,
          vsCurrency: fiatCurrency.id,
        });
        url.search = params.toString();

        const response = (await handleFetch(url.toString())) as Record<
          string,
          { [key: string]: number }
        >;

        const newRates: Record<string, number | null> = {};

        tokens.forEach((token) => {
          const responseKey = Object.keys(response).find(
            (key) => key.toLowerCase() === token.assetId.toLowerCase(),
          );
          newRates[token.symbol] = responseKey
            ? response[responseKey][fiatCurrency.id.toLowerCase()]
            : null;
        });

        setRates(newRates);
      } catch (e) {
        setError(
          e instanceof Error ? e : new Error('Failed to fetch token rates'),
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenRates();
  }, [tokens, fiatCurrency.id]);

  return { rates, isLoading, error };
};

export default useFetchTokenRatesMulti;
