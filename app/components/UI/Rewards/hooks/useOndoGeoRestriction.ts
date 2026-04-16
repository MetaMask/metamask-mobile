import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  type CampaignDto,
  CampaignType,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { ONDO_RESTRICTED_COUNTRIES } from '../../../../util/ondoGeoRestrictions';
import { selectGeolocationStatus } from '../../../../selectors/geolocationController';

interface UseOndoGeoRestrictionResult {
  isGeoRestricted: boolean;
  isGeoLoading: boolean;
}

/**
 * Determines whether the current user's geolocation restricts them from
 * participating in the given campaign.
 *
 * Accepts `null` as a convenience so callers can pass a campaign that may
 * not yet be loaded — in that case `isGeoLoading` is `true` and
 * `isGeoRestricted` is `false`.
 */
const useOndoGeoRestriction = (
  campaign: CampaignDto | null,
): UseOndoGeoRestrictionResult => {
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
    if (campaign.type === CampaignType.ONDO_HOLDING) {
      return !country || ONDO_RESTRICTED_COUNTRIES.has(country);
    }
    // Unknown country: can't confirm user is not in an excluded region, so block.
    // If the campaign has no exclusions this is a no-op.
    if (!country) return campaign.excludedRegions.length > 0;
    return campaign.excludedRegions.some(
      (region) => region.toUpperCase() === country,
    );
  }, [isGeoLoading, geolocation, campaign]);

  return { isGeoRestricted, isGeoLoading };
};

export default useOndoGeoRestriction;
