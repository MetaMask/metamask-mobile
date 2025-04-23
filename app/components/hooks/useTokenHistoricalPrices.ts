import { CaipAssetId, Hex } from '@metamask/utils';
import { getDecimalChainId } from '../../util/networks';
import { useState, useEffect } from 'react';
import { selectMultichainHistoricalPrices } from '../../selectors/multichain';
import { useSelector } from 'react-redux';
import { selectIsEvmNetworkSelected } from '../../selectors/multichainNetworkController';
import Engine from '../../core/Engine';
import { TokenI } from '../UI/Tokens/types';

export type TimePeriod = '1d' | '1w' | '7d' | '1m' | '3m' | '1y' | '3y';

export type TokenPrice = [string, number];

const placeholderPrices = Array(289).fill(['0', 0] as TokenPrice);

export const standardizeTimeInterval = (timePeriod: TimePeriod) => {
  switch (timePeriod) {
    case '1d':
      return 'P1D';
    case '1w':
      return 'P7D';
    case '7d':
      return 'P7D';
    case '1m':
      return 'P1M';
    case '3m':
      return 'P3M';
    case '1y':
      return 'P1Y';
    case '3y':
      return 'P3Y';
    default:
      return 'P1D';
  }
};

const useTokenHistoricalPrices = ({
  asset,
  address,
  chainId,
  timePeriod,
  from,
  to,
  vsCurrency,
}: {
  asset: TokenI;
  address: string;
  chainId: Hex;
  timePeriod: TimePeriod;
  from?: number | undefined;
  to?: number | undefined;
  vsCurrency: string;
}): {
  data: TokenPrice[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
} => {
  const multichainHistoricalPrices = useSelector(
    selectMultichainHistoricalPrices,
  );
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const [prices, setPrices] = useState<TokenPrice[]>(placeholderPrices);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const fetchPrices = async () => {
      setIsLoading(true);
      try {
        if (!isEvmSelected) {
          const caip19Address = asset.address as CaipAssetId;
          const standardizedTimeInterval = standardizeTimeInterval(timePeriod);

          await Engine.context.MultichainAssetsRatesController.fetchHistoricalPricesForAsset(
            caip19Address,
          );
          const result =
            multichainHistoricalPrices[caip19Address][vsCurrency].intervals[
              standardizedTimeInterval
            ];

          // Transform to ensure first value is string and second is number with max precision
          const transformedResult = result.map(
            ([timestamp, price]) =>
              [timestamp.toString(), Number(price)] as TokenPrice,
          );
          setPrices(transformedResult);
        } else {
          const baseUri = 'https://price.api.cx.metamask.io/v1';
          const uri = new URL(
            `${baseUri}/chains/${getDecimalChainId(
              chainId,
            )}/historical-prices/${address}`,
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
        }
      } catch (e: unknown) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrices();
  }, [
    address,
    chainId,
    timePeriod,
    from,
    to,
    vsCurrency,
    isEvmSelected,
    asset.address,
    multichainHistoricalPrices,
  ]);

  return { data: prices, isLoading, error };
};

export default useTokenHistoricalPrices;
