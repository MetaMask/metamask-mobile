import type { CaipChainId } from '@metamask/utils';

/**
 * Helpers for parsing the CAIP asset ids carried on activity {@link TokenAmount}s.
 *
 * An asset id looks like `<caipChainId>/<assetNamespace>:<assetReference>`, e.g.
 * `eip155:1/erc20:0x…` (ERC-20) or `eip155:1/slip44:60` (native). These keep the
 * `split('/')` / `split(':')` parsing in one place so callers don't re-derive it.
 */

/**
 * Returns the CAIP-2 chain id portion of an asset id (e.g. `eip155:1`). Named
 * `CaipChainId` (not bare `chainId`) to distinguish it from the EVM-era hex
 * chain id the wallet historically used.
 */
export function getAssetIdCaipChainId(
  assetId: string | undefined,
): CaipChainId | undefined {
  return assetId?.split('/')[0] as CaipChainId | undefined;
}

/**
 * Returns the asset namespace + reference of an asset id, e.g. `erc20` +
 * `0x…`, or `slip44` + `60` for native assets. Both are `undefined` when the
 * asset id is absent or has no asset portion.
 */
export function getAssetIdNamespaceAndReference(assetId: string | undefined): {
  namespace?: string;
  reference?: string;
} {
  const assetType = assetId?.split('/')[1];
  const [namespace, reference] = assetType?.split(':') ?? [];
  return { namespace, reference };
}
