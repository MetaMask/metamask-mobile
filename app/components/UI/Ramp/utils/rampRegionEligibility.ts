import type { Country, UserRegion } from '@metamask/ramps-controller';

/**
 * Determines whether the user's resolved region is *definitively* unsupported
 * for the buy action.
 *
 * Returns `true` only on a definitive negative signal so that an indeterminate
 * or still-loading state never blocks the buy flow (mirrors the existing
 * "only divert when data has loaded" pattern used elsewhere in the ramp UI).
 *
 * Resolution order:
 * 1. Clean controller predicate — `UserRegion.state.supported.buy` when a state
 * is selected and carries support flags, then `UserRegion.country.supported.buy`.
 * 2. Countries-membership fallback when the region carries no support flags.
 *
 * @param userRegion - The resolved user region from RampsController, or null.
 * @param countries - The loaded supported countries from RampsController.
 * @returns `true` when the region is definitively unsupported for buy.
 */
export function isRampRegionDefinitivelyUnsupported(
  userRegion: UserRegion | null,
  countries: Country[],
): boolean {
  // Region not resolved yet → indeterminate → do not block.
  if (!userRegion) {
    return false;
  }

  // Clean controller predicate: state-level support takes precedence when a
  // state is selected and exposes support flags.
  const stateSupportsBuy = userRegion.state?.supported?.buy;
  if (typeof stateSupportsBuy === 'boolean') {
    return !stateSupportsBuy;
  }

  const countrySupportsBuy = userRegion.country?.supported?.buy;
  if (typeof countrySupportsBuy === 'boolean') {
    return !countrySupportsBuy;
  }

  // Fallback: membership check against the loaded supported countries list.
  // An empty list is treated as not-yet-loaded → indeterminate → do not block.
  if (countries.length > 0) {
    const isoCode = userRegion.country?.isoCode?.toUpperCase();
    if (isoCode) {
      const match = countries.find(
        (country) => country.isoCode?.toUpperCase() === isoCode,
      );
      if (match) {
        return match.supported?.buy === false;
      }
      // Resolved region is absent from the loaded supported list → unsupported.
      return true;
    }
  }

  return false;
}
