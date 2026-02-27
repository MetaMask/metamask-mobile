import initialRootState, {
  backgroundState,
} from '../../../../util/test/initial-root-state';
import { isRampsUnifiedV2Enabled } from './isRampsUnifiedV2Enabled';
import { getVersion } from 'react-native-device-info';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

function buildState({
  active = true,
  minimumVersion,
}: {
  active?: boolean;
  minimumVersion?: string | null;
} = {}) {
  return {
    ...initialRootState,
    engine: {
      backgroundState: {
        ...backgroundState,
        RemoteFeatureFlagController: {
          ...backgroundState.RemoteFeatureFlagController,
          remoteFeatureFlags: {
            rampsUnifiedBuyV2: {
              active,
              ...(minimumVersion !== undefined && { minimumVersion }),
            },
          },
        },
      },
    },
  };
}

describe('isRampsUnifiedV2Enabled', () => {
  const mockGetVersion = jest.mocked(getVersion);
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.MM_RAMPS_UNIFIED_BUY_V2_ENABLED;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('build flag precedence', () => {
    it('returns true when build flag is "true" regardless of remote flags', () => {
      process.env.MM_RAMPS_UNIFIED_BUY_V2_ENABLED = 'true';

      const result = isRampsUnifiedV2Enabled(
        buildState({ active: false, minimumVersion: '99.0.0' }),
      );

      expect(result).toBe(true);
    });

    it('returns false when build flag is "false" regardless of remote flags', () => {
      process.env.MM_RAMPS_UNIFIED_BUY_V2_ENABLED = 'false';

      const result = isRampsUnifiedV2Enabled(
        buildState({ active: true, minimumVersion: '1.0.0' }),
      );

      expect(result).toBe(false);
    });
  });

  describe('remote feature flag behavior when build flag is not set', () => {
    it('returns true when active and version meets minimum requirement', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const result = isRampsUnifiedV2Enabled(
        buildState({ active: true, minimumVersion: '7.63.0' }),
      );

      expect(result).toBe(true);
    });

    it('returns false when active flag is false', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const result = isRampsUnifiedV2Enabled(
        buildState({ active: false, minimumVersion: '7.63.0' }),
      );

      expect(result).toBe(false);
    });

    it('returns false when version does not meet minimum requirement', () => {
      mockGetVersion.mockReturnValue('7.0.0');

      const result = isRampsUnifiedV2Enabled(
        buildState({ active: true, minimumVersion: '7.63.0' }),
      );

      expect(result).toBe(false);
    });

    it('returns false when minimumVersion is not configured', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const result = isRampsUnifiedV2Enabled(
        buildState({ active: true, minimumVersion: null }),
      );

      expect(result).toBe(false);
    });

    it('returns true when version exactly equals minimum version', () => {
      mockGetVersion.mockReturnValue('7.63.0');

      const result = isRampsUnifiedV2Enabled(
        buildState({ active: true, minimumVersion: '7.63.0' }),
      );

      expect(result).toBe(true);
    });
  });
});
