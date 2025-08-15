import type { RootState } from '../../../../reducers';
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { usePerpsNetwork } from './usePerpsNetwork';

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

describe('usePerpsNetwork', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mainnet configuration', () => {
    it('should return mainnet when isTestnet is false', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              isTestnet: false,
            },
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsNetwork(), {
        state,
      });

      expect(result.current).toBe('mainnet');
    });

    it('should return mainnet when isTestnet is undefined', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              isTestnet: undefined,
            },
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsNetwork(), {
        state,
      });

      expect(result.current).toBe('mainnet');
    });

    it('should return mainnet when PerpsController is undefined', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: undefined,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsNetwork(), {
        state,
      });

      expect(result.current).toBe('mainnet');
    });
  });

  describe('testnet configuration', () => {
    it('should return testnet when isTestnet is true', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              isTestnet: true,
            },
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsNetwork(), {
        state,
      });

      expect(result.current).toBe('testnet');
    });
  });

  describe('edge cases', () => {
    it('should handle empty PerpsController state', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {},
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsNetwork(), {
        state,
      });

      expect(result.current).toBe('mainnet');
    });

    it('should handle null PerpsController state', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            // @ts-expect-error - Testing null state
            PerpsController: null,
          },
        },
      };

      const { result } = renderHookWithProvider(() => usePerpsNetwork(), {
        state,
      });

      expect(result.current).toBe('mainnet');
    });
  });

  describe('network switching', () => {
    it('should properly handle different isTestnet values', () => {
      // Test mainnet state
      const mainnetState: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              isTestnet: false,
            },
          },
        },
      };

      const { result: mainnetResult } = renderHookWithProvider(
        () => usePerpsNetwork(),
        { state: mainnetState },
      );

      expect(mainnetResult.current).toBe('mainnet');

      // Test testnet state
      const testnetState: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              isTestnet: true,
            },
          },
        },
      };

      const { result: testnetResult } = renderHookWithProvider(
        () => usePerpsNetwork(),
        { state: testnetState },
      );

      expect(testnetResult.current).toBe('testnet');
    });
  });

  describe('memoization', () => {
    it('should return same value for same isTestnet state', () => {
      const state: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            PerpsController: {
              isTestnet: false,
            },
          },
        },
      };

      const { result: result1 } = renderHookWithProvider(
        () => usePerpsNetwork(),
        { state },
      );

      const { result: result2 } = renderHookWithProvider(
        () => usePerpsNetwork(),
        { state },
      );

      expect(result1.current).toBe(result2.current);
      expect(result1.current).toBe('mainnet');
    });

    it('should properly handle boolean conversion', () => {
      // Test truthy values that should result in testnet
      const truthyStates = [
        { isTestnet: true },
        { isTestnet: 1 as unknown as boolean },
        { isTestnet: 'true' as unknown as boolean },
        { isTestnet: {} as unknown as boolean },
        { isTestnet: [] as unknown as boolean },
      ];

      truthyStates.forEach((perpsState) => {
        const state: DeepPartial<RootState> = {
          engine: {
            backgroundState: {
              PerpsController: perpsState,
            },
          },
        };

        const { result } = renderHookWithProvider(() => usePerpsNetwork(), {
          state,
        });

        expect(result.current).toBe('testnet');
      });

      // Test falsy values that should result in mainnet
      const falsyStates = [
        { isTestnet: false },
        { isTestnet: 0 as unknown as boolean },
        { isTestnet: '' as unknown as boolean },
        { isTestnet: null as unknown as boolean },
        { isTestnet: undefined },
      ];

      falsyStates.forEach((perpsState) => {
        const state: DeepPartial<RootState> = {
          engine: {
            backgroundState: {
              PerpsController: perpsState,
            },
          },
        };

        const { result } = renderHookWithProvider(() => usePerpsNetwork(), {
          state,
        });

        expect(result.current).toBe('mainnet');
      });
    });
  });
});
