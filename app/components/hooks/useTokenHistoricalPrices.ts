import { useState, useEffect } from 'react';

export type TimePeriod = '1d' | '1w' | '7d' | '1m' | '3m' | '1y' | '3y';

export type TokenPrice = [string, number];

const placeholderPrices = Array(289).fill(['0', 0] as TokenPrice);
const useTokenHistoricalPrices = ({
  address,
  chainId,
  timePeriod,
  from,
  to,
  vsCurrency,
}: {
  address: string;
  chainId: string;
  timePeriod: TimePeriod;
  from?: number | undefined;
  to?: number | undefined;
  vsCurrency: string;
}): {
  data: TokenPrice[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
} => {
  const [prices, setPrices] = useState<TokenPrice[]>(placeholderPrices);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  useEffect(() => {
    const fetchPrices = async () => {
      setIsLoading(true);
      try {
        const baseUri = 'https://price-api.metafi.codefi.network/v1';
        const uri = new URL(
          `${baseUri}/chains/${chainId}/historical-prices/${address}`,
        );
        uri.searchParams.set(
          'timePeriod',
          timePeriod === '1w' ? '7d' : timePeriod,
        );
        uri.searchParams.set('vsCurrency', vsCurrency);
        if (from && to) {
          uri.searchParams.set('from', from.toString());
          uri.searchParams.set('to', to.toString());
        }

        const response = await fetch(uri.toString());
        const data: { prices: TokenPrice[] } = await response.json();

        setPrices(data.prices as TokenPrice[]);
      } catch (e: any) {
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrices();
  }, [address, chainId, timePeriod, from, to, vsCurrency]);
  return { data: prices, isLoading, error };
};

export default useTokenHistoricalPrices;
