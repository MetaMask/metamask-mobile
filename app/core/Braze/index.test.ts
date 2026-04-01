import Braze from '@braze/react-native-sdk';
import { setBrazeUser } from './index';

const mockGetSessionProfile = jest.fn();

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

jest.mock('@braze/react-native-sdk', () => ({
  __esModule: true,
  default: {
    changeUser: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    Events: { PUSH_NOTIFICATION_EVENT: 'push_notification_event' },
  },
}));

describe('Braze service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setBrazeUser', () => {
    it('calls changeUser with profileId when session has valid profile', async () => {
      mockGetSessionProfile.mockResolvedValue({
        profileId: 'test-profile-id-123',
        identifierId: 'id',
        metaMetricsId: 'mm-id',
      });

      await setBrazeUser();

      expect(Braze.changeUser).toHaveBeenCalledWith('test-profile-id-123');
    });

    it('does nothing when session profile has no profileId', async () => {
      mockGetSessionProfile.mockResolvedValue({
        profileId: '',
        identifierId: 'id',
        metaMetricsId: 'mm-id',
      });

      await setBrazeUser();

      expect(Braze.changeUser).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      mockGetSessionProfile.mockRejectedValue(new Error('Session error'));

      await expect(setBrazeUser()).resolves.toBeUndefined();
      expect(Braze.changeUser).not.toHaveBeenCalled();
    });
  });
});
