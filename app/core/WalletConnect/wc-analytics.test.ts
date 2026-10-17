import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { analytics } from '../../util/analytics/analytics';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import {
  getWalletConnectSessionId,
  trackWalletConnectEvent,
} from './wc-analytics';

jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const mockTrackEvent = analytics.trackEvent as jest.Mock;

describe('getWalletConnectSessionId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns a v5 UUID', () => {
    const sessionId = getWalletConnectSessionId('some-pairing-topic');

    expect(uuidValidate(sessionId)).toBe(true);
    expect(uuidVersion(sessionId)).toBe(5);
  });

  it('is deterministic for the same pairing topic', () => {
    // This is the property the whole attribution join depends on: the
    // connection event and the transaction events derive the id independently.
    const first = getWalletConnectSessionId('some-pairing-topic');
    const second = getWalletConnectSessionId('some-pairing-topic');

    expect(first).toBe(second);
  });

  it('returns different ids for different pairing topics', () => {
    const first = getWalletConnectSessionId('pairing-topic-a');
    const second = getWalletConnectSessionId('pairing-topic-b');

    expect(first).not.toBe(second);
  });

  it('does not leak the raw pairing topic', () => {
    const pairingTopic = 'a'.repeat(64);

    expect(getWalletConnectSessionId(pairingTopic)).not.toContain(pairingTopic);
  });
});

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
