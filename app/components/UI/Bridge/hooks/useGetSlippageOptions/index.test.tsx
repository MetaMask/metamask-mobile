import { renderHook } from '@testing-library/react-hooks';
import { useGetSlippageOptions } from './index';

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'bridge.custom': 'Custom',
    };
    return translations[key] || key;
  }),
}));

describe('useGetSlippageOptions', () => {
  const defaultProps = {
    slippageOptions: ['auto', '1', '2', '3'] as const,
    slippage: '2',
    onDefaultOptionPress: jest.fn(() => jest.fn()),
    onCustomOptionPress: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not includes custom option if allowCustomSlippage is false', () => {
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        allowCustomSlippage: false,
      }),
    );

    const hasCustomOption = result.current.some(
      (option) => option.id === 'custom-slippage',
    );
    expect(hasCustomOption).toBe(false);
    expect(result.current).toMatchSnapshot();
  });

  it('includes custom option if allowCustomSlippage is true', () => {
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        allowCustomSlippage: true,
      }),
    );

    const customOption = result.current.find(
      (option) => option.id === 'custom-slippage',
    );
    expect(customOption).toBeDefined();
    expect(customOption?.label).toBe('Custom');
    expect(result.current).toMatchSnapshot();
  });

  it('capitalizes the label if slippage option is not a number', () => {
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        slippageOptions: ['auto', 'custom'],
        slippage: 'auto',
      }),
    );

    expect(result.current[0].label).toBe('Auto');
    expect(result.current[1].label).toBe('Custom');
    expect(result.current).toMatchSnapshot();
  });

  it('sets slippage option value as label if it is a number', () => {
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        slippageOptions: ['1', '2', '5', '10'],
        slippage: '2',
      }),
    );

    expect(result.current[0].label).toBe('1%');
    expect(result.current[1].label).toBe('2%');
    expect(result.current[2].label).toBe('5%');
    expect(result.current[3].label).toBe('10%');
    expect(result.current).toMatchSnapshot();
  });

  it('calls onDefaultOptionPress with correct numeric value', () => {
    const onDefaultOptionPress = jest.fn(() => jest.fn());
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        slippageOptions: ['1', '2', '3'],
        onDefaultOptionPress,
      }),
    );

    result.current[0].onPress();

    expect(onDefaultOptionPress).toHaveBeenCalledWith('1');
  });

  it('calls onDefaultOptionPress with correct non numeric value (eg. auto)', () => {
    const onDefaultOptionPress = jest.fn(() => jest.fn());
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        slippageOptions: ['auto', '1', '2'],
        onDefaultOptionPress,
      }),
    );

    result.current[0].onPress();

    expect(onDefaultOptionPress).toHaveBeenCalledWith('auto');
  });

  it('set selected default slippage option if slippage value exist in slippageOptions array', () => {
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        slippageOptions: ['auto', '1', '2', '3'],
        slippage: '2',
      }),
    );

    expect(result.current[0].selected).toBe(false); // auto
    expect(result.current[1].selected).toBe(false); // 1
    expect(result.current[2].selected).toBe(true); // 2 - selected
    expect(result.current[3].selected).toBe(false); // 3
    expect(result.current).toMatchSnapshot();
  });

  it('set custom slippage option if slippage value does not exist on slippageOptions array', () => {
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        allowCustomSlippage: true,
        slippageOptions: ['auto', '1', '2', '3'],
        slippage: '5.5', // Custom value not in options
      }),
    );

    const customOption = result.current.find(
      (option) => option.id === 'custom-slippage',
    );
    expect(customOption?.selected).toBe(true);

    // All default options should be false
    const defaultOptions = result.current.filter(
      (option) => option.id !== 'custom-slippage',
    );
    defaultOptions.forEach((option) => {
      expect(option.selected).toBe(false);
    });

    expect(result.current).toMatchSnapshot();
  });

  it('provides custom option press callback to custom option array element', () => {
    const onCustomOptionPress = jest.fn();
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        allowCustomSlippage: true,
        onCustomOptionPress,
      }),
    );

    const customOption = result.current.find(
      (option) => option.id === 'custom-slippage',
    );
    customOption?.onPress();

    expect(onCustomOptionPress).toHaveBeenCalledTimes(1);
  });

  it('does not render custom option if onCustomOptionPress is not provided', () => {
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        allowCustomSlippage: true,
        onCustomOptionPress: undefined,
      }),
    );

    const customOption = result.current.find(
      (option) => option.id === 'custom-slippage',
    );
    expect(customOption).toBeUndefined();
    expect(result.current).toMatchSnapshot();
  });

  it('does not render custom option if allowCustomSlippage is not provided', () => {
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        allowCustomSlippage: undefined,
      }),
    );

    const customOption = result.current.find(
      (option) => option.id === 'custom-slippage',
    );
    expect(customOption).toBeUndefined();
    expect(result.current).toMatchSnapshot();
  });

  it('should handle "auto" as slippage option', () => {
    const { result } = renderHook(() =>
      useGetSlippageOptions({
        ...defaultProps,
        slippageOptions: ['auto', '1', '2'],
        slippage: 'auto',
      }),
    );

    expect(result.current[0].id).toBe('auto');
    expect(result.current[0].label).toBe('Auto');
    expect(result.current[0].selected).toBe(true);
    expect(result.current).toMatchSnapshot();
  });

  describe('edge cases', () => {
    it('handles empty slippageOptions array', () => {
      const { result } = renderHook(() =>
        useGetSlippageOptions({
          ...defaultProps,
          slippageOptions: [],
          slippage: '1',
        }),
      );

      expect(result.current).toHaveLength(0);
      expect(result.current).toMatchSnapshot();
    });

    it('handles decimal values', () => {
      const { result } = renderHook(() =>
        useGetSlippageOptions({
          ...defaultProps,
          slippageOptions: ['0.5', '1.5', '2.5'],
          slippage: '1.5',
        }),
      );

      expect(result.current[0].label).toBe('0.5%');
      expect(result.current[1].label).toBe('1.5%');
      expect(result.current[1].selected).toBe(true);
      expect(result.current).toMatchSnapshot();
    });

    it('handles large numbers', () => {
      const { result } = renderHook(() =>
        useGetSlippageOptions({
          ...defaultProps,
          slippageOptions: ['10', '50', '100'],
          slippage: '50',
        }),
      );

      expect(result.current[0].label).toBe('10%');
      expect(result.current[1].label).toBe('50%');
      expect(result.current[2].label).toBe('100%');
      expect(result.current).toMatchSnapshot();
    });

    it('handles zero value', () => {
      const { result } = renderHook(() =>
        useGetSlippageOptions({
          ...defaultProps,
          slippageOptions: ['0', '1', '2'],
          slippage: '0',
        }),
      );

      expect(result.current[0].label).toBe('0%');
      expect(result.current[0].selected).toBe(true);
      expect(result.current).toMatchSnapshot();
    });

    it('handles string coercion for selection', () => {
      const { result } = renderHook(() =>
        useGetSlippageOptions({
          ...defaultProps,
          slippageOptions: ['1', '2', '3'],
          slippage: '2',
        }),
      );

      // Should match even if types differ
      expect(result.current[1].selected).toBe(true);
      expect(result.current).toMatchSnapshot();
    });

    it('handles mixed case string options', () => {
      const { result } = renderHook(() =>
        useGetSlippageOptions({
          ...defaultProps,
          slippageOptions: ['AUTO', 'custom', 'Default'],
          slippage: 'AUTO',
        }),
      );

      expect(result.current[0].label).toBe('Auto');
      expect(result.current[1].label).toBe('Custom');
      expect(result.current[2].label).toBe('Default');
      expect(result.current).toMatchSnapshot();
    });
  });

  describe('complete output structure', () => {
    it('returns correct structure for all options without custom', () => {
      const { result } = renderHook(() =>
        useGetSlippageOptions({
          ...defaultProps,
          slippageOptions: ['auto', '1', '2'],
          slippage: '1',
          allowCustomSlippage: false,
        }),
      );

      expect(result.current).toMatchSnapshot();
    });

    it('returns correct structure for all options with custom', () => {
      const { result } = renderHook(() =>
        useGetSlippageOptions({
          ...defaultProps,
          slippageOptions: ['auto', '1', '2', '3'],
          slippage: '2',
          allowCustomSlippage: true,
        }),
      );

      expect(result.current).toMatchSnapshot();
    });

    it('returns correct structure when custom is selected', () => {
      const { result } = renderHook(() =>
        useGetSlippageOptions({
          ...defaultProps,
          slippageOptions: ['auto', '1', '2'],
          slippage: '5.75',
          allowCustomSlippage: true,
        }),
      );

      expect(result.current).toMatchSnapshot();
    });
  });
});
