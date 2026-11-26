import { useEffect, useState } from 'react';

import Logger from '../../../../util/Logger';
import {
  fetchLighterTotalBalance,
  fetchLighterWithdrawableBalance,
} from './lighter-balance';

function useLighterBalanceOf(
  address: string | undefined,
  enabled: boolean,
  fetchBalance: (l1Address: string) => Promise<string | undefined>,
): string | undefined {
  // The balance is kept with the address it was fetched for, so a balance
  // loaded for a previous address is never returned for the current one.
  const [loaded, setLoaded] = useState<
    { address: string; balance: string | undefined } | undefined
  >(undefined);

  useEffect(() => {
    if (!enabled || !address) {
      return undefined;
    }

    let cancelled = false;
    fetchBalance(address)
      .then((fetched) => {
        if (!cancelled) {
          setLoaded({ address, balance: fetched });
        }
      })
      .catch((error: unknown) => {
        Logger.error(error as Error, 'Failed to load the Lighter balance');
        if (!cancelled) {
          setLoaded(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, enabled, fetchBalance]);

  return enabled && loaded && loaded.address === address
    ? loaded.balance
    : undefined;
}

/**
 * @param address - EVM address of the logged-in user.
 * @param enabled - Whether the balance is needed. Nothing is fetched otherwise.
 * @returns Human-readable USDC balance, or `undefined` until loaded for this
 * address, while disabled, or when the lookup failed.
 */
export function useLighterWithdrawableBalance(
  address: string | undefined,
  enabled: boolean,
): string | undefined {
  return useLighterBalanceOf(address, enabled, fetchLighterWithdrawableBalance);
}

/**
 * Total Lighter balance (collateral plus unrealized PnL), the measure the
 * Hyperliquid balance and `perpsBalances` use.
 *
 * @param address - EVM address of the logged-in user.
 * @param enabled - Whether the balance is needed. Nothing is fetched otherwise.
 * @returns Human-readable USDC balance, or `undefined` until loaded for this
 * address, while disabled, or when the lookup failed.
 */
export function useLighterTotalBalance(
  address: string | undefined,
  enabled: boolean,
): string | undefined {
  return useLighterBalanceOf(address, enabled, fetchLighterTotalBalance);
}
