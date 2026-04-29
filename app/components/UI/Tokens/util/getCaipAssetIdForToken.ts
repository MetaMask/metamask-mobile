import { toChecksumHexAddress } from '@metamask/controller-utils';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import {
  isCaipAssetType,
  isStrictHexString,
  type CaipAssetType,
  type Hex,
} from '@metamask/utils';

import type { TokenI } from '../types';

/**
 * `formatAddressToAssetId` only builds `eip155:…/erc20:…` when the address
 * passes `isStrictHexString`. Token list data sometimes stores ERC-20 contract
 * addresses without a `0x` prefix, so the formatter returns `undefined` while
 * native assets still resolve via the `isNativeAddress` branch — which is why
 * badges could show for native tokens but not ERC-20s.
 */
function normalizeHexAddressForBridge(address: string): string {
  const t = address.trim();
  if (/^[0-9a-fA-F]{40}$/.test(t)) {
    return `0x${t}`;
  }
  return t;
}

/**
 * Resolves a CAIP-19 asset id for token list / security API calls.
 * Mirrors TokenDetails / AssetOverviewContent behavior, with extra normalization
 * so ERC-20 rows match what the bridge formatter expects.
 */
export function getCaipAssetIdForToken(
  asset: TokenI | null | undefined,
): CaipAssetType | null {
  if (!asset?.address) {
    return null;
  }
  try {
    if (isCaipAssetType(asset.address)) {
      return asset.address;
    }
    if (!asset.chainId) {
      return null;
    }

    const normalized = normalizeHexAddressForBridge(asset.address);
    if (!isStrictHexString(normalized)) {
      return null;
    }

    const checksummed = toChecksumHexAddress(normalized as Hex);

    return (formatAddressToAssetId(checksummed, asset.chainId as Hex) ??
      null) as CaipAssetType | null;
  } catch {
    return null;
  }
}
