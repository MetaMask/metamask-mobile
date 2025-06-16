import { useState, useEffect } from 'react';
import { handleFetch } from '@metamask/controller-utils';
import { DepositCryptoCurrency, DepositFiatCurrency } from '../constants';

interface UseTokenRatesMultiResult {
  rates: Record<string, number | null>;
  isLoading: boolean;
  error: Error | null;
}

export const useTokenRatesMulti = ({
  tokens,
  fiatCurrency,
}: {
  tokens: DepositCryptoCurrency[];
  fiatCurrency: DepositFiatCurrency;
}): UseTokenRatesMultiResult => {
  const [rates, setRates] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTokenRates = async () => {
      setIsLoading(true);
      try {
        const assetIds = tokens
          .map(
            (token) =>
              `eip155:${
                token.chainId.split(':')[1]
              }/erc20:${token.address.toLowerCase()}`,
          )
          .join(',');

        const priceUrl = `https://price.api.cx.metamask.io/v3/spot-prices?assetIds=${assetIds}&vsCurrency=${fiatCurrency.id}`;

        const response = (await handleFetch(priceUrl)) as Record<
          string,
          { [key: string]: number }
        >;

        const newRates: Record<string, number | null> = {};
        tokens.forEach((token) => {
          const assetId = `eip155:${
            token.chainId.split(':')[1]
          }/erc20:${token.address.toLowerCase()}`;
          newRates[token.symbol] =
            response[assetId]?.[fiatCurrency.id.toLowerCase()] ?? null;
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

export default useTokenRatesMulti;
