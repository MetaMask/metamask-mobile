import {
  setBrazeUser,
  clearBrazeUser,
  getBrazePlugin,
  resetBrazePluginForTesting,
  logBrazeBannerImpression,
  logBrazeBannerClick,
  dismissBrazeBanner,
} from './index';
import { BrazePlugin } from '../Engine/controllers/analytics-controller/BrazePlugin';
import Braze from '@braze/react-native-sdk';
import {
  BANNER_EVENT_DISMISSED,
  BANNER_EVENT_DISPLAY,
} from '../../constants/engagement';

const mockSetBrazeProfileId = jest.fn();
const mockSetLanguage = jest.fn();

jest.mock('../Engine/controllers/analytics-controller/BrazePlugin', () => ({
  BrazePlugin: jest.fn().mockImplementation(() => ({
    type: 'destination',
    key: 'Appboy',
    setBrazeProfileId: mockSetBrazeProfileId,
    setLanguage: mockSetLanguage,
  })),
}));

const MockBrazePlugin = BrazePlugin as jest.MockedClass<typeof BrazePlugin>;

describe('Braze service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      setBrazeUser('canonical-profile-id-123');

      expect(mockSetBrazeProfileId).toHaveBeenCalledWith(
        'canonical-profile-id-123',
      );
    });
  });

  describe('clearBrazeUser', () => {
    it('clears the profile ID on the Braze Segment plugin', () => {
      clearBrazeUser();

      expect(mockSetBrazeProfileId).toHaveBeenCalledWith(undefined);
    });

    it('wipes local Braze SDK data and re-enables the SDK', () => {
      clearBrazeUser();

      expect(Braze.wipeData).toHaveBeenCalledTimes(1);
      expect(Braze.enableSDK).toHaveBeenCalledTimes(1);
      expect(
        (Braze.wipeData as jest.Mock).mock.invocationCallOrder[0],
      ).toBeLessThan(
        (Braze.enableSDK as jest.Mock).mock.invocationCallOrder[0],
      );
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
