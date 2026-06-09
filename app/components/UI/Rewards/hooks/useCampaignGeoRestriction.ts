import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { type CampaignDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { selectGeolocationStatus } from '../../../../selectors/geolocationController';

interface UseCampaignGeoRestrictionResult {
  isGeoRestricted: boolean;
  isGeoLoading: boolean;
}

/**
 * Determines whether the current user's geolocation restricts them from
 * participating in the given campaign.
 *
 * @param campaign - The campaign to check. Accepts `null` for convenience when the campaign has not yet loaded — in that case `isGeoLoading` is `true` and `isGeoRestricted` is `true` (safe/restricted default while undetermined).
 * @param customRestrictedCountries - An optional set of country codes that are restricted independently of the campaign's `excludedRegions`. When provided this list is checked first; if the user's country is found here the function returns `true` without consulting `excludedRegions`. If not found here, `excludedRegions` is still checked.
 * @param isFeatureGeoRestricted - When `true`, the user is treated as geo-restricted because the underlying product feature (e.g. Predict, Perps) is unavailable in their region, regardless of campaign-level geo checks. Feature restriction is authoritative, so `isGeoLoading` is returned as `false` in that case.
 */
const useCampaignGeoRestriction = (
  campaign: CampaignDto | null,
  customRestrictedCountries?: Set<string>,
  isFeatureGeoRestricted?: boolean,
): UseCampaignGeoRestrictionResult => {
  const geolocation = useSelector(getDetectedGeolocation);
  const geolocationStatus = useSelector(selectGeolocationStatus);

  const isGeoLoading =
    !campaign ||
    !geolocationStatus ||
    geolocationStatus === 'loading' ||
    geolocationStatus === 'idle';

  const isGeoRestricted = useMemo(() => {
    if (isFeatureGeoRestricted) return true;
    if (isGeoLoading) return true;
    const country = geolocation?.toUpperCase().split('-')[0];

    // Check the custom list first (if provided).
    if (customRestrictedCountries) {
      if (!country || customRestrictedCountries.has(country)) return true;
    }

    // Then fall through to the campaign's own excluded regions.
    if (!country) return campaign.excludedRegions.length > 0;
    return campaign.excludedRegions.some(
      (region) => region.toUpperCase() === country,
    );
  }, [
    isGeoLoading,
    geolocation,
    campaign,
    customRestrictedCountries,
    isFeatureGeoRestricted,
  ]);

  return {
    isGeoRestricted,
    isGeoLoading: isFeatureGeoRestricted ? false : isGeoLoading,
  };
};

export default useCampaignGeoRestriction;
