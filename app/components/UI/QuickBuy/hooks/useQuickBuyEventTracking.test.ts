import { act, renderHook } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useQuickBuyEventTracking } from './useQuickBuyEventTracking';

jest.mock('../../../hooks/useAnalytics/useAnalytics');

describe('useQuickBuyEventTracking', () => {
  it('tracks the shared event with the Gacha source through the platform builder', () => {
    const trackEvent = jest.fn();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent,
        createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
      }),
    );
    const { result } = renderHook(useQuickBuyEventTracking);

    act(() =>
      result.current.track(MetaMetricsEvents.SOCIAL_QUICK_BUY_TRADE_SUBMITTED, {
        source: 'gacha',
      }),
    );

    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Quick Buy Trade Submitted',
        properties: { source: 'gacha' },
      }),
    );
  });
});
