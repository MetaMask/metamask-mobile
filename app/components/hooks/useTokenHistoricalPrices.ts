import { Hex } from '@metamask/utils';
import { getDecimalChainId } from '../../util/networks';
import { useState, useEffect } from 'react';
import { TraceName, endTrace, trace } from '../../util/trace';
import { TokenI } from '../UI/Tokens/types';
import { formatChainIdToCaip } from '@metamask/bridge-controller';

export type TimePeriod = '1d' | '1w' | '7d' | '1m' | '3m' | '1y' | '3y' | 'all';

export type TokenPrice = [string, number];

const placeholderPrices = Array(289).fill(['0', 0] as TokenPrice);

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
  const resultChainId = formatChainIdToCaip(asset.chainId as Hex);
  const isNonEvmAsset = resultChainId === asset.chainId;
  const [prices, setPrices] = useState<TokenPrice[]>(placeholderPrices);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const fetchPrices = async () => {
      setIsLoading(true);

      try {
        const baseUri = 'https://price.api.cx.metamask.io/v3';

        let caipChainId: string;
        let assetIdentifier: string;

        if (isNonEvmAsset) {
          caipChainId = asset.chainId as string;
          assetIdentifier = asset.address.split('/')[1];
        } else {
          caipChainId = `eip155:${getDecimalChainId(chainId)}`;
          assetIdentifier = `erc20:${address}`;
        }

        const uri = new URL(
          `${baseUri}/historical-prices/${caipChainId}/${assetIdentifier}`,
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

        trace({
          name: TraceName.FetchHistoricalPrices,
          data: { uri: uri.toString() },
        });
        const response = await fetch(uri.toString());
        endTrace({ name: TraceName.FetchHistoricalPrices });
        if (response.status === 204) {
          setPrices([]);
          return;
        }
        const data: { prices: TokenPrice[] } = await response.json();
        setPrices(data.prices as TokenPrice[]);
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
    isNonEvmAsset,
    asset.address,
    asset.chainId,
  ]);

  return { data: prices, isLoading, error };
};

export default useTokenHistoricalPrices;
