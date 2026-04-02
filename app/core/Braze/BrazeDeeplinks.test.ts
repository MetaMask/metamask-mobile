import Braze from '@braze/react-native-sdk';
import { Platform } from 'react-native';
import {
  getBrazeInitialDeeplink,
  subscribeToBrazePushDeeplinks,
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

  describe('getBrazeInitialDeeplink', () => {
    it('returns the URL when payload contains a deep link', async () => {
      (Braze.getInitialPushPayload as jest.Mock).mockImplementation(
        (callback) => {
          callback({ url: 'https://link.metamask.io/swap?token=ETH' });
        },
      );

      const result = await getBrazeInitialDeeplink();

      expect(result).toBe('https://link.metamask.io/swap?token=ETH');
      expect(Braze.getInitialPushPayload).toHaveBeenCalledTimes(1);
    });

    it('returns null when payload is null', async () => {
      (Braze.getInitialPushPayload as jest.Mock).mockImplementation(
        (callback) => {
          callback(null);
        },
      );

      const result = await getBrazeInitialDeeplink();

      expect(result).toBeNull();
    });

    it('returns null when payload has no URL', async () => {
      (Braze.getInitialPushPayload as jest.Mock).mockImplementation(
        (callback) => {
          callback({ url: '', title: 'Test notification' });
        },
      );

      const result = await getBrazeInitialDeeplink();

      expect(result).toBeNull();
    });

    it('returns null when getInitialPushPayload throws', async () => {
      (Braze.getInitialPushPayload as jest.Mock).mockImplementation(() => {
        throw new Error('Native module error');
      });

      const result = await getBrazeInitialDeeplink();

      expect(result).toBeNull();
    });

    it('handles metamask:// scheme URLs', async () => {
      (Braze.getInitialPushPayload as jest.Mock).mockImplementation(
        (callback) => {
          callback({ url: 'metamask://buy-crypto' });
        },
      );

      const result = await getBrazeInitialDeeplink();

      expect(result).toBe('metamask://buy-crypto');
    });
  });

  describe('subscribeToBrazePushDeeplinks', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { value: originalPlatform });
    });

    it('subscribes to push events on Android and invokes callback with URL', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      const callback = jest.fn();

      subscribeToBrazePushDeeplinks(callback);

      expect(Braze.addListener).toHaveBeenCalledWith(
        'pushNotificationEvent',
        expect.any(Function),
      );

      const handler = (Braze.addListener as jest.Mock).mock.calls[0][1];
      handler({
        url: 'https://link.metamask.io/rewards',
        is_braze_internal: false,
        is_silent: false,
      });

      expect(callback).toHaveBeenCalledWith('https://link.metamask.io/rewards');
    });

    it('returns null on iOS without subscribing', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios' });
      const callback = jest.fn();

      const result = subscribeToBrazePushDeeplinks(callback);

      expect(result).toBeNull();
      expect(Braze.addListener).not.toHaveBeenCalled();
    });

    it('ignores silent push notifications', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      const callback = jest.fn();

      subscribeToBrazePushDeeplinks(callback);

      const handler = (Braze.addListener as jest.Mock).mock.calls[0][1];
      handler({
        url: 'https://link.metamask.io/home',
        is_braze_internal: false,
        is_silent: true,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('ignores Braze internal push notifications', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      const callback = jest.fn();

      subscribeToBrazePushDeeplinks(callback);

      const handler = (Braze.addListener as jest.Mock).mock.calls[0][1];
      handler({
        url: 'https://link.metamask.io/home',
        is_braze_internal: true,
        is_silent: false,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('does not invoke callback when push event has no URL', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      const callback = jest.fn();

      subscribeToBrazePushDeeplinks(callback);

      const handler = (Braze.addListener as jest.Mock).mock.calls[0][1];
      handler({
        url: '',
        is_braze_internal: false,
        is_silent: false,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('returns the EmitterSubscription on Android', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      const callback = jest.fn();

      const result = subscribeToBrazePushDeeplinks(callback);

      expect(result).toEqual({ remove: mockRemove });
    });

    it('returns null when addListener throws', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      (Braze.addListener as jest.Mock).mockImplementation(() => {
        throw new Error('Listener error');
      });
      const callback = jest.fn();

      const result = subscribeToBrazePushDeeplinks(callback);

      expect(result).toBeNull();
    });
  });
});
