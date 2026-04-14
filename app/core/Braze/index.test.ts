import { setBrazeUser, clearBrazeUser, getBrazePlugin } from './index';
import { BrazePlugin } from '../Engine/controllers/analytics-controller/BrazePlugin';

const mockGetSessionProfile = jest.fn();
const mockSetBrazeProfileId = jest.fn();

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
  })),
}));

const MockBrazePlugin = BrazePlugin as jest.MockedClass<typeof BrazePlugin>;

describe('Braze service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton between tests
    (BrazePlugin as jest.MockedClass<typeof BrazePlugin>).mockClear();
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
});
