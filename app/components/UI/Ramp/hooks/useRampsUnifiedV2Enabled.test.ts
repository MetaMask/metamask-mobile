import initialRootState, {
  backgroundState,
} from '../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';
import { getVersion } from 'react-native-device-info';

function mockInitialState({
  rampsUnifiedBuyV2ActiveFlag = true,
  rampsUnifiedBuyV2MinimumVersionFlag,
}: {
  rampsUnifiedBuyV2ActiveFlag?: boolean;
  rampsUnifiedBuyV2MinimumVersionFlag?: string | null;
} = {}) {
  return {
    ...initialRootState,
    engine: {
      backgroundState: {
        ...backgroundState,
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            rampsUnifiedBuyV2: {
              active: rampsUnifiedBuyV2ActiveFlag,
              ...(rampsUnifiedBuyV2MinimumVersionFlag !== undefined && {
                minimumVersion: rampsUnifiedBuyV2MinimumVersionFlag,
              }),
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

describe('useRampsUnifiedV2Enabled', () => {
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

  describe('Build flag precedence', () => {
    it('returns true when build flag is set to "true" regardless of remote flags', () => {
      process.env.MM_RAMPS_UNIFIED_BUY_V2_ENABLED = 'true';
      mockGetVersion.mockReturnValue('1.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV2Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV2ActiveFlag: false,
            rampsUnifiedBuyV2MinimumVersionFlag: '2.0.0',
          }),
        },
      );

      expect(result.current).toBe(true);
    });

    it('returns false when build flag is set to "false" regardless of remote flags', () => {
      process.env.MM_RAMPS_UNIFIED_BUY_V2_ENABLED = 'false';
      mockGetVersion.mockReturnValue('2.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV2Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV2ActiveFlag: true,
            rampsUnifiedBuyV2MinimumVersionFlag: '1.0.0',
          }),
        },
      );

      expect(result.current).toBe(false);
    });

    it('returns true when build flag is set to "true" even with version mismatch', () => {
      process.env.MM_RAMPS_UNIFIED_BUY_V2_ENABLED = 'true';
      mockGetVersion.mockReturnValue('1.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV2Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV2ActiveFlag: true,
            rampsUnifiedBuyV2MinimumVersionFlag: '2.0.0',
          }),
        },
      );

      expect(result.current).toBe(true);
    });
  });

  describe('Remote feature flag behavior when build flag is not set', () => {
    it('returns true when unified V2 is enabled and version meets the minimum requirement', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV2Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV2ActiveFlag: true,
            rampsUnifiedBuyV2MinimumVersionFlag: '7.63.0',
          }),
        },
      );

      expect(result.current).toBe(true);
    });

    it('returns false when unified V2 is disabled', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV2Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV2ActiveFlag: false,
            rampsUnifiedBuyV2MinimumVersionFlag: '7.63.0',
          }),
        },
      );

      expect(result.current).toBe(false);
    });

    it('returns false when version does not meet the minimum requirement', () => {
      mockGetVersion.mockReturnValue('7.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV2Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV2ActiveFlag: true,
            rampsUnifiedBuyV2MinimumVersionFlag: '7.63.0',
          }),
        },
      );

      expect(result.current).toBe(false);
    });

    it('returns false when minimum version is not defined', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV2Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV2ActiveFlag: true,
            rampsUnifiedBuyV2MinimumVersionFlag: null,
          }),
        },
      );

      expect(result.current).toBe(false);
    });

    it('returns false when minimum version is undefined', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV2Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV2ActiveFlag: true,
            rampsUnifiedBuyV2MinimumVersionFlag: undefined,
          }),
        },
      );

      expect(result.current).toBe(false);
    });

    it('returns true when version equals minimum version exactly', () => {
      mockGetVersion.mockReturnValue('7.63.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV2Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV2ActiveFlag: true,
            rampsUnifiedBuyV2MinimumVersionFlag: '7.63.0',
          }),
        },
      );

      expect(result.current).toBe(true);
    });

    it('returns false when both active flag and minimum version are not set', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const { result } = renderHookWithProvider(
        () => useRampsUnifiedV2Enabled(),
        {
          state: mockInitialState({
            rampsUnifiedBuyV2ActiveFlag: false,
            rampsUnifiedBuyV2MinimumVersionFlag: null,
          }),
        },
      );

      expect(result.current).toBe(false);
    });
  });
});
