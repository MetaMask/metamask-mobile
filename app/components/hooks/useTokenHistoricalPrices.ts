import { useState, useEffect } from 'react';

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
  timePeriod: '1d' | '1w' | '7d' | '1m' | '3m' | '1y' | '3y';
  from?: number | undefined;
  to?: number | undefined;
  vsCurrency: string;
}): {
  prices: TokenPrice[] | undefined;
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
        const fromTo = from && to ? `&from=${from}&to=${to}` : '';
        const uri = `${baseUri}/chains/${chainId}/historical-prices/${address}?timePeriod=${
          timePeriod === '1w' ? '7d' : timePeriod
        }&vsCurrency=${vsCurrency}${fromTo}`;
        const response = await fetch(uri);
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
  return { prices, isLoading, error };
};

export default useTokenHistoricalPrices;
