import { isNonEvmChainId } from '@metamask/bridge-controller';
import type { CaipChainId, Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';

/**
 * Hidden-token state, consolidated from the same selectors the main wallet list
 * uses (see `app/selectors/assets/assets-migration.ts`). Both maps already merge
 * the unified-assets `assetPreferences.hidden` flag with the legacy ignored
 * collections, so consumers only need these two shapes.
 */
export interface PayWithHiddenSources {
  /** EVM: chainId(hex) -> accountAddress(lowercased) -> tokenAddress(hex)[] */
  ignoredEvmTokens:
    | Record<string, Record<string, string[]> | undefined>
    | undefined;
  /** Non-EVM: accountId -> CAIP-19 assetId[] */
  ignoredNonEvmAssets: Record<string, string[] | undefined> | undefined;
  /** Selected EVM account address used to scope `ignoredEvmTokens`. */
  evmAccountAddress: string | undefined;
  /**
   * Resolves the owning non-EVM account id for a token's CAIP chain id. Hidden
   * non-EVM assets are keyed per account (e.g. Solana and Bitcoin holdings live
   * under different accounts), so the account must be resolved from the token's
   * own chain rather than assuming a single account. Mirrors how
   * `useAssetVisibility` scopes the account to the asset's chain.
   */
  resolveNonEvmAccountId: (chainId: CaipChainId) => string | undefined;
}

/**
 * Returns `true` when the user has hidden the given "Pay with" token, mirroring
 * the visibility semantics of `useAssetVisibility.isHidden`. EVM tokens are
 * matched case-insensitively by address under the selected EVM account (keyed by
 * chainId); non-EVM tokens are matched by their CAIP-19 asset id (`token.address`)
 * under the account that owns the token's chain.
 */
export const isPayWithTokenHidden = (
  token: BridgeToken,
  {
    ignoredEvmTokens,
    ignoredNonEvmAssets,
    evmAccountAddress,
    resolveNonEvmAccountId,
  }: PayWithHiddenSources,
): boolean => {
  if (isNonEvmChainId(token.chainId)) {
    const accountId = resolveNonEvmAccountId(token.chainId as CaipChainId);
    if (!accountId) return false;
    const ignored = ignoredNonEvmAssets?.[accountId];
    return Boolean(ignored?.includes(token.address));
  }

  if (!evmAccountAddress) return false;
  const ignored =
    ignoredEvmTokens?.[token.chainId as Hex]?.[evmAccountAddress.toLowerCase()];
  if (!ignored?.length) return false;
  const target = token.address.toLowerCase();
  return ignored.some((address) => address.toLowerCase() === target);
};
