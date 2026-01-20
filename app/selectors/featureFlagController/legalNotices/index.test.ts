import { selectIsPna25FlagEnabled } from '.';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';
import { getFeatureFlagValue } from '../env';

jest.mock('../env', () => ({
  getFeatureFlagValue: jest.fn(),
}));

// Helper function to create mock state with extensionUxPna25 flag
function mockStateWith(extensionUxPna25: boolean) {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          cacheTimestamp: 0,
          remoteFeatureFlags: {
            extensionUxPna25,
          } as unknown as FeatureFlags,
        },
      },
    },
  };
}

// Helper function to create mock state with undefined remote flags
function mockStateWithUndefinedFlags() {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          cacheTimestamp: 0,
          remoteFeatureFlags: {},
        },
      },
    },
  };
}

// Helper function to create mock state with undefined controller
function mockStateWithUndefinedController() {
  return {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: undefined,
      },
    },
  };
}

describe('selectIsPna25FlagEnabled', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('without environment variable override', () => {
    beforeEach(() => {
      (getFeatureFlagValue as jest.Mock).mockImplementation(
        (_envValue: string | undefined, remoteValue: boolean) => remoteValue,
      );
    });

    it('returns true when remote flag is true', () => {
      const mockedState = mockStateWith(true);

      const result = selectIsPna25FlagEnabled(mockedState);

      expect(result).toBe(true);
    });

    it('returns false when remote flag is false', () => {
      const mockedState = mockStateWith(false);

      const result = selectIsPna25FlagEnabled(mockedState);

      expect(result).toBe(false);
    });

    it('returns false when remote flag is undefined', () => {
      const mockedState = mockStateWithUndefinedFlags();

      const result = selectIsPna25FlagEnabled(mockedState);

      expect(result).toBe(false);
    });

    it('returns false when controller is undefined', () => {
      const mockedState = mockStateWithUndefinedController();

      const result = selectIsPna25FlagEnabled(mockedState);

      expect(result).toBe(false);
    });
  });

  describe('with environment variable override to true', () => {
    beforeEach(() => {
      // Mock behavior: always returns true (env override)
      (getFeatureFlagValue as jest.Mock).mockReturnValue(true);
    });

    it('returns true when remote flag is false', () => {
      const mockedState = mockStateWith(false);

      const result = selectIsPna25FlagEnabled(mockedState);

      expect(result).toBe(true);
    });

    it('returns true when remote flag is true', () => {
      const mockedState = mockStateWith(true);

      const result = selectIsPna25FlagEnabled(mockedState);

      expect(result).toBe(true);
    });

    it('returns true when remote flag is undefined', () => {
      const mockedState = mockStateWithUndefinedFlags();

      const result = selectIsPna25FlagEnabled(mockedState);

      expect(result).toBe(true);
    });
  });

  describe('with environment variable override to false', () => {
    beforeEach(() => {
      // Mock behavior: always returns false (env override)
      (getFeatureFlagValue as jest.Mock).mockReturnValue(false);
    });

    it('returns false when remote flag is true', () => {
      const mockedState = mockStateWith(true);

      const result = selectIsPna25FlagEnabled(mockedState);

      expect(result).toBe(false);
    });

    it('returns false when remote flag is false', () => {
      const mockedState = mockStateWith(false);

      const result = selectIsPna25FlagEnabled(mockedState);

      expect(result).toBe(false);
    });

    it('returns false when remote flag is undefined', () => {
      const mockedState = mockStateWithUndefinedFlags();

      const result = selectIsPna25FlagEnabled(mockedState);

      expect(result).toBe(false);
    });
  });
});
