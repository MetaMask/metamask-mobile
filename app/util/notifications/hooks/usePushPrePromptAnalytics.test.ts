import { act, renderHook } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { usePushPrePromptAnalytics } from './usePushPrePromptAnalytics';

const mockTrackEvent = jest.fn();
const mockAddTraitsToUser = jest.fn();
interface MockEventBuilder {
  properties: Record<string, unknown>;
  addProperties: jest.Mock<MockEventBuilder, [Record<string, unknown>]>;
  build: jest.Mock<{
    event: unknown;
    properties: Record<string, unknown>;
  }>;
}

const mockCreateEventBuilder = jest.fn((event) => {
  const builder = {} as MockEventBuilder;
  builder.properties = {};
  builder.addProperties = jest.fn((properties) => {
    builder.properties = properties;
    return builder;
  });
  builder.build = jest.fn(() => ({
    event,
    properties: builder.properties,
  }));

  return builder;
});

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
    addTraitsToUser: mockAddTraitsToUser,
  }),
}));

describe('usePushPrePromptAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks pre-prompt viewed with the prompt variant', () => {
    const { result } = renderHook(() => usePushPrePromptAnalytics());

    act(() => {
      result.current.trackPrePromptViewed('push_permission');
    });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: MetaMetricsEvents.PUSH_PRE_PROMPT_VIEWED,
      properties: { variant: 'push_permission' },
    });
  });

  it('tracks pre-prompt button clicks with the prompt variant and button', () => {
    const { result } = renderHook(() => usePushPrePromptAnalytics());

    act(() => {
      result.current.trackPrePromptButtonClicked(
        'marketing_consent',
        'confirm',
      );
    });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: MetaMetricsEvents.PUSH_PRE_PROMPT_BUTTON_CLICKED,
      properties: { variant: 'marketing_consent', button: 'confirm' },
    });
  });

  it('tracks OS prompt response with the prompt variant and response', () => {
    const { result } = renderHook(() => usePushPrePromptAnalytics());

    act(() => {
      result.current.trackOsPromptResponse('push_permission', 'allowed');
    });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: MetaMetricsEvents.PUSH_OS_PROMPT_RESPONSE,
      properties: { variant: 'push_permission', response: 'allowed' },
    });
  });

  it('identifies push and marketing user traits', async () => {
    const { result } = renderHook(() => usePushPrePromptAnalytics());

    await act(async () => {
      await result.current.identifyPushNotificationsEnabled(true);
      await result.current.identifyMarketingConsent(true);
    });

    expect(mockAddTraitsToUser).toHaveBeenCalledWith({
      [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: true,
    });
    expect(mockAddTraitsToUser).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    });
  });
});
