import { isHex, toHex } from 'viem';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { useParams } from '../../../../../util/navigation/navUtils';
import { AssetType, Nft } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useEVMNfts } from './useNfts';

/**
 * Creates an asset with default zero balance from navigation params.
 * Used when the user navigates to send a token they don't own.
 */
const createAssetFromParams = (paramsAsset: AssetType): AssetType => ({
  ...paramsAsset,
  balance: paramsAsset.balance ?? '0',
  rawBalance: paramsAsset.rawBalance ?? '0x0',
});

/**
 * Restates an asset's `fiat.conversionRate` as a complete token-to-fiat price.
 *
 * Two selectors populate `AssetType.fiat` with different units.
 * `selectConfirmationAssetsByAccountGroupId`, used by the in-flow token picker,
 * stores the token's own fiat price, which is already token-to-fiat.
 * `selectAssetsBySelectedAccountGroup`, used by this route-param path, stores
 * the native-coin-to-fiat currency rate and leaves the token's price in the
 * native coin to be applied separately. See `getFiatBalanceForEvmToken` in
 * `@metamask/assets-controllers`, which multiplies by `marketData.price` to
 * build `fiat.balance` but returns only `currencyRate.conversionRate`.
 *
 * Consumers such as `useCurrencyConversions` cannot tell the two apart from the
 * asset alone, so the upstream shape is normalised here, at the boundary where
 * the provenance is still known. The hook then applies one rule to every asset.
 *
 * Only EVM non-native tokens differ. The multichain branch already returns a
 * token-to-fiat `rate`, and native coins are priced in themselves, so their
 * `conversionRate` is already the native-to-fiat rate this function would
 * otherwise produce.
 */
const normalizeAssetConversionRate = (
  asset: AssetType,
  marketData: Record<Hex, Record<Hex, { price?: number } | undefined>>,
): AssetType => {
  const { address, chainId, fiat, isNative } = asset;

  if (!fiat || fiat.conversionRate === undefined || isNative || !address) {
    return asset;
  }

  const tokenPriceInNativeCoin =
    marketData?.[chainId as Hex]?.[address as Hex]?.price;

  // A token with no market entry has no price to fold in. `fiat.balance` could
  // not have been built without one either, so this asset carries no usable
  // rate; leave it untouched rather than inventing a factor of 1.
  if (tokenPriceInNativeCoin === undefined) {
    return asset;
  }

  return {
    ...asset,
    fiat: {
      ...fiat,
      conversionRate: fiat.conversionRate * tokenPriceInNativeCoin,
    },
  };
};

export const useRouteParams = () => {
  const assets = useSelector(selectAssetsBySelectedAccountGroup);
  const marketData = useSelector(selectTokenMarketData);
  const flatAssets = useMemo(() => Object.values(assets).flat(), [assets]);
  const { nfts, isLoading: isNftsLoading } = useEVMNfts();

  const { asset: paramsAsset } = useParams<{
    asset: AssetType;
  }>();
  const { asset, updateAsset } = useSendContext();

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
        // NFTs carry no fiat rate, so only token assets need normalising.
        updateAsset(
          'fiat' in filteredAsset
            ? normalizeAssetConversionRate(
                filteredAsset as AssetType,
                marketData,
              )
            : filteredAsset,
        );
      } else if (paramsAsset.symbol || paramsAsset.ticker) {
        // If the asset is not found in the user's owned assets or NFTs,
        // but has token symbol information (e.g., from trending/discovery),
        // use the params asset with default zero balance.
        // This ensures token details are displayed on the Send screen.
        updateAsset(createAssetFromParams(paramsAsset));
      }
    }
  }, [asset, paramsAsset, nfts, flatAssets, marketData, updateAsset]);

  // True while NFT processing is in progress and the asset hasn't been
  // resolved into the send context yet (i.e. navigated from NftDetails).
  const isLoading = Boolean(paramsAsset?.tokenId && isNftsLoading && !asset);

  return { isLoading };
};
