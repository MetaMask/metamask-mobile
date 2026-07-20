import type { CaipChainId, Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../UI/Bridge/types';

const EVM_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

export const isNativeToken = (token: BridgeToken): boolean =>
  token.address.toLowerCase() === EVM_NATIVE_ADDRESS ||
  token.address.includes('slip44:501');

/**
 * True when `token` refers to the same on-chain asset as `other`.
 *
 * Matches on chainId + address (case-insensitive, so checksummed and
 * lowercase hex forms compare equal). For non-EVM chains (CAIP chain ids) a
 * symbol fallback is applied because the same asset can be referenced through
 * different forms (canonical `…/slip44:NNN` vs a raw mint address from a feed
 * payload). The symbol fallback is intentionally NOT applied on EVM chains to
 * avoid fake-token symbol collisions. Cross-chain same-symbol (e.g. USDC on
 * Base vs USDC on Ethereum) is treated as a different asset because chainId
 * is part of the comparison.
 */
export const isSameAsset = (
  token: BridgeToken,
  other: Pick<BridgeToken, 'address' | 'chainId'> &
    Partial<Pick<BridgeToken, 'symbol'>>,
): boolean => {
  if (token.chainId !== other.chainId) return false;
  if (token.address.toLowerCase() === other.address.toLowerCase()) {
    return true;
  }
  const isNonEvm =
    typeof token.chainId === 'string' && !token.chainId.startsWith('0x');
  return Boolean(isNonEvm && other.symbol && token.symbol === other.symbol);
};

/**
 * Picks the best default "Pay with" token from the available options:
 * 1. Native token on the destination chain (e.g. ETH on Base when buying on Base)
 * 2. Any token on the destination chain with the highest balance
 * 3. Native token on any other chain with the highest balance
 * 4. Fallback: first option (highest overall fiat balance)
 *
 * The destination token itself is deprioritized — it is excluded from all
 * four tiers and only selected as a last resort when the user holds no other
 * tokens. This prevents the "buy SOL with SOL" same-token preselection.
 * Cross-chain same-symbol (e.g. USDC on Base while buying USDC on Ethereum)
 * is treated as a different token because chainId is part of the comparison.
 */
export const selectDefaultSourceToken = (
  options: BridgeToken[],
  destChainId: Hex | CaipChainId | undefined,
  destToken?: Pick<BridgeToken, 'address' | 'chainId'> &
    Partial<Pick<BridgeToken, 'symbol'>>,
): BridgeToken | undefined => {
  if (options.length === 0) return undefined;

  const isDest = (t: BridgeToken): boolean =>
    destToken ? isSameAsset(t, destToken) : false;

  const eligible = options.filter((t) => !isDest(t));

  if (destChainId) {
    const nativeOnDest = eligible.find(
      (t) => t.chainId === destChainId && isNativeToken(t),
    );
    if (nativeOnDest) return nativeOnDest;

    const tokenOnDest = eligible.find((t) => t.chainId === destChainId);
    if (tokenOnDest) return tokenOnDest;
  }

  const fallback = eligible.find(isNativeToken) ?? eligible[0];
  if (fallback) return fallback;

  // Last resort: user only holds the destination token. The Buy CTA will stay
  // disabled because no valid same-token quote exists.
  return options[0];
};
