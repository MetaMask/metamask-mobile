import { useEffect, useRef } from 'react';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';

interface UseTrackRewardsPageViewParams {
  page_type: string;
  campaign_id?: string;
}

/**
 * Fires REWARDS_PAGE_VIEWED once per unique (page_type, campaign_id) combination.
 * Re-fires if the component instance receives different params (e.g. navigating
 * between campaigns on the same mounted screen via React Navigation).
 */
const useTrackRewardsPageView = ({
  page_type,
  campaign_id,
}: UseTrackRewardsPageViewParams): void => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const trackedKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${page_type}::${campaign_id ?? ''}`;
    if (trackedKey.current === key) return;

    const properties: { page_type: string; campaign_id?: string } = {
      page_type,
    };
    if (campaign_id !== undefined) {
      properties.campaign_id = campaign_id;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_VIEWED)
        .addProperties(properties)
        .build(),
    );
    trackedKey.current = key;
  }, [trackEvent, createEventBuilder, page_type, campaign_id]);
};

export default useTrackRewardsPageView;
