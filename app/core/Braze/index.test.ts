import {
  setBrazeUser,
  clearBrazeUser,
  getBrazePlugin,
  resetBrazePluginForTesting,
  logBrazeBannerImpression,
  logBrazeBannerClick,
  dismissBrazeBanner,
  refreshBrazeBanners,
} from './index';
import { BrazePlugin } from '../Engine/controllers/analytics-controller/BrazePlugin';
import Braze from '@braze/react-native-sdk';
import {
  BANNER_EVENT_DISMISSED,
  BANNER_EVENT_DISPLAY,
} from '../../constants/engagement';

const mockSetBrazeProfileId = jest.fn();
const mockSetLanguage = jest.fn();
const mockHasPendingBrazePushUnregistrationSync = jest.fn();

jest.mock('../Engine/controllers/analytics-controller/BrazePlugin', () => ({
  BrazePlugin: jest.fn().mockImplementation(() => ({
    type: 'destination',
    key: 'Appboy',
    setBrazeProfileId: mockSetBrazeProfileId,
    setLanguage: mockSetLanguage,
  })),
}));

jest.mock('./pushRegistrationState', () => ({
  hasPendingBrazePushUnregistrationSync: () =>
    mockHasPendingBrazePushUnregistrationSync(),
}));

const MockBrazePlugin = BrazePlugin as jest.MockedClass<typeof BrazePlugin>;

describe('Braze service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    MockBrazePlugin.mockImplementation(
      () =>
        ({
          type: 'destination',
          key: 'Appboy',
          setBrazeProfileId: mockSetBrazeProfileId,
          setLanguage: mockSetLanguage,
        }) as unknown as BrazePlugin,
    );
    mockHasPendingBrazePushUnregistrationSync.mockReturnValue(false);
    resetBrazePluginForTesting();
  });

  describe('getBrazePlugin', () => {
    it('returns a singleton BrazePlugin instance', () => {
      const plugin1 = getBrazePlugin();
      const plugin2 = getBrazePlugin();

      expect(plugin1).toBe(plugin2);
      expect(MockBrazePlugin).toHaveBeenCalledTimes(1);
    });
  });

  describe('setBrazeUser', () => {
    it('forwards the provided canonicalProfileId to the Braze Segment plugin', () => {
      mockSetBrazeProfileId.mockReturnValue(false);

      setBrazeUser('canonical-profile-id-123');

      expect(mockSetBrazeProfileId).toHaveBeenCalledWith(
        'canonical-profile-id-123',
      );
    });

    it('enables the SDK before identifying a Braze user', () => {
      mockSetBrazeProfileId.mockReturnValue(true);

      setBrazeUser('canonical-profile-id-123');

      expect(Braze.enableSDK).toHaveBeenCalledTimes(1);
      expect(
        (Braze.enableSDK as jest.Mock).mock.invocationCallOrder[0],
      ).toBeLessThan(mockSetBrazeProfileId.mock.invocationCallOrder[0]);
    });

    it('refreshes banners when identifying a new Braze user', () => {
      mockSetBrazeProfileId.mockReturnValue(true);

      setBrazeUser('canonical-profile-id-123');

      expect(Braze.requestBannersRefresh).toHaveBeenCalledTimes(1);
    });

    it('does not refresh banners when the Braze user is unchanged', () => {
      mockSetBrazeProfileId.mockReturnValue(false);

      setBrazeUser('canonical-profile-id-123');

      expect(Braze.requestBannersRefresh).not.toHaveBeenCalled();
    });
  });

  describe('clearBrazeUser', () => {
    it('clears the profile ID on the Braze Segment plugin', async () => {
      await clearBrazeUser();

      expect(mockSetBrazeProfileId).toHaveBeenCalledWith(undefined);
    });

    it('disables the SDK so the previous user is not messaged', async () => {
      await clearBrazeUser();

      expect(Braze.disableSDK).toHaveBeenCalledTimes(1);
      expect(Braze.wipeData).not.toHaveBeenCalled();
      expect(Braze.enableSDK).not.toHaveBeenCalled();
    });

    it('defers disabling the SDK while push unregistration is pending', async () => {
      mockHasPendingBrazePushUnregistrationSync.mockReturnValue(true);

      await expect(clearBrazeUser()).resolves.toBe(false);

      expect(Braze.disableSDK).not.toHaveBeenCalled();
      expect(Braze.wipeData).not.toHaveBeenCalled();
    });
  });

  describe('logBrazeBannerImpression', () => {
    it('calls logBannerImpression with the placementId', () => {
      logBrazeBannerImpression('placement-1', { banner_id: 'campaign-abc' });

      expect(Braze.logBannerImpression).toHaveBeenCalledWith('placement-1');
    });

    it('calls logCustomEvent with the display event and supplied properties', () => {
      logBrazeBannerImpression('placement-1', { banner_id: 'campaign-abc' });

      expect(Braze.logCustomEvent).toHaveBeenCalledWith(BANNER_EVENT_DISPLAY, {
        banner_id: 'campaign-abc',
      });
    });

    it('skips logCustomEvent when properties is null', () => {
      logBrazeBannerImpression('placement-1', null);

      expect(Braze.logCustomEvent).not.toHaveBeenCalled();
    });
  });

  describe('logBrazeBannerClick', () => {
    it('calls logBannerClick with the placementId and null', () => {
      logBrazeBannerClick('placement-1');

      expect(Braze.logBannerClick).toHaveBeenCalledWith('placement-1', null);
    });
  });

  describe('refreshBrazeBanners', () => {
    it('requests a banner refresh for the supplied placements', () => {
      refreshBrazeBanners(['placement-1']);

      expect(Braze.requestBannersRefresh).toHaveBeenCalledWith(['placement-1']);
    });
  });

  describe('dismissBrazeBanner', () => {
    it('logs the dismissed event with the supplied properties', () => {
      dismissBrazeBanner({ banner_id: 'campaign-xyz', placement_id: 'home' });

      expect(Braze.logCustomEvent).toHaveBeenCalledWith(
        BANNER_EVENT_DISMISSED,
        {
          banner_id: 'campaign-xyz',
          placement_id: 'home',
        },
      );
    });

    it('requests an immediate data flush after logging the event', () => {
      dismissBrazeBanner({ banner_id: 'campaign-xyz' });

      expect(Braze.requestImmediateDataFlush).toHaveBeenCalledTimes(1);
    });
  });
});
