import { useEffect, useState } from 'react';

import Logger from '../../../../util/Logger';
import { fetchLighterWithdrawableBalance } from './lighter-balance';

/**
 * @param address - EVM address of the logged-in user.
 * @param enabled - Whether the balance is needed. Nothing is fetched otherwise.
 * @returns Human-readable USDC balance, or `undefined` until loaded.
 */
export function useLighterWithdrawableBalance(
  address: string | undefined,
  enabled: boolean,
): string | undefined {
  const [balance, setBalance] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled || !address) {
      return undefined;
    }

    let cancelled = false;
    fetchLighterWithdrawableBalance(address)
      .then((fetched) => {
        if (!cancelled) {
          setBalance(fetched);
        }
      })
      .catch((error: unknown) => {
        Logger.error(error as Error, 'Failed to load the Lighter balance');
      });

    return () => {
      cancelled = true;
    };
  }, [address, enabled]);

  return balance;
}
