import {
  CaipAssetType,
  CaipChainId,
  isCaipAssetType,
  parseCaipAssetType,
  parseCaipChainId,
} from '@metamask/utils';

export function parseCAIP19AssetId(assetId: string): {
  namespace: string;
  chainId: string;
  assetNamespace: string;
  assetReference: string;
} | null {
  if (!isCaipAssetType(assetId as CaipAssetType)) {
    return null;
  }

  try {
    const parsed = parseCaipAssetType(assetId as CaipAssetType);
    const chainParsed = parseCaipChainId(parsed.chainId as CaipChainId);
    return {
      namespace: chainParsed.namespace,
      chainId: chainParsed.reference,
      assetNamespace: parsed.assetNamespace,
      assetReference: parsed.assetReference,
    };
  } catch {
    return null;
  }
}
