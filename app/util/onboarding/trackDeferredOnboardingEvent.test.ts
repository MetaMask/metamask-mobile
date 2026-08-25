import { MetaMetricsEvents } from '../../core/Analytics';
import { trackDeferredOnboardingEvent } from './trackDeferredOnboardingEvent';

const mockTrackEvent = jest.fn();
const mockIsEnabled = jest.fn(() => true);

jest.mock('../analytics/analytics', () => ({
  analytics: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    isEnabled: () => mockIsEnabled(),
  },
}));

describe('trackDeferredOnboardingEvent', () => {
  const saveOnboardingEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled.mockReturnValue(true);
  });

  it('tracks immediately when metrics are enabled', () => {
    trackDeferredOnboardingEvent(
      MetaMetricsEvents.LOGIN_ATTEMPTED,
      { login_method: 'password' },
      saveOnboardingEvent,
    );

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.LOGIN_ATTEMPTED.category,
        properties: expect.objectContaining({ login_method: 'password' }),
      }),
    );
    expect(saveOnboardingEvent).not.toHaveBeenCalled();
  });

  it('queues the event when metrics are disabled and a saver is provided', () => {
    mockIsEnabled.mockReturnValue(false);

    trackDeferredOnboardingEvent(
      MetaMetricsEvents.LOGIN_ATTEMPTED,
      { login_method: 'password' },
      saveOnboardingEvent,
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(saveOnboardingEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: MetaMetricsEvents.LOGIN_ATTEMPTED.category,
      }),
    );
  });

  it('tracks when metrics are disabled and no saver is provided', () => {
    mockIsEnabled.mockReturnValue(false);

    trackDeferredOnboardingEvent(MetaMetricsEvents.LOGIN_ATTEMPTED, {
      login_method: 'password',
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
