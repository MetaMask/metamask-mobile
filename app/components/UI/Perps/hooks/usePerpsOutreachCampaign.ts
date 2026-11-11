import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismissBanner } from '../../../../reducers/banners';
import { selectDismissedBanners } from '../../../../selectors/banner';
import type { PerpsOutreachBanner } from '../services/perpsOutreachApi';
import { usePerpsOutreachBanner } from './usePerpsOutreachBanner';

const DISMISSAL_KEY_PREFIX = 'perps-outreach:';

export const getPerpsOutreachDismissalKey = (campaignId: string) =>
  `${DISMISSAL_KEY_PREFIX}${campaignId}`;

interface PerpsOutreachCampaignState {
  /** The campaign to show, or null when there is nothing to show right now. */
  campaign: PerpsOutreachBanner | null;
  dismiss: () => void;
}

/**
 * Resolves whether an outreach campaign should be visible, so the banner and
 * the surface hosting it agree: surfaces whose header owns the status-bar inset
 * hand that inset to the banner while it is visible.
 */
export function usePerpsOutreachCampaign(): PerpsOutreachCampaignState {
  const dispatch = useDispatch();
  const dismissedBanners = useSelector(selectDismissedBanners);
  const { data } = usePerpsOutreachBanner();

  const campaign =
    data && !dismissedBanners.includes(getPerpsOutreachDismissalKey(data.id))
      ? data
      : null;

  const dismiss = useCallback(() => {
    if (!campaign) {
      return;
    }
    dispatch(dismissBanner(getPerpsOutreachDismissalKey(campaign.id)));
  }, [campaign, dispatch]);

  return { campaign, dismiss };
}
