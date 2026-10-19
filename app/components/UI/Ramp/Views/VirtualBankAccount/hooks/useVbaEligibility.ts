import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { GeolocationRequestStatus } from '@metamask/geolocation-controller';
import {
  getVbaRegionOverride,
  isVbaGeoBypassEnabled,
  selectMoneyMovementNeobank,
} from '../../../../../../selectors/featureFlagController/moneyAccount';
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../../selectors/geolocationController';
import { isVbaRegionEnabled } from '../../../../../../util/region/isVbaRegionEnabled';

export interface VbaEligibility {
  /**
   * Whether the user may enter VBA onboarding. True when `moneyMovementNeobank`
   * is enabled for this binary and IP geolocation is in its `regions`, or
   * the flag is enabled and the dev bypass is set.
   */
  isEligible: boolean;
  /** IP lookup has not resolved yet; callers should hold rather than deny. */
  isLoading: boolean;
  /**
   * `moneyMovementNeobank` is enabled for this binary and lists at least one
   * country. Missing, disabled, malformed, too old, or empty `regions` is false.
   */
  isFlagEnabled: boolean;
  /** IP geolocation's country is in `moneyMovementNeobank.regions`. */
  isRegionEligible: boolean;
  /** `MM_MONEY_VBA_GEO_BYPASS=true` in `.js.env`. */
  isDevBypassEnabled: boolean;
  /** IP location code from GeolocationController, such as `BR` or `US-CA`. */
  location: string | undefined;
}

export interface VbaEligibilityInputs {
  isFlagEnabled: boolean;
  /** GeolocationController `location` (IP lookup). Not the Settings region. */
  location: string | undefined | null;
  geolocationStatus: GeolocationRequestStatus | undefined;
  isDevBypassEnabled: boolean;
  /**
   * ISO country codes from `selectMoneyMovementNeobank`. Empty disables the
   * rollout. There is no Brazil fallback.
   */
  regions: readonly string[];
}

/**
 * Pure eligibility resolution so the rule can be unit tested without Redux.
 *
 * Region comes only from the GeolocationController IP lookup. The Settings
 * region picker (`RampsController.userRegion`) is not consulted.
 */
export function getVbaEligibility({
  isFlagEnabled,
  location,
  geolocationStatus,
  isDevBypassEnabled,
  regions,
}: VbaEligibilityInputs): VbaEligibility {
  const trimmedLocation = location?.trim() || undefined;
  const isRolloutEnabled = isFlagEnabled && regions.length > 0;
  const isRegionEligible = isVbaRegionEnabled(trimmedLocation, regions);
  const isLoading =
    !trimmedLocation &&
    (geolocationStatus === undefined ||
      geolocationStatus === 'idle' ||
      geolocationStatus === 'loading');

  return {
    isEligible: isRolloutEnabled && (isDevBypassEnabled || isRegionEligible),
    isLoading,
    isFlagEnabled: isRolloutEnabled,
    isRegionEligible,
    isDevBypassEnabled,
    location: trimmedLocation,
  };
}

/**
 * Single gate for every Virtual Bank Account entry point (Add funds row, Money
 * home cards, deeplinks). Combines IP geolocation, `moneyMovementNeobank`
 * (enabled, minimumVersion, and regions), the dev escape hatch, and a
 * loading state.
 *
 * @example
 * const { isEligible, isLoading } = useVbaEligibility();
 */
export function useVbaEligibility(): VbaEligibility {
  const { isEnabled: isFlagEnabled, regions } = useSelector(
    selectMoneyMovementNeobank,
  );
  const location = useSelector(selectGeolocationLocation);
  const geolocationStatus = useSelector(selectGeolocationStatus);
  const regionOverride = getVbaRegionOverride();

  return useMemo(
    () =>
      getVbaEligibility({
        isFlagEnabled,
        location: regionOverride ?? location,
        geolocationStatus,
        isDevBypassEnabled: isVbaGeoBypassEnabled(),
        regions,
      }),
    [isFlagEnabled, location, geolocationStatus, regionOverride, regions],
  );
}

export default useVbaEligibility;
