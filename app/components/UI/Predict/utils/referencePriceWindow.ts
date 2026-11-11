import type { CryptoTwapWindowSeconds } from '../types';

/**
 * PolyBolt has no 30-second TWAP window. Every TWAP reference price uses the
 * 60-second window.
 *
 * @param twapWindowSeconds - Window from Gamma. Absent for a spot market.
 * @returns The window to request and to show.
 */
export function resolveReferencePriceWindow(
  twapWindowSeconds: CryptoTwapWindowSeconds | undefined,
): CryptoTwapWindowSeconds | undefined {
  if (twapWindowSeconds === undefined) {
    return undefined;
  }

  return 60;
}
