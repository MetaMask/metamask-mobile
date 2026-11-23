import { useEffect } from 'react';

let mountedBuyScreens = 0;
let lastUserPick: { providerId: string | null; count: number } = {
  providerId: null,
  count: 0,
};

/**
 * Marks the Buy screen as the owner of the provider pick while it is mounted,
 * so the start-up picker does not override a pick made for the route token
 * with the screen's exclusions.
 */
export function useBuyScreenOwnsProviderPick(): void {
  useEffect(() => {
    mountedBuyScreens += 1;
    return (): void => {
      mountedBuyScreens -= 1;
    };
  }, []);
}

/**
 * @returns Whether a mounted Buy screen owns the provider pick.
 */
export function isBuyScreenOwningProviderPick(): boolean {
  return mountedBuyScreens > 0;
}

/**
 * Records a provider the user picked by hand.
 *
 * @param providerId - The picked provider id.
 */
export function recordUserProviderPick(providerId: string): void {
  lastUserPick = { providerId, count: lastUserPick.count + 1 };
}

/**
 * @returns The latest user pick and how many picks were recorded so far.
 */
export function getLastUserProviderPick(): {
  providerId: string | null;
  count: number;
} {
  return lastUserPick;
}
