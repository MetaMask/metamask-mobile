import { renderHook } from '@testing-library/react-native';

import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AnalyticsEventBuilder } from '../../analytics/AnalyticsEventBuilder';
import { createMockUseAnalyticsHook } from '../../test/analyticsMock';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { usePushPrePromptAnalytics } from './usePushPrePromptAnalytics';

jest.mock('../../../components/hooks/useAnalytics/useAnalytics');

describe('usePushPrePromptAnalytics', () => {
  const mockIdentify = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn(
    AnalyticsEventBuilder.createEventBuilder,
  );

  const getLastTrackedEvent = () =>
    mockTrackEvent.mock.calls[mockTrackEvent.mock.calls.length - 1][0];

  beforeEach(() => {
    jest.clearAllMocks();
    mockIdentify.mockResolvedValue(undefined);
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        createEventBuilder: mockCreateEventBuilder,
        identify: mockIdentify,
        trackEvent: mockTrackEvent,
      }),
    );
  });

  it('tracks the pre-prompt viewed event', () => {
    const { result } = renderHook(() => usePushPrePromptAnalytics());

    result.current.trackPrePromptViewed('push_permission');

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.PUSH_NOTIFICATION_PRE_PROMPT_VIEWED,
    );
    expect(getLastTrackedEvent()).toEqual(
      expect.objectContaining({
        name: MetaMetricsEvents.PUSH_NOTIFICATION_PRE_PROMPT_VIEWED.category,
        properties: {},
      }),
    );
  });

  it.each([
    ['dismissed' as const, () => ['trackPrePromptDismissed'], 'dismiss'],
    [
      'allowed with the push permission CTA' as const,
      () => ['trackPrePromptButtonClicked', 'push_permission', 'yes'],
      'allow',
    ],
    [
      'allowed with the marketing consent CTA' as const,
      () => ['trackPrePromptButtonClicked', 'marketing_consent', 'confirm'],
      'allow',
    ],
    [
      'denied with the not now CTA' as const,
      () => ['trackPrePromptButtonClicked', 'marketing_consent', 'not_now'],
      'deny',
    ],
    [
      'denied with the push permission not now CTA' as const,
      () => ['trackPrePromptButtonClicked', 'push_permission', 'not_now'],
      'deny',
    ],
  ])(
    'tracks the pre-prompt button when %s',
    (_label, getAction, buttonType) => {
      const { result } = renderHook(() => usePushPrePromptAnalytics());
      const [method, variant, button] = getAction();

      if (method === 'trackPrePromptDismissed') {
        result.current.trackPrePromptDismissed('marketing_consent');
      } else {
        result.current.trackPrePromptButtonClicked(
          variant as 'push_permission' | 'marketing_consent',
          button as 'yes' | 'not_now' | 'confirm',
        );
      }

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.PUSH_NOTIFICATION_PRE_PROMPT_BUTTON_CLICKED,
      );
      expect(getLastTrackedEvent()).toEqual(
        expect.objectContaining({
          name: MetaMetricsEvents.PUSH_NOTIFICATION_PRE_PROMPT_BUTTON_CLICKED
            .category,
          properties: { button_type: buttonType },
        }),
      );
    },
  );

  it.each([
    ['allowed' as const, 'allow'],
    ['denied' as const, 'deny'],
  ])(
    'tracks the OS prompt response when permission is %s',
    (response, buttonType) => {
      const { result } = renderHook(() => usePushPrePromptAnalytics());

      result.current.trackOsPromptResponse('push_permission', response);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.OS_PUSH_NOTIFICATION_BUTTON_CLICKED,
      );
      expect(getLastTrackedEvent()).toEqual(
        expect.objectContaining({
          name: MetaMetricsEvents.OS_PUSH_NOTIFICATION_BUTTON_CLICKED.category,
          properties: { button_type: buttonType },
        }),
      );
    },
  );

  it('keeps OS prompt shown as a noop because the schema has no shown event', () => {
    const { result } = renderHook(() => usePushPrePromptAnalytics());

    result.current.trackOsPromptShown('push_permission');

    expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('identifies push notifications enabled', async () => {
    const { result } = renderHook(() => usePushPrePromptAnalytics());

    await result.current.identifyPushNotificationsEnabled(true);

    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: true,
    });
  });

  it('identifies marketing consent', async () => {
    const { result } = renderHook(() => usePushPrePromptAnalytics());

    await result.current.identifyMarketingConsent(true);

    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    });
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
