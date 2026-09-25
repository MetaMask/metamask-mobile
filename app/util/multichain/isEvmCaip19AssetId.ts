import {
  isCaipAssetType,
  KnownCaipNamespace,
  parseCaipAssetType,
} from '@metamask/utils';

/**
 * Returns whether an asset ID is a valid EVM CAIP-19 asset type.
 */
export const isEvmCaip19AssetId = (assetId: string): boolean =>
  isCaipAssetType(assetId) &&
  parseCaipAssetType(assetId).chain.namespace === KnownCaipNamespace.Eip155;
