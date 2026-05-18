import {
  setBrazeUser,
  clearBrazeUser,
  getBrazePlugin,
  resetBrazePluginForTesting,
  refreshBrazeBanners,
  logBrazeBannerImpression,
  logBrazeBannerClick,
  dismissBrazeBanner,
} from './index';
import { BrazePlugin } from '../Engine/controllers/analytics-controller/BrazePlugin';
import Braze from '@braze/react-native-sdk';
import { BRAZE_BANNER_WALLET_HOME_PLACEMENT_ID } from './constants';

const mockGetSessionProfile = jest.fn();
const mockSetBrazeProfileId = jest.fn();
const mockSetLanguage = jest.fn();

jest.mock('../Engine/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AuthenticationController: {
        getSessionProfile: () => mockGetSessionProfile(),
      },
    },
  },
}));

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
    it('forwards profileId to the Braze Segment plugin', async () => {
      mockGetSessionProfile.mockResolvedValue({
        profileId: 'test-profile-id-123',
        identifierId: 'id',
        metaMetricsId: 'mm-id',
      });

      await setBrazeUser();

      expect(mockSetBrazeProfileId).toHaveBeenCalledWith('test-profile-id-123');
    });

    it('does nothing when session profile has no profileId', async () => {
      mockGetSessionProfile.mockResolvedValue({
        profileId: '',
        identifierId: 'id',
        metaMetricsId: 'mm-id',
      });

      await setBrazeUser();

      expect(mockSetBrazeProfileId).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      mockGetSessionProfile.mockRejectedValue(new Error('Session error'));

      await expect(setBrazeUser()).resolves.toBeUndefined();
      expect(mockSetBrazeProfileId).not.toHaveBeenCalled();
    });
  });

  describe('clearBrazeUser', () => {
    it('clears the profile ID on the Braze Segment plugin', () => {
      clearBrazeUser();

      expect(mockSetBrazeProfileId).toHaveBeenCalledWith(undefined);
    });
  });

  describe('logBrazeBannerImpression', () => {
    it('calls logBannerImpression with the placementId', () => {
      logBrazeBannerImpression('placement-1', { banner_id: 'campaign-abc' });

      expect(Braze.logBannerImpression).toHaveBeenCalledWith('placement-1');
    });

    it('calls logCustomEvent with Banner Impression and the supplied properties', () => {
      logBrazeBannerImpression('placement-1', { banner_id: 'campaign-abc' });

      expect(Braze.logCustomEvent).toHaveBeenCalledWith('Banner Impression', {
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
    it('logs a Banner Dismissed custom event with the supplied properties', () => {
      dismissBrazeBanner({ banner_id: 'campaign-xyz', placement_id: 'home' });

      expect(Braze.logCustomEvent).toHaveBeenCalledWith('Banner Dismissed', {
        banner_id: 'campaign-xyz',
        placement_id: 'home',
      });
    });

    it('requests an immediate data flush after logging the event', () => {
      dismissBrazeBanner({ banner_id: 'campaign-xyz' });

      expect(Braze.requestImmediateDataFlush).toHaveBeenCalledTimes(1);
    });
  });
});
