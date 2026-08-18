import Braze from '@braze/react-native-sdk';
import {
  getBrazeInitialPush,
  subscribeToBrazePushOpens,
} from './BrazeDeeplinks';

const mockRemove = jest.fn();

jest.mock('@braze/react-native-sdk', () => ({
  __esModule: true,
  default: {
    getInitialPushPayload: jest.fn(),
    addListener: jest.fn(() => ({ remove: mockRemove })),
    Events: { PUSH_NOTIFICATION_EVENT: 'pushNotificationEvent' },
  },
}));

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('BrazeDeeplinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBrazeInitialPush', () => {
    it('returns the URL when payload contains a deep link', async () => {
      (Braze.getInitialPushPayload as jest.Mock).mockImplementation(
        (callback) => {
          callback({ url: 'https://link.metamask.io/swap?token=ETH' });
        },
      );

      const result = await getBrazeInitialPush();

      expect(result).toEqual({
        opened: true,
        deeplink: 'https://link.metamask.io/swap?token=ETH',
      });
      expect(Braze.getInitialPushPayload).toHaveBeenCalledTimes(1);
    });

    it('reports no open when payload is null', async () => {
      (Braze.getInitialPushPayload as jest.Mock).mockImplementation(
        (callback) => {
          callback(null);
        },
      );

      const result = await getBrazeInitialPush();

      expect(result).toEqual({ opened: false, deeplink: null });
    });

    // On-chain activity notifications commonly carry no CTA link, so a payload
    // without a URL is still a tap that opened the app.
    it('reports an open with no deeplink when payload has no URL', async () => {
      (Braze.getInitialPushPayload as jest.Mock).mockImplementation(
        (callback) => {
          callback({ url: '', title: 'Test notification' });
        },
      );

      const result = await getBrazeInitialPush();

      expect(result).toEqual({ opened: true, deeplink: null });
    });

    it('reports no open when getInitialPushPayload throws', async () => {
      (Braze.getInitialPushPayload as jest.Mock).mockImplementation(() => {
        throw new Error('Native module error');
      });

      const result = await getBrazeInitialPush();

      expect(result).toEqual({ opened: false, deeplink: null });
    });

    it('handles metamask:// scheme URLs', async () => {
      (Braze.getInitialPushPayload as jest.Mock).mockImplementation(
        (callback) => {
          callback({ url: 'metamask://buy-crypto' });
        },
      );

      const result = await getBrazeInitialPush();

      expect(result).toEqual({
        opened: true,
        deeplink: 'metamask://buy-crypto',
      });
    });
  });

  describe('subscribeToBrazePushOpens', () => {
    it('subscribes to push events and invokes callback with URL', () => {
      const callback = jest.fn();

      subscribeToBrazePushOpens(callback);

      expect(Braze.addListener).toHaveBeenCalledWith(
        'pushNotificationEvent',
        expect.any(Function),
      );

      const handler = (Braze.addListener as jest.Mock).mock.calls[0][1];
      handler({
        payload_type: 'push_opened',
        url: 'https://link.metamask.io/rewards',
        is_braze_internal: false,
        is_silent: false,
      });

      expect(callback).toHaveBeenCalledWith('https://link.metamask.io/rewards');
    });

    it('ignores push_received events (foreground notifications)', () => {
      const callback = jest.fn();

      subscribeToBrazePushOpens(callback);

      const handler = (Braze.addListener as jest.Mock).mock.calls[0][1];
      handler({
        payload_type: 'push_received',
        url: 'https://link.metamask.io/home',
        is_braze_internal: false,
        is_silent: false,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('ignores silent push notifications', () => {
      const callback = jest.fn();

      subscribeToBrazePushOpens(callback);

      const handler = (Braze.addListener as jest.Mock).mock.calls[0][1];
      handler({
        payload_type: 'push_opened',
        url: 'https://link.metamask.io/home',
        is_braze_internal: false,
        is_silent: true,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('ignores Braze internal push notifications', () => {
      const callback = jest.fn();

      subscribeToBrazePushOpens(callback);

      const handler = (Braze.addListener as jest.Mock).mock.calls[0][1];
      handler({
        payload_type: 'push_opened',
        url: 'https://link.metamask.io/home',
        is_braze_internal: true,
        is_silent: false,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('invokes callback with null when push event has no URL', () => {
      const callback = jest.fn();

      subscribeToBrazePushOpens(callback);

      const handler = (Braze.addListener as jest.Mock).mock.calls[0][1];
      handler({
        payload_type: 'push_opened',
        url: '',
        is_braze_internal: false,
        is_silent: false,
      });

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('returns the EmitterSubscription', () => {
      const callback = jest.fn();

      const result = subscribeToBrazePushOpens(callback);

      expect(result).toEqual({ remove: mockRemove });
    });

    it('returns null when addListener throws', () => {
      (Braze.addListener as jest.Mock).mockImplementation(() => {
        throw new Error('Listener error');
      });
      const callback = jest.fn();

      const result = subscribeToBrazePushOpens(callback);

      expect(result).toBeNull();
    });
  });
});
