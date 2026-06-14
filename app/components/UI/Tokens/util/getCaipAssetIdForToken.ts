import {
  convertHexToDecimal,
  toChecksumHexAddress,
} from '@metamask/controller-utils';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { SPOT_PRICES_SUPPORT_INFO } from '@metamask/assets-controllers';
import { Slip44Service } from '@metamask/network-enablement-controller';
import {
  hasProperty,
  isCaipAssetType,
  isStrictHexString,
  type CaipAssetType,
  type Hex,
} from '@metamask/utils';

import type { TokenI } from '../types';

/**
 * Native CAIP-19 asset id for an EVM chain (spot-price constants first, then Slip44).
 * Expects `chainId` as canonical hex from network state (e.g. `0x1`).
 */
export async function getNativeAssetId(chainId: Hex): Promise<string> {
  if (hasProperty(SPOT_PRICES_SUPPORT_INFO, chainId)) {
    return SPOT_PRICES_SUPPORT_INFO[
      chainId as keyof typeof SPOT_PRICES_SUPPORT_INFO
    ] as string;
  }

  const decimalChainId = convertHexToDecimal(chainId);
  const slip44CoinType = await Slip44Service.getEvmSlip44(
    Number(decimalChainId),
  );

  return `eip155:${decimalChainId}/slip44:${slip44CoinType}`;
}

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
 * **Native** tokens use {@link getNativeAssetId} (async). ERC-20 / CAIP rows resolve synchronously inside this async API.
 */
export async function getCaipAssetIdForToken(
  asset: TokenI | null | undefined,
): Promise<CaipAssetType | null> {
  if (!asset?.chainId) {
    return null;
  }

  try {
    if (asset.address && isCaipAssetType(asset.address)) {
      return asset.address;
    }

    if (asset.isNative || asset.isETH) {
      const id = await getNativeAssetId(asset.chainId as Hex);
      return id as CaipAssetType;
    }

    if (!asset.address) {
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
