import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { GeolocationRequestStatus } from '@metamask/geolocation-controller';
import {
  isVbaGeoBypassEnabled,
  selectMoneyMovementNeobank,
  selectNeobankMarkets,
} from '../../../../../../selectors/featureFlagController/moneyAccount';
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../../selectors/geolocationController';
import {
  getVbaMarketForCountry,
  type VbaMarket,
} from '../../../../../../util/region/getVbaSourceCurrency';

export interface VbaEligibility {
  /**
   * Whether the user may start a new VBA signup. True when
   * `moneyMovementNeobank` is enabled for this binary and an open currency
   * flag lists the effective country, or the flag is enabled and the dev
   * bypass is set. The effective location
   * is `regionOverride` when the flag sets one, otherwise the IP location.
   */
  isEligible: boolean;
  /** IP lookup has not resolved yet; callers should hold rather than deny. */
  isLoading: boolean;
  /**
   * `moneyMovementNeobank` is enabled for this binary. Missing, disabled,
   * malformed, or too old is false.
   */
  isFlagEnabled: boolean;
  /** An open currency flag lists the effective location's country. */
  isRegionEligible: boolean;
  /** `MM_MONEY_VBA_GEO_BYPASS=true` in `.js.env`. */
  isDevBypassEnabled: boolean;
  /**
   * Effective location: `regionOverride` from `moneyMovementNeobank` when set,
   * otherwise the GeolocationController IP location, such as `BR` or `US-CA`.
   */
  location: string | undefined;
}

export interface VbaEligibilityInputs {
  isFlagEnabled: boolean;
  /** GeolocationController `location` (IP lookup). Not the Settings region. */
  location: string | undefined | null;
  geolocationStatus: GeolocationRequestStatus | undefined;
  isDevBypassEnabled: boolean;
  /** Open per-currency markets from `selectNeobankMarkets`. */
  markets: readonly VbaMarket[];
}

/**
 * Pure eligibility resolution so the rule can be unit tested without Redux.
 *
 * `location` is the effective location. The hook passes `regionOverride` from
 * `moneyMovementNeobank` when the flag sets one, otherwise the
 * GeolocationController IP lookup. The Settings region picker
 * (`RampsController.userRegion`) is not consulted. An override country still
 * has to be listed by an open market.
 */
export function getVbaEligibility({
  isFlagEnabled,
  location,
  geolocationStatus,
  isDevBypassEnabled,
  markets,
}: VbaEligibilityInputs): VbaEligibility {
  const trimmedLocation = location?.trim() || undefined;
  const isRegionEligible =
    getVbaMarketForCountry(markets, trimmedLocation) !== undefined;
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
 * home cards, deeplinks). Combines the effective location, `moneyMovementNeobank`
 * (enabled, minimumVersion, and optional regionOverride), the per-currency
 * markets, the dev escape hatch, and a loading state.
 *
 * @example
 * const { isEligible, isLoading } = useVbaEligibility();
 */
export function useVbaEligibility(): VbaEligibility {
  const { isEnabled: isFlagEnabled, regionOverride } = useSelector(
    selectMoneyMovementNeobank,
  );
  const markets = useSelector(selectNeobankMarkets);
  const location = useSelector(selectGeolocationLocation);
  const geolocationStatus = useSelector(selectGeolocationStatus);

  return useMemo(
    () =>
      getVbaEligibility({
        isFlagEnabled,
        location: regionOverride ?? location,
        geolocationStatus,
        isDevBypassEnabled: isVbaGeoBypassEnabled(),
        markets,
      }),
    [isFlagEnabled, location, geolocationStatus, regionOverride, markets],
  );
}

export default useVbaEligibility;
