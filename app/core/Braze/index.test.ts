import {
  setBrazeUser,
  clearBrazeUser,
  getBrazePlugin,
  resetBrazePluginForTesting,
  logBrazeBannerImpression,
  logBrazeBannerClick,
  dismissBrazeBanner,
  refreshBrazeBanners,
  syncBrazeEventBlocklist,
} from './index';
import { BrazePlugin } from '../Engine/controllers/analytics-controller/BrazePlugin';
import Braze from '@braze/react-native-sdk';
import { getBrazeBlockedEventNames } from '../../selectors/featureFlagController/brazeEventBlocklist';
import {
  BANNER_EVENT_DISMISSED,
  BANNER_EVENT_DISPLAY,
  BANNER_EVENT_SELECT,
} from '../../constants/engagement';

const mockSetBrazeProfileId = jest.fn();
const mockSetBlockedEvents = jest.fn();
const mockSetLanguage = jest.fn();
const mockHasPendingBrazePushUnregistrationSync = jest.fn();

jest.mock('../Engine/controllers/analytics-controller/BrazePlugin', () => ({
  BrazePlugin: jest.fn().mockImplementation(() => ({
    type: 'destination',
    key: 'Appboy',
    setBrazeProfileId: mockSetBrazeProfileId,
    setBlockedEvents: mockSetBlockedEvents,
    setLanguage: mockSetLanguage,
  })),
}));

jest.mock('./pushRegistrationState', () => ({
  hasPendingBrazePushUnregistrationSync: () =>
    mockHasPendingBrazePushUnregistrationSync(),
}));

jest.mock('../../selectors/featureFlagController/brazeEventBlocklist', () => ({
  getBrazeBlockedEventNames: jest.fn(),
}));

const MockBrazePlugin = BrazePlugin as jest.MockedClass<typeof BrazePlugin>;
const mockGetBrazeBlockedEventNames = jest.mocked(getBrazeBlockedEventNames);

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
          setBlockedEvents: mockSetBlockedEvents,
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
      logBrazeBannerClick('placement-1', null);

      expect(Braze.logBannerClick).toHaveBeenCalledWith('placement-1', null);
    });

    it('logs a select custom event with the supplied properties', () => {
      logBrazeBannerClick('placement-1', {
        campaign_name: 'campaign-abc',
        variant_name: 'variant-1',
      });

      expect(Braze.logCustomEvent).toHaveBeenCalledWith(BANNER_EVENT_SELECT, {
        campaign_name: 'campaign-abc',
        variant_name: 'variant-1',
      });
    });

    it('skips the select custom event when properties is null', () => {
      logBrazeBannerClick('placement-1', null);

      expect(Braze.logCustomEvent).not.toHaveBeenCalled();
    });

    it('flushes immediately when requested', () => {
      logBrazeBannerClick(
        'placement-1',
        { campaign_name: 'campaign-abc' },
        true,
      );

      expect(Braze.requestImmediateDataFlush).toHaveBeenCalledTimes(1);
    });

    it('waits for the next batch when immediate flush is not requested', () => {
      logBrazeBannerClick('placement-1', { campaign_name: 'campaign-abc' });

      expect(Braze.requestImmediateDataFlush).not.toHaveBeenCalled();
    });

    it('does not flush when there are no properties to send', () => {
      logBrazeBannerClick('placement-1', null, true);

      expect(Braze.requestImmediateDataFlush).not.toHaveBeenCalled();
    });
  });

  describe('refreshBrazeBanners', () => {
    it('requests a banner refresh for the supplied placements', () => {
      refreshBrazeBanners(['placement-1']);

      expect(Braze.requestBannersRefresh).toHaveBeenCalledWith(['placement-1']);
    });
  });

  describe('syncBrazeEventBlocklist', () => {
    it('applies the event names returned for the flag value', () => {
      const flagValue = {
        enabled: true,
        minimumVersion: '8.14.0',
        blockedEvents: ['App Opened'],
      };
      mockGetBrazeBlockedEventNames.mockReturnValue(['App Opened']);

      syncBrazeEventBlocklist(flagValue);

      expect(mockGetBrazeBlockedEventNames).toHaveBeenCalledWith(flagValue);
      expect(mockSetBlockedEvents).toHaveBeenCalledWith(['App Opened']);
    });

    it('clears the blocklist when parsing the flag throws', () => {
      mockGetBrazeBlockedEventNames.mockImplementation(() => {
        throw new Error('flag parse failed');
      });

      syncBrazeEventBlocklist({ enabled: true });

      expect(mockSetBlockedEvents).toHaveBeenCalledWith([]);
    });
  });

  describe('dismissBrazeBanner', () => {
    it('calls Braze.dismissBanner with the placement ID', () => {
      dismissBrazeBanner('placement-1', { campaign_name: 'campaign-abc' });

      expect(Braze.dismissBanner).toHaveBeenCalledWith('placement-1');
    });

    it('logs a custom dismissed event with the supplied properties', () => {
      dismissBrazeBanner('placement-1', { campaign_name: 'campaign-abc' });

      expect(Braze.logCustomEvent).toHaveBeenCalledWith(
        BANNER_EVENT_DISMISSED,
        { campaign_name: 'campaign-abc' },
      );
      expect(Braze.requestImmediateDataFlush).toHaveBeenCalled();
    });

    it('skips the custom dismissed event when properties is null', () => {
      dismissBrazeBanner('placement-1', null);

      expect(Braze.dismissBanner).toHaveBeenCalledWith('placement-1');
      expect(Braze.logCustomEvent).not.toHaveBeenCalled();
      expect(Braze.requestImmediateDataFlush).not.toHaveBeenCalled();
    });
  });
});
