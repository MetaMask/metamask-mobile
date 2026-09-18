import { isHex, toHex } from 'viem';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { useParams } from '../../../../../util/navigation/navUtils';
import { AssetType, Nft } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useEVMNfts } from './useNfts';

const EMPTY_ASSETS: ReturnType<typeof selectAssetsBySelectedAccountGroup> = {};
const selectEmptyAssets = () => EMPTY_ASSETS;

/**
 * Creates an asset with default zero balance from navigation params.
 * Used when the user navigates to send a token they don't own.
 */
const createAssetFromParams = (paramsAsset: AssetType): AssetType => ({
  ...paramsAsset,
  balance: paramsAsset.balance ?? '0',
  rawBalance: paramsAsset.rawBalance ?? '0x0',
});

export const useRouteParams = () => {
  const { asset: paramsAsset } = useParams<{
    asset: AssetType;
  }>();
  const { asset, updateAsset } = useSendContext();
  const shouldResolveRouteAsset = Boolean(paramsAsset && !asset);
  const assets = useSelector(
    shouldResolveRouteAsset
      ? selectAssetsBySelectedAccountGroup
      : selectEmptyAssets,
  );
  const flatAssets = useMemo(
    () => Object.values(assets ?? EMPTY_ASSETS).flat(),
    [assets],
  );
  const { nfts, isLoading: isNftsLoading } = useEVMNfts(
    shouldResolveRouteAsset && Boolean(paramsAsset?.tokenId),
  );

  useEffect(() => {
    if (asset) {
      return;
    }
    if (paramsAsset) {
      const paramChainId =
        isEvmAddress(paramsAsset.address) &&
        paramsAsset?.chainId &&
        !isHex(paramsAsset?.chainId)
          ? toHex(paramsAsset?.chainId)
          : paramsAsset?.chainId?.toString().toLowerCase();

      let filteredAsset = flatAssets?.find(
        ({ assetId, chainId: tokenChainId }) =>
          paramChainId === tokenChainId.toLowerCase() &&
          assetId?.toLowerCase() === paramsAsset.address?.toLowerCase(),
      ) as AssetType | Nft | undefined;

      if (!filteredAsset && nfts.length) {
        filteredAsset = nfts.find(
          ({ address, chainId, tokenId }) =>
            address === paramsAsset.address &&
            chainId?.toLowerCase() === paramChainId &&
            tokenId === paramsAsset.tokenId,
        );
      }

      if (filteredAsset) {
        updateAsset(filteredAsset);
      } else if (paramsAsset.symbol || paramsAsset.ticker) {
        // If the asset is not found in the user's owned assets or NFTs,
        // but has token symbol information (e.g., from trending/discovery),
        // use the params asset with default zero balance.
        // This ensures token details are displayed on the Send screen.
        updateAsset(createAssetFromParams(paramsAsset));
      }
    }
  }, [asset, paramsAsset, nfts, flatAssets, updateAsset]);

  // True while NFT processing is in progress and the asset hasn't been
  // resolved into the send context yet (i.e. navigated from NftDetails).
  const isLoading = Boolean(paramsAsset?.tokenId && isNftsLoading && !asset);

  return { isLoading };
};
