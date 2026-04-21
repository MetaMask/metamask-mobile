import {
  setBrazeUser,
  clearBrazeUser,
  getBrazePlugin,
  syncBrazeAllowlists,
  resetBrazePluginForTesting,
} from './index';
import { BrazePlugin } from '../Engine/controllers/analytics-controller/BrazePlugin';

const mockGetSessionProfile = jest.fn();
const mockSetBrazeProfileId = jest.fn();
const mockSetAllowedEvents = jest.fn();
const mockSetAllowedTraits = jest.fn();
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
    setAllowedEvents: mockSetAllowedEvents,
    setAllowedTraits: mockSetAllowedTraits,
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

  describe('syncBrazeAllowlists', () => {
    it('updates both allowlists from a valid config', () => {
      syncBrazeAllowlists({
        allowedEvents: ['Event A', 'Event B'],
        allowedTraits: ['trait_x', 'trait_y'],
      });

      expect(mockSetAllowedEvents).toHaveBeenCalledWith(['Event A', 'Event B']);
      expect(mockSetAllowedTraits).toHaveBeenCalledWith(['trait_x', 'trait_y']);
    });

    it('handles partial config (only events)', () => {
      syncBrazeAllowlists({ allowedEvents: ['Event A'] });

      expect(mockSetAllowedEvents).toHaveBeenCalledWith(['Event A']);
      expect(mockSetAllowedTraits).not.toHaveBeenCalled();
    });

    it('handles partial config (only traits)', () => {
      syncBrazeAllowlists({ allowedTraits: ['trait_a'] });

      expect(mockSetAllowedEvents).not.toHaveBeenCalled();
      expect(mockSetAllowedTraits).toHaveBeenCalledWith(['trait_a']);
    });

    it('no-ops when flag value is undefined', () => {
      syncBrazeAllowlists(undefined);

      expect(mockSetAllowedEvents).not.toHaveBeenCalled();
      expect(mockSetAllowedTraits).not.toHaveBeenCalled();
    });

    it('no-ops when flag value is null', () => {
      syncBrazeAllowlists(null);

      expect(mockSetAllowedEvents).not.toHaveBeenCalled();
      expect(mockSetAllowedTraits).not.toHaveBeenCalled();
    });

    it('rejects non-object flag values', () => {
      syncBrazeAllowlists('not-an-object');

      expect(mockSetAllowedEvents).not.toHaveBeenCalled();
      expect(mockSetAllowedTraits).not.toHaveBeenCalled();
    });

    it('rejects arrays as flag values', () => {
      syncBrazeAllowlists(['not', 'a', 'config']);

      expect(mockSetAllowedEvents).not.toHaveBeenCalled();
      expect(mockSetAllowedTraits).not.toHaveBeenCalled();
    });

    it('ignores allowedEvents when it contains non-strings', () => {
      syncBrazeAllowlists({
        allowedEvents: ['valid', 123, null],
        allowedTraits: ['trait_a'],
      });

      expect(mockSetAllowedEvents).not.toHaveBeenCalled();
      expect(mockSetAllowedTraits).toHaveBeenCalledWith(['trait_a']);
    });

    it('ignores allowedTraits when it is not an array', () => {
      syncBrazeAllowlists({
        allowedEvents: ['Event A'],
        allowedTraits: 'not-an-array',
      });

      expect(mockSetAllowedEvents).toHaveBeenCalledWith(['Event A']);
      expect(mockSetAllowedTraits).not.toHaveBeenCalled();
    });

    it('no-ops when object has no valid arrays', () => {
      syncBrazeAllowlists({ allowedEvents: 42, allowedTraits: true });

      expect(mockSetAllowedEvents).not.toHaveBeenCalled();
      expect(mockSetAllowedTraits).not.toHaveBeenCalled();
    });
  });
});
