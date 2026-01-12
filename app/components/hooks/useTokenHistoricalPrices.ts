import { CaipAssetId, CaipAssetType, Hex } from '@metamask/utils';
import { getDecimalChainId } from '../../util/networks';
import { useState, useEffect } from 'react';
import { TraceName, endTrace, trace } from '../../util/trace';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainHistoricalPrices } from '../../selectors/multichain';
///: END:ONLY_INCLUDE_IF
import { useSelector } from 'react-redux';
import Engine from '../../core/Engine';
import { TokenI } from '../UI/Tokens/types';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectLastSelectedSolanaAccount } from '../../selectors/accountsController';

export type TimePeriod = '1d' | '1w' | '7d' | '1m' | '3m' | '1y' | '3y' | 'all';

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
    case 'all':
      return 'P1000Y';
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
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const multichainHistoricalPrices = useSelector(
    selectMultichainHistoricalPrices,
  );
  ///: END:ONLY_INCLUDE_IF
  const resultChainId = formatChainIdToCaip(asset.chainId as Hex);
  const isNonEvmAsset = resultChainId === asset.chainId;
  const [prices, setPrices] = useState<TokenPrice[]>(placeholderPrices);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const lastSelectedNonEvmAccount = useSelector(
    selectLastSelectedSolanaAccount,
  );

  // TODO; the asset.address received here is not a CaipAssetType asset when its coming from bridge flow; this is happening because of useTopTokens hook retuning the address for non evm as not a CaipAssetType asset;
  // TODO; we need to fix this;

  useEffect(() => {
    const fetchPrices = async () => {
      setIsLoading(true);
      try {
        if (isNonEvmAsset) {
          const caip19Address = asset.address as CaipAssetId;
          const isCaipAssetType = caip19Address.startsWith(`${asset.chainId}`);

          // TODO; this is a temporary fix to ensure the address is a CaipAssetType asset;
          const normalizedCaipAssetTypeAddress = isCaipAssetType
            ? caip19Address
            : (`${asset.chainId}/token:${asset.address}` as CaipAssetType);
          const standardizedTimeInterval = standardizeTimeInterval(timePeriod);

          trace({
            name: TraceName.FetchHistoricalPrices,
            data: {
              normalizedCaipAssetTypeAddress,
            },
          });

          await Engine.context.MultichainAssetsRatesController.fetchHistoricalPricesForAsset(
            normalizedCaipAssetTypeAddress,
            lastSelectedNonEvmAccount,
          );

          endTrace({ name: TraceName.FetchHistoricalPrices });

          const result =
            multichainHistoricalPrices[normalizedCaipAssetTypeAddress][
              vsCurrency
            ].intervals[standardizedTimeInterval];

          // Transform to ensure first value is string and second is number with max precision
          const transformedResult = result.map(
            ([timestamp, price]) =>
              [timestamp.toString(), Number(price)] as TokenPrice,
          );

          setPrices(transformedResult);
        } else {
          const baseUri = 'https://price.api.cx.metamask.io/v3';
          const decimalChainId = getDecimalChainId(chainId);
          const caipChainId = `eip155:${decimalChainId}`;
          // CAIP-19 format: eip155:{chainId}/erc20:{address}
          const assetIdentifier = `erc20:${address}`;
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
    isNonEvmAsset,
    asset.address,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    asset.chainId,
    lastSelectedNonEvmAccount,
    multichainHistoricalPrices,
    ///: END:ONLY_INCLUDE_IF
  ]);

  return { data: prices, isLoading, error };
};

export default useTokenHistoricalPrices;
