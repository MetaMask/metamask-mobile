import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { usePerpsABTest } from './usePerpsABTest';
import { BUTTON_COLOR_TEST } from './tests';
import type { ABTestConfig, ABTestVariant, ButtonColorVariant } from './types';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsABTest', () => {
  // Test configuration
  const mockTestConfig: ABTestConfig<{
    control: ABTestVariant<ButtonColorVariant>;
    monochrome: ABTestVariant<ButtonColorVariant>;
  }> = {
    testId: 'button_color_test',
    featureFlagKey: 'perpsButtonColorTestEnabled',
    description: 'Test button colors',
    variants: {
      control: {
        weight: 50,
        data: {
          long: 'green',
          short: 'red',
        },
      },
      monochrome: {
        weight: 50,
        data: {
          long: 'white',
          short: 'white',
        },
      },
    },
  };

  const mockFeatureFlagSelector = (state: unknown) =>
    (state as { variant: string | null }).variant;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('with LaunchDarkly variant', () => {
    it('returns variant data when LaunchDarkly returns valid variant', () => {
      mockUseSelector.mockReturnValue('control');

      const { result } = renderHook(() =>
        usePerpsABTest({
          test: mockTestConfig,
          featureFlagSelector: mockFeatureFlagSelector,
        }),
      );

      expect(result.current.variant).toEqual({
        long: 'green',
        short: 'red',
      });
      expect(result.current.variantName).toBe('control');
      expect(result.current.isEnabled).toBe(true);
    });

    it('sets isEnabled true when LaunchDarkly returns variant', () => {
      mockUseSelector.mockReturnValue('monochrome');

      const { result } = renderHook(() =>
        usePerpsABTest({
          test: mockTestConfig,
          featureFlagSelector: mockFeatureFlagSelector,
        }),
      );

      expect(result.current.isEnabled).toBe(true);
    });

    it('returns correct variant data for monochrome variant', () => {
      mockUseSelector.mockReturnValue('monochrome');

      const { result } = renderHook(() =>
        usePerpsABTest({
          test: mockTestConfig,
          featureFlagSelector: mockFeatureFlagSelector,
        }),
      );

      expect(result.current.variant).toEqual({
        long: 'white',
        short: 'white',
      });
      expect(result.current.variantName).toBe('monochrome');
    });
  });

  describe('with invalid variant name', () => {
    it('warns and falls back to first variant when LaunchDarkly returns invalid variant', () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // Intentionally empty - suppressing console.warn during tests
        });
      mockUseSelector.mockReturnValue('invalid_variant');

      const { result } = renderHook(() =>
        usePerpsABTest({
          test: mockTestConfig,
          featureFlagSelector: mockFeatureFlagSelector,
        }),
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[ABTest] Variant "invalid_variant" not found in test "button_color_test". Falling back to first variant.',
      );
      expect(result.current.variant).toEqual({
        long: 'green',
        short: 'red',
      });
      expect(result.current.variantName).toBe('control');

      consoleWarnSpy.mockRestore();
    });

    it('sets isEnabled true when fallback occurs with LaunchDarkly active', () => {
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // Intentionally empty - suppressing console.warn during tests
        });
      mockUseSelector.mockReturnValue('invalid_variant');

      const { result } = renderHook(() =>
        usePerpsABTest({
          test: mockTestConfig,
          featureFlagSelector: mockFeatureFlagSelector,
        }),
      );

      expect(result.current.isEnabled).toBe(true);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('with null or undefined LaunchDarkly response', () => {
    it('falls back to first variant when LaunchDarkly returns null', () => {
      mockUseSelector.mockReturnValue(null);

      const { result } = renderHook(() =>
        usePerpsABTest({
          test: mockTestConfig,
          featureFlagSelector: mockFeatureFlagSelector,
        }),
      );

      expect(result.current.variant).toEqual({
        long: 'green',
        short: 'red',
      });
      expect(result.current.variantName).toBe('control');
    });

    it('sets isEnabled false when LaunchDarkly returns null', () => {
      mockUseSelector.mockReturnValue(null);

      const { result } = renderHook(() =>
        usePerpsABTest({
          test: mockTestConfig,
          featureFlagSelector: mockFeatureFlagSelector,
        }),
      );

      expect(result.current.isEnabled).toBe(false);
    });

    it('falls back to first variant when LaunchDarkly returns undefined', () => {
      mockUseSelector.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        usePerpsABTest({
          test: mockTestConfig,
          featureFlagSelector: mockFeatureFlagSelector,
        }),
      );

      expect(result.current.variant).toEqual({
        long: 'green',
        short: 'red',
      });
      expect(result.current.variantName).toBe('control');
    });
  });

  describe('with real BUTTON_COLOR_TEST configuration', () => {
    it('returns correct control variant from real configuration', () => {
      mockUseSelector.mockReturnValue('control');

      const { result } = renderHook(() =>
        usePerpsABTest({
          test: BUTTON_COLOR_TEST,
          featureFlagSelector: mockFeatureFlagSelector,
        }),
      );

      expect(result.current.variant).toEqual({
        long: 'green',
        short: 'red',
      });
      expect(result.current.variantName).toBe('control');
    });

    it('returns correct monochrome variant from real configuration', () => {
      mockUseSelector.mockReturnValue('monochrome');

      const { result } = renderHook(() =>
        usePerpsABTest({
          test: BUTTON_COLOR_TEST,
          featureFlagSelector: mockFeatureFlagSelector,
        }),
      );

      expect(result.current.variant).toEqual({
        long: 'white',
        short: 'white',
      });
      expect(result.current.variantName).toBe('monochrome');
    });
  });
});
