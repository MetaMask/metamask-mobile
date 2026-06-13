import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { getNativeSourceToken } from '../../../../../../UI/Bridge/utils/tokenUtils';
import { getTokenKey } from '../tokenKey';

/**
 * Picks the default "Receive" token for QuickBuy Sell mode.
 *
 * The receive options are ordered stablecoins-first on the position's chain, so
 * naively taking the first entry can default to the *same* token the user is
 * selling (e.g. selling USDC on Base would default to receiving USDC, which is a
 * no-op). To keep the default sensible this excludes the token being sold and
 * then prefers the native token of the sold token's chain (e.g. ETH on Base) so
 * a sale defaults to cashing out into the chain's native asset. When the user is
 * already selling the native token, or no native option exists, it falls back to
 * the first remaining candidate (a stablecoin on the position chain).
 *
 * @param options - The ordered receive-token candidates.
 * @param soldToken - The token being sold (Sell mode source), if known.
 * @returns The token to preselect, or `undefined` when there are no options.
 */
export const selectDefaultReceiveToken = (
  options: BridgeToken[],
  soldToken: Pick<BridgeToken, 'address' | 'chainId'> | undefined,
): BridgeToken | undefined => {
  if (options.length === 0) return undefined;
  if (!soldToken) return options[0];

  const soldKey = getTokenKey(soldToken);
  const eligible = options.filter((token) => getTokenKey(token) !== soldKey);
  // Every option matched the sold token (shouldn't happen in practice) — fall
  // back to the first so we always return something selectable.
  if (eligible.length === 0) return options[0];

  let nativeKey: string | undefined;
  try {
    nativeKey = getTokenKey(getNativeSourceToken(soldToken.chainId));
  } catch {
    // Native asset can't be resolved for this chain — skip the native
    // preference and fall through to the first eligible candidate.
  }

  if (nativeKey && nativeKey !== soldKey) {
    const native = eligible.find((token) => getTokenKey(token) === nativeKey);
    if (native) return native;
  }

  return eligible[0];
};
