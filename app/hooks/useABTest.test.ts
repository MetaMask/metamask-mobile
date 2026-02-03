import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useABTest } from './useABTest';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock the selector module
jest.mock('../selectors/featureFlagController', () => ({
  selectRemoteFeatureFlags: jest.fn((state) => state?.featureFlags),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useABTest', () => {
  // Test variants configuration
  const buttonColorVariants = {
    control: { long: 'green', short: 'red' },
    monochrome: { long: 'white', short: 'white' },
  };

  const quoteLayoutVariants = {
    control: { showFees: false, layout: 'compact' },
    expanded: { showFees: true, layout: 'expanded' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('with object format { name } from controller', () => {
    it('returns correct variant data when flag is object with name property', () => {
      mockUseSelector.mockReturnValue({
        buttonColorTest: { name: 'control' },
      });

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'green', short: 'red' });
      expect(result.current.variantName).toBe('control');
      expect(result.current.isActive).toBe(true);
    });

    it('returns correct variant data for treatment variant in object format', () => {
      mockUseSelector.mockReturnValue({
        buttonColorTest: { name: 'monochrome' },
      });

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'white', short: 'white' });
      expect(result.current.variantName).toBe('monochrome');
      expect(result.current.isActive).toBe(true);
    });

    it('handles object format with optional value property', () => {
      mockUseSelector.mockReturnValue({
        swapsQuoteLayout: { name: 'expanded', value: undefined },
      });

      const { result } = renderHook(() =>
        useABTest('swapsQuoteLayout', quoteLayoutVariants),
      );

      expect(result.current.isActive).toBe(true);
      expect(result.current.variant).toEqual({
        showFees: true,
        layout: 'expanded',
      });
    });

    it('falls back to first variant when object name does not match any variant', () => {
      mockUseSelector.mockReturnValue({
        buttonColorTest: { name: 'invalid_variant' },
      });

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'green', short: 'red' });
      expect(result.current.variantName).toBe('control');
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('with legacy string format (backward compatibility)', () => {
    it('returns correct variant data when flag is a string', () => {
      mockUseSelector.mockReturnValue({ buttonColorTest: 'control' });

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'green', short: 'red' });
      expect(result.current.variantName).toBe('control');
      expect(result.current.isActive).toBe(true);
    });

    it('returns correct variant data when flag matches treatment variant', () => {
      mockUseSelector.mockReturnValue({ buttonColorTest: 'monochrome' });

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'white', short: 'white' });
      expect(result.current.variantName).toBe('monochrome');
      expect(result.current.isActive).toBe(true);
    });

    it('sets isActive to true when flag value matches a valid variant', () => {
      mockUseSelector.mockReturnValue({ swapsQuoteLayout: 'expanded' });

      const { result } = renderHook(() =>
        useABTest('swapsQuoteLayout', quoteLayoutVariants),
      );

      expect(result.current.isActive).toBe(true);
      expect(result.current.variant).toEqual({
        showFees: true,
        layout: 'expanded',
      });
    });
  });

  describe('with null or undefined flag value', () => {
    it('falls back to first variant when flag is null', () => {
      mockUseSelector.mockReturnValue({ buttonColorTest: null });

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'green', short: 'red' });
      expect(result.current.variantName).toBe('control');
      expect(result.current.isActive).toBe(false);
    });

    it('falls back to first variant when flag is undefined', () => {
      mockUseSelector.mockReturnValue({ buttonColorTest: undefined });

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'green', short: 'red' });
      expect(result.current.variantName).toBe('control');
      expect(result.current.isActive).toBe(false);
    });

    it('falls back to first variant when flag key does not exist', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() =>
        useABTest('nonExistentFlag', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'green', short: 'red' });
      expect(result.current.variantName).toBe('control');
      expect(result.current.isActive).toBe(false);
    });

    it('sets isActive to false when flag value is not set', () => {
      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('with invalid flag value not matching any variant', () => {
    it('falls back to first variant when flag value is invalid', () => {
      mockUseSelector.mockReturnValue({
        buttonColorTest: 'invalid_variant_name',
      });

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'green', short: 'red' });
      expect(result.current.variantName).toBe('control');
    });

    it('sets isActive to false when flag value does not match any variant', () => {
      mockUseSelector.mockReturnValue({ buttonColorTest: 'unknown_variant' });

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.isActive).toBe(false);
    });

    it('falls back to first variant when flag value is empty string', () => {
      mockUseSelector.mockReturnValue({ buttonColorTest: '' });

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'green', short: 'red' });
      expect(result.current.variantName).toBe('control');
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('with complex variant data objects', () => {
    it('works with deeply nested variant data', () => {
      const complexVariants = {
        control: {
          ui: { button: { color: 'blue', size: 'medium' } },
          behavior: { autoSubmit: false },
        },
        treatment: {
          ui: { button: { color: 'green', size: 'large' } },
          behavior: { autoSubmit: true },
        },
      };

      mockUseSelector.mockReturnValue({ complexTest: 'treatment' });

      const { result } = renderHook(() =>
        useABTest('complexTest', complexVariants),
      );

      expect(result.current.variant).toEqual({
        ui: { button: { color: 'green', size: 'large' } },
        behavior: { autoSubmit: true },
      });
      expect(result.current.variantName).toBe('treatment');
      expect(result.current.isActive).toBe(true);
    });

    it('works with array data in variants', () => {
      const arrayVariants = {
        control: { items: ['a', 'b'], count: 2 },
        expanded: { items: ['a', 'b', 'c', 'd'], count: 4 },
      };

      mockUseSelector.mockReturnValue({ arrayTest: 'expanded' });

      const { result } = renderHook(() =>
        useABTest('arrayTest', arrayVariants),
      );

      expect(result.current.variant).toEqual({
        items: ['a', 'b', 'c', 'd'],
        count: 4,
      });
    });
  });

  describe('with multiple feature flags', () => {
    it('reads correct flag from multiple flags in state', () => {
      mockUseSelector.mockReturnValue({
        buttonColorTest: 'control',
        swapsQuoteLayout: 'expanded',
        anotherFlag: 'value',
      });

      const buttonResult = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      const quoteResult = renderHook(() =>
        useABTest('swapsQuoteLayout', quoteLayoutVariants),
      );

      expect(buttonResult.result.current.variantName).toBe('control');
      expect(buttonResult.result.current.isActive).toBe(true);

      expect(quoteResult.result.current.variantName).toBe('expanded');
      expect(quoteResult.result.current.isActive).toBe(true);
    });
  });

  describe('with three or more variants', () => {
    it('correctly handles tests with three variants', () => {
      const threeVariants = {
        control: { layout: 'default' },
        treatment_a: { layout: 'compact' },
        treatment_b: { layout: 'expanded' },
      };

      mockUseSelector.mockReturnValue({ multiVariantTest: 'treatment_b' });

      const { result } = renderHook(() =>
        useABTest('multiVariantTest', threeVariants),
      );

      expect(result.current.variant).toEqual({ layout: 'expanded' });
      expect(result.current.variantName).toBe('treatment_b');
      expect(result.current.isActive).toBe(true);
    });

    it('falls back to first variant for multi-variant test when flag not set', () => {
      const threeVariants = {
        control: { layout: 'default' },
        treatment_a: { layout: 'compact' },
        treatment_b: { layout: 'expanded' },
      };

      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() =>
        useABTest('multiVariantTest', threeVariants),
      );

      expect(result.current.variant).toEqual({ layout: 'default' });
      expect(result.current.variantName).toBe('control');
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles flags state being null', () => {
      mockUseSelector.mockReturnValue(null);

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'green', short: 'red' });
      expect(result.current.variantName).toBe('control');
      expect(result.current.isActive).toBe(false);
    });

    it('handles flags state being undefined', () => {
      mockUseSelector.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variant).toEqual({ long: 'green', short: 'red' });
      expect(result.current.variantName).toBe('control');
      expect(result.current.isActive).toBe(false);
    });

    it('works with single variant (edge case)', () => {
      const singleVariant = {
        only: { value: 'single' },
      };

      mockUseSelector.mockReturnValue({});

      const { result } = renderHook(() =>
        useABTest('singleTest', singleVariant),
      );

      expect(result.current.variant).toEqual({ value: 'single' });
      expect(result.current.variantName).toBe('only');
      expect(result.current.isActive).toBe(false);
    });

    it('returns consistent variantName as string', () => {
      mockUseSelector.mockReturnValue({ numericKeyTest: 'variant1' });

      const variants = {
        variant1: { id: 1 },
        variant2: { id: 2 },
      };

      const { result } = renderHook(() =>
        useABTest('numericKeyTest', variants),
      );

      expect(typeof result.current.variantName).toBe('string');
      expect(result.current.variantName).toBe('variant1');
    });
  });

  describe('type safety', () => {
    it('returns correctly typed variant data', () => {
      interface ButtonColors {
        long: string;
        short: string;
      }

      const typedVariants: Record<string, ButtonColors> = {
        control: { long: 'green', short: 'red' },
        monochrome: { long: 'white', short: 'white' },
      };

      mockUseSelector.mockReturnValue({ typedTest: 'control' });

      const { result } = renderHook(() =>
        useABTest('typedTest', typedVariants),
      );

      // TypeScript should infer variant as ButtonColors
      const variant = result.current.variant as ButtonColors;
      expect(variant.long).toBe('green');
      expect(variant.short).toBe('red');
    });
  });

  describe('hook stability', () => {
    it('returns stable results when flag value does not change', () => {
      mockUseSelector.mockReturnValue({ buttonColorTest: 'control' });

      const { result, rerender } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      const firstResult = result.current;
      rerender(undefined);
      const secondResult = result.current;

      expect(firstResult.variantName).toBe(secondResult.variantName);
      expect(firstResult.isActive).toBe(secondResult.isActive);
    });

    it('updates when flag value changes', () => {
      mockUseSelector.mockReturnValue({ buttonColorTest: 'control' });

      const { result, rerender } = renderHook(() =>
        useABTest('buttonColorTest', buttonColorVariants),
      );

      expect(result.current.variantName).toBe('control');

      // Simulate flag value change
      mockUseSelector.mockReturnValue({ buttonColorTest: 'monochrome' });
      rerender(undefined);

      expect(result.current.variantName).toBe('monochrome');
    });
  });
});
