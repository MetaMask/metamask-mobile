import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { GeolocationRequestStatus } from '@metamask/geolocation-controller';
import {
  isBrazilNeobankGeoBypassEnabled,
  selectMoneyMovementBrazilNeobankEnabled,
} from '../../../../../../selectors/featureFlagController/moneyAccount';
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../../selectors/geolocationController';
import { selectUserRegion } from '../../../../../../selectors/rampsController';
import { isBrazilGeolocationLocation } from '../../../../../../util/region/isBrazilGeolocationLocation';

/**
 * Where the VBA region came from.
 *
 * - `ramps`: the region chosen in Settings (or auto-detected by RampsController).
 * - `geolocation`: the raw GeolocationController IP lookup.
 * - `none`: nothing resolved yet.
 */
export type VbaRegionSource = 'ramps' | 'geolocation' | 'none';

export interface VbaRegion {
  /** Region code such as `BR`, `br-sp`, `US-CA`, or `UNKNOWN`. */
  regionCode: string | undefined;
  source: VbaRegionSource;
}

/**
 * Resolves the region used to gate Virtual Bank Account onboarding.
 *
 * The Settings region picker writes to RampsController, so that wins when set.
 * Otherwise fall back to the GeolocationController IP lookup, which is fetched
 * once at Engine start and persisted.
 */
export const selectVbaRegion = createSelector(
  selectUserRegion,
  selectGeolocationLocation,
  (userRegion, geolocation): VbaRegion => {
    const rampsRegionCode = userRegion?.regionCode?.trim();
    if (rampsRegionCode) {
      return { regionCode: rampsRegionCode, source: 'ramps' };
    }
    if (geolocation?.trim()) {
      return { regionCode: geolocation, source: 'geolocation' };
    }
    return { regionCode: undefined, source: 'none' };
  },
);

export interface VbaEligibility {
  /**
   * Whether the user may enter VBA onboarding. True when the flag is on and
   * the region is Brazil, or the flag is on and the dev bypass is set.
   */
  isEligible: boolean;
  /** Region has not resolved yet; callers should hold rather than deny. */
  isLoading: boolean;
  /** `moneyMovementBrazilNeobank` remote flag, including its min-version gate. */
  isFlagEnabled: boolean;
  /** Region resolves to Brazil. */
  isRegionEligible: boolean;
  /** `MM_MONEY_BRAZIL_NEOBANK_GEO_BYPASS=true` in `.js.env`. */
  isDevBypassEnabled: boolean;
  regionCode: string | undefined;
  regionSource: VbaRegionSource;
}

export interface VbaEligibilityInputs {
  isFlagEnabled: boolean;
  region: VbaRegion;
  geolocationStatus: GeolocationRequestStatus | undefined;
  isDevBypassEnabled: boolean;
}

/**
 * Pure eligibility resolution so the rule can be unit tested without Redux.
 *
 * TODO(TRAM-3875 follow-up): fold in "already has an auto ramp" once the
 * controller exposes it; users with a provisioned account should skip
 * onboarding rather than be re-gated.
 */
export function getVbaEligibility({
  isFlagEnabled,
  region,
  geolocationStatus,
  isDevBypassEnabled,
}: VbaEligibilityInputs): VbaEligibility {
  const isRegionEligible = isBrazilGeolocationLocation(region.regionCode);
  // Only the IP lookup has a lifecycle; a Settings region is always resolved.
  const isLoading =
    region.source === 'none' &&
    (geolocationStatus === undefined ||
      geolocationStatus === 'idle' ||
      geolocationStatus === 'loading');

  return {
    isEligible: isFlagEnabled && (isDevBypassEnabled || isRegionEligible),
    isLoading,
    isFlagEnabled,
    isRegionEligible,
    isDevBypassEnabled,
    regionCode: region.regionCode,
    regionSource: region.source,
  };
}

/**
 * Single gate for every Virtual Bank Account entry point (Add funds row, Money
 * home cards, deeplinks). Combines geolocation, the version-gated remote flag,
 * the dev escape hatch, and a loading state.
 *
 * @example
 * const { isEligible, isLoading } = useVbaEligibility();
 */
export function useVbaEligibility(): VbaEligibility {
  const isFlagEnabled = useSelector(selectMoneyMovementBrazilNeobankEnabled);
  const region = useSelector(selectVbaRegion);
  const geolocationStatus = useSelector(selectGeolocationStatus);

  return useMemo(
    () =>
      getVbaEligibility({
        isFlagEnabled,
        region,
        geolocationStatus,
        isDevBypassEnabled: isBrazilNeobankGeoBypassEnabled(),
      }),
    [isFlagEnabled, region, geolocationStatus],
  );
}

export default useVbaEligibility;
