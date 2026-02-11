import IntercomService from '../IntercomService';
import Intercom, { IntercomContent } from '@intercom/intercom-react-native';
import { getIntercomConfig } from '../config';
import Logger from '../../../util/Logger';

// Mock dependencies
jest.mock('@intercom/intercom-react-native', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
    loginUnidentifiedUser: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn().mockResolvedValue(undefined),
    setLauncherVisibility: jest.fn().mockResolvedValue(undefined),
    setInAppMessageVisibility: jest.fn().mockResolvedValue(undefined),
    present: jest.fn().mockResolvedValue(undefined),
    presentContent: jest.fn().mockResolvedValue(undefined),
    logEvent: jest.fn().mockResolvedValue(undefined),
    updateUser: jest.fn().mockResolvedValue(undefined),
    getUnreadConversationCount: jest.fn().mockResolvedValue(5),
    hideIntercom: jest.fn().mockResolvedValue(undefined),
    bootstrapEventListeners: jest.fn().mockReturnValue(() => undefined),
  },
  Visibility: {
    VISIBLE: 'VISIBLE',
    GONE: 'GONE',
  },
  IntercomContent: {
    surveyWithSurveyId: jest.fn((id) => ({ type: 'survey', surveyId: id })),
  },
  IntercomEvents: {
    IntercomWindowDidHide: 'IntercomWindowDidHide',
    IntercomUnreadCountDidChange: 'IntercomUnreadCountDidChange',
  },
}));

jest.mock('../config', () => ({
  getIntercomConfig: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  NativeModules: {
    IntercomEventEmitter: {},
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  })),
}));

describe('IntercomService', () => {
  const mockConfig = {
    appId: 'test-app-id',
    iosApiKey: 'ios_sdk-test-key',
    androidApiKey: 'android_sdk-test-key',
  };

  const MockIntercom = Intercom as jest.Mocked<typeof Intercom>;

  beforeEach(() => {
    jest.clearAllMocks();
    (getIntercomConfig as jest.Mock).mockReturnValue(mockConfig);

    // Reset the singleton's initialized state
    // We need to access the private property for testing
    (IntercomService as unknown as { initialized: boolean }).initialized =
      false;
    (
      IntercomService as unknown as { initializationPromise: null }
    ).initializationPromise = null;
  });

  describe('isInitialized', () => {
    it('returns false when not initialized', () => {
      expect(IntercomService.isInitialized()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('initializes Intercom SDK with correct config', async () => {
      await IntercomService.initialize();

      expect(MockIntercom.initialize).toHaveBeenCalledWith(
        'ios_sdk-test-key',
        'test-app-id',
      );
      expect(MockIntercom.loginUnidentifiedUser).toHaveBeenCalled();
      expect(IntercomService.isInitialized()).toBe(true);
    });

    it('uses loginUnidentifiedUser (not identified login)', async () => {
      await IntercomService.initialize();

      // CRITICAL: We must use unidentified user for privacy
      expect(MockIntercom.loginUnidentifiedUser).toHaveBeenCalledTimes(1);
    });

    it('hides default launcher after init', async () => {
      await IntercomService.initialize();

      expect(MockIntercom.setLauncherVisibility).toHaveBeenCalledWith('GONE');
    });

    it('does not initialize twice', async () => {
      await IntercomService.initialize();
      await IntercomService.initialize();

      expect(MockIntercom.initialize).toHaveBeenCalledTimes(1);
    });

    it('throws error when API key is missing', async () => {
      (getIntercomConfig as jest.Mock).mockReturnValue({
        appId: 'test-app-id',
        iosApiKey: '',
        androidApiKey: '',
      });

      await expect(IntercomService.initialize()).rejects.toThrow();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('throws error when App ID is missing', async () => {
      (getIntercomConfig as jest.Mock).mockReturnValue({
        appId: '',
        iosApiKey: 'ios_sdk-test-key',
        androidApiKey: 'android_sdk-test-key',
      });

      await expect(IntercomService.initialize()).rejects.toThrow(
        'Intercom App ID not configured',
      );
    });
  });

  describe('shutdown', () => {
    it('logs out and resets initialized state', async () => {
      await IntercomService.initialize();
      await IntercomService.shutdown();

      expect(MockIntercom.logout).toHaveBeenCalled();
      expect(IntercomService.isInitialized()).toBe(false);
    });

    it('does nothing if not initialized', async () => {
      await IntercomService.shutdown();

      expect(MockIntercom.logout).not.toHaveBeenCalled();
    });
  });

  describe('updateUserAttributes', () => {
    it('updates user with non-PII metadata', async () => {
      await IntercomService.initialize();

      await IntercomService.updateUserAttributes({
        app_version: '7.65.0',
        platform: 'iOS',
        locale: 'en',
        feature_area: 'settings',
      });

      expect(MockIntercom.updateUser).toHaveBeenCalledWith({
        customAttributes: expect.objectContaining({
          app_version: '7.65.0',
          platform: 'iOS',
          locale: 'en',
          feature_area: 'settings',
        }),
      });
    });

    it('warns if not initialized', async () => {
      await IntercomService.updateUserAttributes({
        app_version: '7.65.0',
        platform: 'iOS',
        locale: 'en',
      });

      expect(Logger.error).toHaveBeenCalled();
      expect(MockIntercom.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('presentMessenger', () => {
    it('presents Intercom messenger when initialized', async () => {
      await IntercomService.initialize();
      await IntercomService.presentMessenger();

      expect(MockIntercom.present).toHaveBeenCalled();
    });

    it('throws if not initialized', async () => {
      await expect(IntercomService.presentMessenger()).rejects.toThrow(
        'Intercom not initialized',
      );
    });
  });

  describe('presentSurvey', () => {
    it('presents survey with correct ID', async () => {
      await IntercomService.initialize();
      await IntercomService.presentSurvey('survey-123');

      expect(IntercomContent.surveyWithSurveyId).toHaveBeenCalledWith(
        'survey-123',
      );
      expect(MockIntercom.presentContent).toHaveBeenCalled();
    });

    it('throws if not initialized', async () => {
      await expect(IntercomService.presentSurvey('survey-123')).rejects.toThrow(
        'Intercom not initialized',
      );
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread count when initialized', async () => {
      await IntercomService.initialize();
      const count = await IntercomService.getUnreadCount();

      expect(count).toBe(5);
    });

    it('returns 0 if not initialized', async () => {
      const count = await IntercomService.getUnreadCount();

      expect(count).toBe(0);
    });
  });

  describe('anonymous UUID', () => {
    it('generates a UUID', () => {
      const uuid = IntercomService.getAnonymousUUID();

      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('returns same UUID on subsequent calls', () => {
      const uuid1 = IntercomService.getAnonymousUUID();
      const uuid2 = IntercomService.getAnonymousUUID();

      expect(uuid1).toBe(uuid2);
    });

    it('generates new UUID after rotation', () => {
      const uuid1 = IntercomService.getAnonymousUUID();
      IntercomService.rotateAnonymousUUID();
      const uuid2 = IntercomService.getAnonymousUUID();

      expect(uuid1).not.toBe(uuid2);
    });
  });
});
