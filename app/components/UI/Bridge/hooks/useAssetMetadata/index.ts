import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { fetchAssetMetadata, getAssetImageUrl } from './utils';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';

export enum AssetType {
  /** The native asset for the current network, such as ETH */
  native = 'NATIVE',
  /** An ERC20 token */
  token = 'TOKEN',
  /** An ERC721 or ERC1155 token. */
  NFT = 'NFT',
  /**
   * A transaction interacting with a contract that isn't a token method
   * interaction will be marked as dealing with an unknown asset type.
   */
  unknown = 'UNKNOWN',
}

/**
 * Fetches token metadata for a single token if searchQuery is defined but filteredTokenList is empty
 * There's about a 10-15 minute delay between pump.fun and Token API.
 *
 * @param searchQuery - The search query to fetch metadata for
 * @param shouldFetchMetadata - Whether to fetch metadata
 * @param chainId - The chain id to fetch metadata for
 * @returns The asset metadata
 */
export const useAssetMetadata = (
  searchQuery: string,
  shouldFetchMetadata: boolean,
  chainId?: Hex | CaipChainId,
) => {
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  const { value: assetMetadata, pending } = useAsyncResult<
    | {
        address: Hex | CaipAssetType | string;
        symbol: string;
        decimals: number;
        image: string;
        chainId: Hex | CaipChainId;
        isNative: boolean;
        type: AssetType.token;
        balance: string;
        string: string;
      }
    | undefined
  >(async () => {
    if (!chainId || !searchQuery) {
      return undefined;
    }

    const trimmedSearchQuery = searchQuery.trim();
    const isAddress =
      isSolanaAddress(trimmedSearchQuery) || isEvmAddress(trimmedSearchQuery);

    if (isBasicFunctionalityEnabled && shouldFetchMetadata && isAddress) {
      const metadata = await fetchAssetMetadata(trimmedSearchQuery, chainId);

      if (metadata) {
        return {
          ...metadata,
          chainId,
          isNative: false,
          type: AssetType.token,
          image: getAssetImageUrl(metadata.assetId, chainId) ?? '',
          balance: '',
          string: '',
        } as const;
      }
      return undefined;
    }
    return undefined;
  }, [shouldFetchMetadata, searchQuery]);

  return { assetMetadata, pending };
};
