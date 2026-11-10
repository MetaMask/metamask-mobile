import { ALPHA2_TO_ALPHA3 } from '@metamask/kyc-controller';

const ALPHA3_TO_ALPHA2: Record<string, string> = Object.fromEntries(
  Object.entries(ALPHA2_TO_ALPHA3).map(([alpha2, alpha3]) => [alpha3, alpha2]),
);

/**
 * Converts an ISO 3166-1 alpha-3 country code (e.g. "USA") to its alpha-2
 * equivalent (e.g. "US"). Inverse of `alpha2ToAlpha3` from
 * `@metamask/kyc-controller`.
 *
 * @param alpha3 - The ISO 3166-1 alpha-3 country code. Case and surrounding
 * whitespace are ignored.
 * @returns The alpha-2 code, or undefined for empty or unknown input.
 */
export function alpha3ToAlpha2(
  alpha3: string | null | undefined,
): string | undefined {
  const normalized = alpha3?.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  return ALPHA3_TO_ALPHA2[normalized];
}
