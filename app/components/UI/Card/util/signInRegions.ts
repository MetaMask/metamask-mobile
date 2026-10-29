import type { Region } from '../types';

/**
 * Countries offered on Card Sign in.
 *
 * A country is live when it is on the Immersve country list or Baanx
 * registration settings allow sign-up. The Immersve feature gate is ignored,
 * so a country stays selectable for existing cardholders when that gate is off.
 *
 * @param regions - Registration-settings countries.
 * @param immersveCountries - Country keys from `cardImmersveCountries`.
 * @returns The live countries, in the same order as `regions`.
 */
export const filterCardSignInRegions = (
  regions: Region[],
  immersveCountries: readonly string[],
): Region[] =>
  regions.filter(
    (region) =>
      immersveCountries.includes(region.key) || region.canSignUp === true,
  );
