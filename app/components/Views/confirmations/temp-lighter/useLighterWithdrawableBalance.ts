import { useEffect, useState } from 'react';

import Logger from '../../../../util/Logger';
import { fetchLighterWithdrawableBalance } from './lighter-balance';

/**
 * @param enabled - Whether a Lighter withdraw is open. Nothing is fetched otherwise.
 * @returns Human-readable USDC balance, or `undefined` until loaded for this
 * address, while disabled, or when the lookup failed.
 */
export function useLighterWithdrawableBalance(
  enabled: boolean,
): string | undefined {
  // The balance is kept with the address it was fetched for, so a balance
  // loaded for a previous address is never returned for the current one.
  const [loaded, setLoaded] = useState<
    { address: string; balance: string | undefined } | undefined
  >(undefined);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;
    fetchLighterWithdrawableBalance()
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
  }, [enabled]);

  return enabled && loaded && loaded.address === address
    ? loaded.balance
    : undefined;
}
