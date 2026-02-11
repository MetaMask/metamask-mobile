import SupportService from '../SupportService';
import IntercomService from '../IntercomService';
import { getIntercomFeatureFlags, isIntercomConfigured } from '../config';
import { Linking } from 'react-native';

// Mock dependencies
jest.mock('../IntercomService', () => ({
  __esModule: true,
  default: {
    isInitialized: jest.fn().mockReturnValue(false),
    initialize: jest.fn().mockResolvedValue(undefined),
    updateUserAttributes: jest.fn().mockResolvedValue(undefined),
    presentMessenger: jest.fn().mockResolvedValue(undefined),
    getAnonymousUUID: jest.fn().mockReturnValue('test-uuid-1234'),
    getUnreadCount: jest.fn().mockResolvedValue(3),
  },
}));

jest.mock('../config', () => ({
  getIntercomFeatureFlags: jest.fn(),
  isIntercomConfigured: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../../locales/i18n', () => ({
  locale: 'en-US',
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Linking: {
    canOpenURL: jest.fn().mockResolvedValue(true),
    openURL: jest.fn().mockResolvedValue(undefined),
  },
  Clipboard: {
    setString: jest.fn(),
  },
}));

describe('SupportService', () => {
  const mockFlags = {
    surveys_enabled_mobile: true,
    support_enabled_mobile: true,
    kill_switch: false,
    min_orders_7d: 1,
    cooldown_days: 14,
    suppress_after_action_days: 30,
    cohorts: ['all'],
    locales: ['en'],
  };

  const mockSupportContext = {
    featureArea: 'settings' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getIntercomFeatureFlags as jest.Mock).mockResolvedValue(mockFlags);
    (isIntercomConfigured as jest.Mock).mockReturnValue(true);
  });

  describe('openSupport', () => {
    it('opens Intercom Messenger when configured', async () => {
      (IntercomService.isInitialized as jest.Mock).mockReturnValue(true);

      await SupportService.openSupport(mockSupportContext);

      expect(IntercomService.presentMessenger).toHaveBeenCalled();
    });

    it('initializes Intercom if not already initialized', async () => {
      (IntercomService.isInitialized as jest.Mock).mockReturnValue(false);

      await SupportService.openSupport(mockSupportContext);

      expect(IntercomService.initialize).toHaveBeenCalled();
      expect(IntercomService.presentMessenger).toHaveBeenCalled();
    });

    it('updates user attributes with feature area', async () => {
      (IntercomService.isInitialized as jest.Mock).mockReturnValue(true);

      await SupportService.openSupport({
        featureArea: 'swap',
      });

      expect(IntercomService.updateUserAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          feature_area: 'swap',
          platform: 'iOS',
          locale: 'en',
        }),
      );
    });

    it('falls back to browser when Intercom not configured', async () => {
      (isIntercomConfigured as jest.Mock).mockReturnValue(false);

      await SupportService.openSupport(mockSupportContext);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://support.metamask.io',
      );
      expect(IntercomService.presentMessenger).not.toHaveBeenCalled();
    });

    it('falls back to browser when kill switch is on', async () => {
      (getIntercomFeatureFlags as jest.Mock).mockResolvedValue({
        ...mockFlags,
        kill_switch: true,
      });

      await SupportService.openSupport(mockSupportContext);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://support.metamask.io',
      );
    });

    it('falls back to browser when support is disabled', async () => {
      (getIntercomFeatureFlags as jest.Mock).mockResolvedValue({
        ...mockFlags,
        support_enabled_mobile: false,
      });

      await SupportService.openSupport(mockSupportContext);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://support.metamask.io',
      );
    });

    it('falls back to browser on SDK error', async () => {
      (IntercomService.isInitialized as jest.Mock).mockReturnValue(true);
      (IntercomService.presentMessenger as jest.Mock).mockRejectedValue(
        new Error('SDK error'),
      );

      await SupportService.openSupport(mockSupportContext);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://support.metamask.io',
      );
    });
  });

  describe('isSupportAvailable', () => {
    it('returns true when configured and enabled', async () => {
      const result = await SupportService.isSupportAvailable();

      expect(result).toBe(true);
    });

    it('returns false when not configured', async () => {
      (isIntercomConfigured as jest.Mock).mockReturnValue(false);

      const result = await SupportService.isSupportAvailable();

      expect(result).toBe(false);
    });

    it('returns false when kill switch is on', async () => {
      (getIntercomFeatureFlags as jest.Mock).mockResolvedValue({
        ...mockFlags,
        kill_switch: true,
      });

      const result = await SupportService.isSupportAvailable();

      expect(result).toBe(false);
    });

    it('returns false when support is disabled', async () => {
      (getIntercomFeatureFlags as jest.Mock).mockResolvedValue({
        ...mockFlags,
        support_enabled_mobile: false,
      });

      const result = await SupportService.isSupportAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread count when initialized', async () => {
      (IntercomService.isInitialized as jest.Mock).mockReturnValue(true);

      const count = await SupportService.getUnreadCount();

      expect(count).toBe(3);
    });

    it('returns 0 when not initialized', async () => {
      (IntercomService.isInitialized as jest.Mock).mockReturnValue(false);

      const count = await SupportService.getUnreadCount();

      expect(count).toBe(0);
    });
  });

  describe('openFallbackSupport', () => {
    it('opens Help Center URL in browser', async () => {
      await SupportService.openFallbackSupport();

      expect(Linking.canOpenURL).toHaveBeenCalledWith(
        'https://support.metamask.io',
      );
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://support.metamask.io',
      );
    });
  });
});
