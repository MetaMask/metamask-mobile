import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { GeolocationRequestStatus } from '@metamask/geolocation-controller';
import {
  isVbaGeoBypassEnabled,
  selectNeobankMarkets,
} from '../../../../../../selectors/featureFlagController/moneyAccount';
import { selectGeolocationStatus } from '../../../../../../selectors/geolocationController';
import { selectVbaEffectiveLocation } from '../../../../../../selectors/vbaEffectiveLocation';
import {
  getVbaMarketForCountry,
  type VbaMarket,
} from '../../../../../../util/region/getVbaSourceCurrency';

export interface VbaEligibility {
  /**
   * Whether the user may start a new VBA signup. True when an open currency
   * flag lists the effective country, or when at least one currency flag is
   * open and the dev bypass is set. The effective location comes from
   * `selectVbaEffectiveLocation`: `regionOverride`, then the stored KYC
   * session country, then the IP location.
   */
  isEligible: boolean;
  /**
   * No effective location yet and the IP lookup has not resolved; callers
   * should hold rather than deny. A stored KYC country or override skips it.
   */
  isLoading: boolean;
  /**
   * At least one per-currency market is open for this binary. Missing,
   * disabled, malformed, or too-old currency flags yield false.
   */
  isFlagEnabled: boolean;
  /** An open currency flag lists the effective location's country. */
  isRegionEligible: boolean;
  /** `MM_MONEY_VBA_GEO_BYPASS=true` in `.js.env`. */
  isDevBypassEnabled: boolean;
  /**
   * Effective location: `regionOverride` from `moneyMovementNeobank` when set,
   * then the country the stored KYC session was started under, otherwise the
   * GeolocationController IP location, such as `BR` or `US-CA`.
   */
  location: string | undefined;
}

export interface VbaEligibilityInputs {
  isFlagEnabled: boolean;
  /** Effective location from `selectVbaEffectiveLocation`. Not the Settings region. */
  location: string | undefined | null;
  geolocationStatus: GeolocationRequestStatus | undefined;
  isDevBypassEnabled: boolean;
  /** Open per-currency markets from `selectNeobankMarkets`. */
  markets: readonly VbaMarket[];
}

/**
 * Pure eligibility resolution so the rule can be unit tested without Redux.
 *
 * `location` is the effective location. The hook passes
 * `selectVbaEffectiveLocation`: `regionOverride` from `moneyMovementNeobank`
 * when the flag sets one, then the stored KYC session country, otherwise the
 * GeolocationController IP lookup. The Settings region picker
 * (`RampsController.userRegion`) is not consulted. An override or stored
 * country still has to be listed by an open market. `isFlagEnabled` is true
 * when at least one currency flag is open.
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
 * home cards). Combines the effective location (`selectVbaEffectiveLocation`),
 * the per-currency markets, the dev escape hatch, and a loading state.
 *
 * @example
 * const { isEligible, isLoading } = useVbaEligibility();
 */
export function useVbaEligibility(): VbaEligibility {
  const markets = useSelector(selectNeobankMarkets);
  const location = useSelector(selectVbaEffectiveLocation);
  const geolocationStatus = useSelector(selectGeolocationStatus);
  const isFlagEnabled = markets.length > 0;

  return useMemo(
    () =>
      getVbaEligibility({
        isFlagEnabled,
        location,
        geolocationStatus,
        isDevBypassEnabled: isVbaGeoBypassEnabled(),
        markets,
      }),
    [isFlagEnabled, location, geolocationStatus, markets],
  );
}

export default useVbaEligibility;
