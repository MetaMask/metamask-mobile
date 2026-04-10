import { setBrazeUser, clearBrazeUser } from './index';
import { setBrazeProfileId } from '../Engine/controllers/analytics-controller/platform-adapter';

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

jest.mock(
  '../Engine/controllers/analytics-controller/platform-adapter',
  () => ({
    setBrazeProfileId: jest.fn(),
  }),
);

const mockSetBrazeProfileId = jest.mocked(setBrazeProfileId);

describe('Braze service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
