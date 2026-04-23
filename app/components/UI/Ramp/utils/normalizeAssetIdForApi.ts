/**
 * Ramps API stores EVM CAIP-19 assetIds lowercase, but RampsController emits
 * EIP-55 checksummed hex. Non-EVM namespaces (solana, bip122, …) carry
 * case-sensitive references (base58/bech32) and must pass through verbatim.
 */
export function normalizeAssetIdForApi(assetId: string | undefined): string {
  if (!assetId) return '';
  if (assetId.startsWith('eip155:')) return assetId.toLowerCase();
  return assetId;
}
