/**
 * Token shape required for resolving assetId.
 * Matches the fields used from RampsController token list.
 */
export interface TokenForResolve {
  assetId?: string;
  chainId?: string;
}

/**
 * Resolves an assetId to the controller's canonical format.
 * Handles casing (API lowercase vs checksummed) and native token
 * placeholder ('slip44:.' vs 'slip44:{coinType}').
 * Use in both useRampNavigation and handleRampUrl for consistent behavior.
 *
 * @param assetId - Asset ID from URL/param (e.g. eip155:1/erc20:0x... or eip155:1/slip44:.)
 * @param allTokens - List of tokens from RampsController (e.g. selectTokens(state).data?.allTokens)
 * @returns Controller's canonical assetId, or the input assetId if no match
 */
export function resolveRampControllerAssetId(
  assetId: string,
  allTokens: TokenForResolve[],
): string {
  const isNative = assetId.includes('/slip44:');
  const [chainId] = assetId.split('/');

  const match = allTokens.find((tok) => {
    if (!tok.assetId) return false;
    if (isNative) {
      return tok.chainId === chainId && tok.assetId.includes('/slip44:');
    }
    return tok.assetId.toLowerCase() === assetId.toLowerCase();
  });

  return match?.assetId ?? assetId;
}
