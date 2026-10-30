import { analytics } from './analytics';
import { MetaMetricsEvents } from '../../core/Analytics/MetaMetrics.events';
import { trackWalletConnectEvent } from './walletConnectTracking';

jest.mock('./analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const mockTrackEvent = analytics.trackEvent as jest.Mock;

describe('trackWalletConnectEvent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the event and its properties to analytics', () => {
    trackWalletConnectEvent(MetaMetricsEvents.REMOTE_CONNECTION_ESTABLISHED, {
      transport_type: 'walletconnect',
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          transport_type: 'walletconnect',
        }),
      }),
    );
  });

  it('swallows analytics errors so they cannot block connection handling', () => {
    mockTrackEvent.mockImplementationOnce(() => {
      throw new Error('analytics is down');
    });

    expect(() =>
      trackWalletConnectEvent(
        MetaMetricsEvents.REMOTE_CONNECTION_ESTABLISHED,
        {},
      ),
    ).not.toThrow();
  });
});
