/**
 * Resolves the wallet that owns Immersve funding / revoke approvals.
 *
 * Precedence:
 * 1. Explicit address (SIWE / route param from the authenticated session)
 * 2. Card Home primary funding wallet
 * 3. Currently selected EVM account (onboarding fallback before home data exists)
 */
export function resolveCardFundingAddress({
  preferredAddress,
  primaryFundingWalletAddress,
  selectedEvmAddress,
}: {
  preferredAddress?: string | null;
  primaryFundingWalletAddress?: string | null;
  selectedEvmAddress?: string | null;
}): string | undefined {
  return (
    preferredAddress ||
    primaryFundingWalletAddress ||
    selectedEvmAddress ||
    undefined
  );
}
