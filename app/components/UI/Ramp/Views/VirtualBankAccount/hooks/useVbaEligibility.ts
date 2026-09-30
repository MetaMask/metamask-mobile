import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { GeolocationRequestStatus } from '@metamask/geolocation-controller';
import {
  isBrazilNeobankGeoBypassEnabled,
  selectMoneyMovementBrazilNeobankEnabled,
} from '../../../../../../selectors/featureFlagController/moneyAccount';
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../../selectors/geolocationController';
import { isVbaRegionSupported } from '../../../../../../util/region/isVbaRegionSupported';

export interface VbaEligibility {
  /**
   * Whether the user may enter VBA onboarding. True when the flag is on and
   * IP geolocation is a supported VBA region, or the flag is on and the dev bypass is set.
   */
  isEligible: boolean;
  /** IP lookup has not resolved yet; callers should hold rather than deny. */
  isLoading: boolean;
  /** `moneyMovementBrazilNeobank` remote flag, including its min-version gate. */
  isFlagEnabled: boolean;
  /** IP geolocation resolves to a supported VBA region. */
  isRegionEligible: boolean;
  /** `MM_MONEY_BRAZIL_NEOBANK_GEO_BYPASS=true` in `.js.env`. */
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
}: VbaEligibilityInputs): VbaEligibility {
  const trimmedLocation = location?.trim() || undefined;
  const isRegionEligible = isVbaRegionSupported(trimmedLocation);
  const isLoading =
    !trimmedLocation &&
    (geolocationStatus === undefined ||
      geolocationStatus === 'idle' ||
      geolocationStatus === 'loading');

  return {
    isEligible: isFlagEnabled && (isDevBypassEnabled || isRegionEligible),
    isLoading,
    isFlagEnabled,
    isRegionEligible,
    isDevBypassEnabled,
    location: trimmedLocation,
  };
}

/**
 * Single gate for every Virtual Bank Account entry point (Add funds row, Money
 * home cards, deeplinks). Combines IP geolocation, the version-gated remote
 * flag, the dev escape hatch, and a loading state.
 *
 * @example
 * const { isEligible, isLoading } = useVbaEligibility();
 */
export function useVbaEligibility(): VbaEligibility {
  const isFlagEnabled = useSelector(selectMoneyMovementBrazilNeobankEnabled);
  const location = useSelector(selectGeolocationLocation);
  const geolocationStatus = useSelector(selectGeolocationStatus);

  return useMemo(
    () =>
      getVbaEligibility({
        isFlagEnabled,
        location,
        geolocationStatus,
        isDevBypassEnabled: isBrazilNeobankGeoBypassEnabled(),
      }),
    [isFlagEnabled, location, geolocationStatus],
  );
}

export default useVbaEligibility;
