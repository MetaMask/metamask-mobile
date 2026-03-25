import Braze from '@braze/react-native-sdk';
import { syncBrazeProfileId, clearBrazeProfileId } from './index';

const mockGetSessionProfile = jest.fn();

jest.mock('../Engine/Engine', () => ({
  default: {
    context: {
      AuthenticationController: {
        getSessionProfile: () => mockGetSessionProfile(),
      },
    },
  },
}));

jest.mock('@braze/react-native-sdk', () => ({
  __esModule: true,
  default: {
    setCustomUserAttribute: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    Events: { PUSH_NOTIFICATION_EVENT: 'push_notification_event' },
  },
}));

describe('Braze service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncBrazeProfileId', () => {
    it('sets custom attribute when session has valid profile', async () => {
      mockGetSessionProfile.mockResolvedValue({
        profileId: 'test-profile-id-123',
        identifierId: 'id',
        metaMetricsId: 'mm-id',
      });

      await syncBrazeProfileId();

      expect(Braze.setCustomUserAttribute).toHaveBeenCalledWith(
        'profile_id',
        'test-profile-id-123',
      );
    });

    it('does nothing when session profile has no profileId', async () => {
      mockGetSessionProfile.mockResolvedValue({
        profileId: '',
        identifierId: 'id',
        metaMetricsId: 'mm-id',
      });

      await syncBrazeProfileId();

      expect(Braze.setCustomUserAttribute).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      mockGetSessionProfile.mockRejectedValue(new Error('Session error'));

      await expect(syncBrazeProfileId()).resolves.toBeUndefined();
      expect(Braze.setCustomUserAttribute).not.toHaveBeenCalled();
    });
  });

  describe('clearBrazeProfileId', () => {
    it('sets the attribute to null', () => {
      clearBrazeProfileId();

      expect(Braze.setCustomUserAttribute).toHaveBeenCalledWith(
        'profile_id',
        null,
      );
    });
  });
});
