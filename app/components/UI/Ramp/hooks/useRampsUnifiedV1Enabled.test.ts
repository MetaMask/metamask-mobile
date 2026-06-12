import initialRootState, {
  backgroundState,
} from '../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';
import { getVersion } from 'react-native-device-info';

function mockInitialState({
  rampsUnifiedBuyV1ActiveFlag = true,
  rampsUnifiedBuyV1MinimumVersionFlag = '1.0.0',
}: {
  rampsUnifiedBuyV1ActiveFlag?: boolean;
  rampsUnifiedBuyV1MinimumVersionFlag?: string | null | undefined;
}) {
  return {
    ...initialRootState,
    engine: {
      backgroundState: {
        ...backgroundState,
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            rampsUnifiedBuyV1: {
              active: rampsUnifiedBuyV1ActiveFlag,
              minimumVersion: rampsUnifiedBuyV1MinimumVersionFlag,
            },
          },
        },
      },
    },
  };
}

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

describe('useRampsUnifiedV1Enabled', () => {
  const mockGetVersion = jest.mocked(getVersion);
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.env for each test
    process.env = { ...originalEnv };
    delete process.env.MM_RAMPS_UNIFIED_BUY_V1_ENABLED;
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Build flag precedence', () => {
    it('returns true when build flag is set to "true" regardless of remote flags', () => {
      process.env.MM_RAMPS_UNIFIED_BUY_V1_ENABLED = 'true';
      mockGetVersion.mockReturnValue('1.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV1Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV1ActiveFlag: false,
            rampsUnifiedBuyV1MinimumVersionFlag: '2.0.0',
          }),
        },
      );

      expect(result.current).toBe(true);
    });

    it('returns false when build flag is set to "false" regardless of remote flags', () => {
      process.env.MM_RAMPS_UNIFIED_BUY_V1_ENABLED = 'false';
      mockGetVersion.mockReturnValue('2.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV1Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV1ActiveFlag: true,
            rampsUnifiedBuyV1MinimumVersionFlag: '1.0.0',
          }),
        },
      );

      expect(result.current).toBe(false);
    });

    it('returns true when build flag is set to "true" even with version mismatch', () => {
      process.env.MM_RAMPS_UNIFIED_BUY_V1_ENABLED = 'true';
      mockGetVersion.mockReturnValue('1.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV1Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV1ActiveFlag: true,
            rampsUnifiedBuyV1MinimumVersionFlag: '2.0.0',
          }),
        },
      );

      expect(result.current).toBe(true);
    });
  });

  describe('Remote feature flag behavior when build flag is not set', () => {
    it('returns true when unified V1 is enabled and version meets the minimum requirement', () => {
      mockGetVersion.mockReturnValue('2.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV1Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV1ActiveFlag: true,
            rampsUnifiedBuyV1MinimumVersionFlag: '1.5.0',
          }),
        },
      );

      expect(result.current).toBe(true);
    });

    it('returns false when unified V1 is disabled', () => {
      mockGetVersion.mockReturnValue('2.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV1Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV1ActiveFlag: false,
            rampsUnifiedBuyV1MinimumVersionFlag: '1.5.0',
          }),
        },
      );

      expect(result.current).toBe(false);
    });

    it('returns false when version does not meet the minimum requirement', () => {
      mockGetVersion.mockReturnValue('1.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV1Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV1ActiveFlag: true,
            rampsUnifiedBuyV1MinimumVersionFlag: '1.5.0',
          }),
        },
      );

      expect(result.current).toBe(false);
    });

    it('returns false when minimum version is not defined', () => {
      mockGetVersion.mockReturnValue('2.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV1Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV1ActiveFlag: true,
            rampsUnifiedBuyV1MinimumVersionFlag: null,
          }),
        },
      );

      expect(result.current).toBe(false);
    });

    it('returns false when minimum version is empty string', () => {
      mockGetVersion.mockReturnValue('2.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV1Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV1ActiveFlag: true,
            rampsUnifiedBuyV1MinimumVersionFlag: '',
          }),
        },
      );

      expect(result.current).toBe(false);
    });
  });

  describe('Version comparison edge cases', () => {
    it('returns true when current version exactly matches minimum version', () => {
      mockGetVersion.mockReturnValue('1.5.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV1Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV1ActiveFlag: true,
            rampsUnifiedBuyV1MinimumVersionFlag: '1.5.0',
          }),
        },
      );

      expect(result.current).toBe(true);
    });

    it('returns true when current version is higher than minimum version', () => {
      mockGetVersion.mockReturnValue('2.1.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV1Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV1ActiveFlag: true,
            rampsUnifiedBuyV1MinimumVersionFlag: '2.0.0',
          }),
        },
      );

      expect(result.current).toBe(true);
    });

    it('returns false when current version is lower than minimum version', () => {
      mockGetVersion.mockReturnValue('1.9.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV1Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV1ActiveFlag: true,
            rampsUnifiedBuyV1MinimumVersionFlag: '2.0.0',
          }),
        },
      );

      expect(result.current).toBe(false);
    });
  });
});
