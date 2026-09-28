import { isBrazilGeolocationLocation } from '../../../../util/region/isBrazilGeolocationLocation';

/**
 * How the Add funds Bank account row should render.
 *
 * - `enabled`: live row. Flag is on and geolocation is Brazil, or the dev bypass is on.
 * - `coming-soon`: flag is off. Keeps the pre-rollout placeholder.
 * - `hidden`: flag is on, but geolocation failed or is not Brazil, and the bypass is off.
 */
export type BankAccountEntryVisibility = 'enabled' | 'coming-soon' | 'hidden';

/**
 * Resolves Bank account row visibility from the neobank flag, geolocation, and
 * the dev bypass.
 *
 * @param params.flagEnabled - Whether `moneyMovementBrazilNeobank` is on.
 * @param params.location - GeolocationController location string.
 * @param params.geoBypassEnabled - Whether the local Brazil geo bypass is on.
 * @returns The row visibility for the Add funds sheet.
 */
export function getBankAccountEntryVisibility({
  flagEnabled,
  location,
  geoBypassEnabled,
}: {
  flagEnabled: boolean;
  location: string | undefined | null;
  geoBypassEnabled: boolean;
}): BankAccountEntryVisibility {
  if (!flagEnabled) {
    return 'coming-soon';
  }

  if (geoBypassEnabled || isBrazilGeolocationLocation(location)) {
    return 'enabled';
  }

  return 'hidden';
}
