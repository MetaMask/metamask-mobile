import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { getTokenKey } from '../tokenKey';

/**
 * The live balance fields QuickBuy re-reads from the reactive option lists
 * (`usePayWithTokens` / `useReceiveTokens`), which are themselves driven by
 * `useSelector` subscriptions to `TokenBalancesController` /
 * `AccountTrackerController` (EVM) and the multichain balances state (Solana).
 *
 * Only the balance-shaped fields are surfaced — never identity fields
 * (`address`, `chainId`, `decimals`, `symbol`) — so callers can refresh a
 * selected token's displayed balance without swapping the reference-stable
 * token used for quote fetching.
 */
export interface LiveTokenBalanceFields {
  balance?: string;
  balanceFiat?: string;
  tokenFiatAmount?: number;
  currencyExchangeRate?: number;
}

/**
 * Resolves the live balance fields for a selected token by matching it (by
 * stable `address:chainId` key) against the reactive option list it was
 * originally picked from.
 *
 * QuickBuy stores the chosen pay-with / receive token as a `useState` snapshot,
 * so its cached `balance` / `balanceFiat` freeze at selection time. The option
 * lists, by contrast, recompute on every balance-state change (a swap settling,
 * an external incoming transfer, a send in another flow, …). Re-reading the
 * matching option's balance here makes the displayed available balance track
 * the underlying state regardless of *what* changed it — see TSA-632.
 *
 * Falls back to the snapshot's own fields when no matching option is found
 * (e.g. the user spent the entire balance and the held-token list dropped it),
 * so the row degrades to the last known value rather than blanking out.
 *
 * @param selected - The selected token snapshot (or `undefined`).
 * @param liveOptions - The reactive option list the token was selected from.
 * @returns The live balance fields, or `undefined` when `selected` is absent.
 */
export const resolveLiveTokenBalance = (
  selected: BridgeToken | undefined,
  liveOptions: BridgeToken[],
): LiveTokenBalanceFields | undefined => {
  if (!selected) {
    return undefined;
  }

  const selectedKey = getTokenKey(selected);
  const liveMatch = liveOptions.find(
    (option) => getTokenKey(option) === selectedKey,
  );
  const source = liveMatch ?? selected;

  return {
    balance: source.balance,
    balanceFiat: source.balanceFiat,
    tokenFiatAmount: source.tokenFiatAmount,
    currencyExchangeRate: source.currencyExchangeRate,
  };
};
