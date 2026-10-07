import type { CryptoTwapWindowSeconds } from '../types';

/**
 * PolyBolt has no 30-second TWAP window. While PolyBolt is on, every TWAP
 * reference price uses the 60-second window.
 *
 * @param twapWindowSeconds - Window from Gamma. Absent for a spot market.
 * @param polyboltEnabled - True when the PolyBolt crypto price feed is on.
 * @returns The window to request and to show.
 */
export function resolveReferencePriceWindow(
  twapWindowSeconds: CryptoTwapWindowSeconds | undefined,
  polyboltEnabled: boolean,
): CryptoTwapWindowSeconds | undefined {
  if (!polyboltEnabled || twapWindowSeconds === undefined) {
    return twapWindowSeconds;
  }

  return 60;
}
