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
 * @param campaign - The campaign to check. Accepts `null` for convenience when the campaign has not yet loaded — in that case `isGeoLoading` is `true` and `isGeoRestricted` is `false`.
 * @param customRestrictedCountries - An optional set of country codes that are restricted independently of the campaign's `excludedRegions`. When provided this list is checked first; if the user's country is found here the function returns `true` without consulting `excludedRegions`. If not found here, `excludedRegions` is still checked.
 */
const useCampaignGeoRestriction = (
  campaign: CampaignDto | null,
  customRestrictedCountries?: Set<string>,
): UseCampaignGeoRestrictionResult => {
  const geolocation = useSelector(getDetectedGeolocation);
  const geolocationStatus = useSelector(selectGeolocationStatus);

  const isGeoLoading =
    !campaign ||
    geolocationStatus === 'loading' ||
    geolocationStatus === 'idle';

  const isGeoRestricted = useMemo(() => {
    if (__DEV__) return false;
    if (!campaign) return false;
    if (isGeoLoading) return false;
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
  }, [isGeoLoading, geolocation, campaign, customRestrictedCountries]);

  return { isGeoRestricted, isGeoLoading };
};

export default useCampaignGeoRestriction;
