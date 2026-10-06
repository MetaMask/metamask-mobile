import { useCallback } from 'react';
import type { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';

/**
 * Quick Buy is shared by Social, token details, Explore and Gacha. The legacy
 * SOCIAL_QUICK_BUY catalog keys name generic "Quick Buy" events; their source
 * property identifies the host without attributing every trade to Social.
 */
export const useQuickBuyEventTracking = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const track = useCallback(
    (
      event: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents],
      properties: Record<string, unknown> = {},
    ): void => {
      trackEvent(createEventBuilder(event).addProperties(properties).build());
    },
    [trackEvent, createEventBuilder],
  );
  return { track };
};
