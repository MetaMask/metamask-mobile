import type { CaipChainId, Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../UI/Bridge/types';

const EVM_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

export const isNativeToken = (token: BridgeToken): boolean =>
  token.address.toLowerCase() === EVM_NATIVE_ADDRESS ||
  token.address.includes('slip44:501');

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
 * is treated as a different token because both chainId and address are compared.
 */
export const selectDefaultSourceToken = (
  options: BridgeToken[],
  destChainId: Hex | CaipChainId | undefined,
  destToken?: Pick<BridgeToken, 'address' | 'chainId'>,
): BridgeToken | undefined => {
  if (options.length === 0) return undefined;

  const isDest = (t: BridgeToken): boolean =>
    !!destToken &&
    t.chainId === destToken.chainId &&
    t.address.toLowerCase() === destToken.address.toLowerCase();

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
