import { renderHook } from '@testing-library/react-native';

import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  createMockEventBuilder,
  createMockUseAnalyticsHook,
} from '../../test/analyticsMock';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { usePushPrePromptAnalytics } from './usePushPrePromptAnalytics';

jest.mock('../../../components/hooks/useAnalytics/useAnalytics');

describe('usePushPrePromptAnalytics', () => {
  const mockIdentify = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockBuiltEvent = {
    name: MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
    properties: {},
    sensitiveProperties: {},
    saveDataRecording: true,
    get isAnonymous() {
      return false;
    },
    get hasProperties() {
      return true;
    },
  };
  const mockEventBuilder = createMockEventBuilder(mockBuiltEvent);
  const mockCreateEventBuilder = jest.fn(() => mockEventBuilder);

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

  it('exposes noop callbacks for analytics events that are not wired yet', async () => {
    const { result } = renderHook(() => usePushPrePromptAnalytics());

    expect(() => {
      result.current.trackPrePromptViewed('push_permission');
      result.current.trackPrePromptDismissed('marketing_consent');
      result.current.trackPrePromptButtonClicked(
        'marketing_consent',
        'confirm',
      );
      result.current.trackOsPromptShown('push_permission');
      result.current.trackOsPromptResponse('push_permission', 'allowed');
    }).not.toThrow();

    await expect(
      result.current.identifyPushNotificationsEnabled(true),
    ).resolves.toBeUndefined();
  });

  it('identifies marketing consent and tracks the preference selection', async () => {
    const { result } = renderHook(() => usePushPrePromptAnalytics());

    await result.current.identifyMarketingConsent(true);

    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    });
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
    );
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
      updated_after_onboarding: true,
      location: 'push_pre_prompt',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(mockBuiltEvent);
  });
});
