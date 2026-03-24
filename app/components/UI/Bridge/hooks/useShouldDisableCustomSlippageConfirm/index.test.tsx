import { renderHook } from '@testing-library/react-hooks';
import { useShouldDisableCustomSlippageConfirm } from './index';
import { BridgeSlippageConfig } from '../../types';

describe('useShouldDisableCustomSlippageConfirm', () => {
  const defaultSlippageConfig: BridgeSlippageConfig['__default__'] = {
    input_step: 1,
    max_amount: 100,
    min_amount: 0,
    input_max_decimals: 2,
    lower_allowed_slippage_threshold: {
      messageId: 'bridge.lower_allowed_error',
      value: 0.5,
      inclusive: true,
    },
    lower_suggested_slippage_threshold: null,
    upper_suggested_slippage_threshold: null,
    upper_allowed_slippage_threshold: {
      messageId: 'bridge.upper_allowed_error',
      value: 50,
      inclusive: true,
    },
    default_slippage_options: ['auto', '1', '2', '3'],
    has_custom_slippage_option: true,
  };

  it('disables confirm if value is more than max amount', () => {
    const { result } = renderHook(() =>
      useShouldDisableCustomSlippageConfirm({
        inputAmount: '101',
        slippageConfig: defaultSlippageConfig,
      }),
    );

    expect(result.current).toBe(true);
  });

  it('disables confirm if value is less than min amount', () => {
    const { result } = renderHook(() =>
      useShouldDisableCustomSlippageConfirm({
        inputAmount: '-1',
        slippageConfig: defaultSlippageConfig,
      }),
    );

    expect(result.current).toBe(true);
  });

  it('disables confirm if inputAmount is at max value', () => {
    const { result } = renderHook(() =>
      useShouldDisableCustomSlippageConfirm({
        inputAmount: '100',
        slippageConfig: defaultSlippageConfig,
      }),
    );

    // Value at max is valid (not more than), but violates upper threshold (50, inclusive)
    expect(result.current).toBe(true);
  });

  it('disables confirm if inputAmount exceeds upper allowed slippage threshold', () => {
    const { result } = renderHook(() =>
      useShouldDisableCustomSlippageConfirm({
        inputAmount: '51',
        slippageConfig: defaultSlippageConfig,
      }),
    );

    expect(result.current).toBe(true);
  });

  it('disables confirm if inputAmount violates lower allowed slippage threshold', () => {
    const { result } = renderHook(() =>
      useShouldDisableCustomSlippageConfirm({
        inputAmount: '0.3',
        slippageConfig: defaultSlippageConfig,
      }),
    );

    expect(result.current).toBe(true);
  });

  it('enables confirm if upper allowed slippage threshold is not defined', () => {
    const configWithoutUpper: BridgeSlippageConfig['__default__'] = {
      ...defaultSlippageConfig,
      upper_allowed_slippage_threshold: null,
    };

    const { result } = renderHook(() =>
      useShouldDisableCustomSlippageConfirm({
        inputAmount: '99',
        slippageConfig: configWithoutUpper,
      }),
    );

    // Should not disable since there's no upper threshold
    expect(result.current).toBe(false);
  });

  it('enables confirm if lower allowed slippage threshold is not defined', () => {
    const configWithoutLower: BridgeSlippageConfig['__default__'] = {
      ...defaultSlippageConfig,
      lower_allowed_slippage_threshold: null,
    };

    const { result } = renderHook(() =>
      useShouldDisableCustomSlippageConfirm({
        inputAmount: '0.3',
        slippageConfig: configWithoutLower,
      }),
    );

    // Should not disable since there's no lower threshold
    expect(result.current).toBe(false);
  });

  it('handles inclusive and exclusive lower allowed slippage threshold range', () => {
    // Test inclusive (value <= threshold)
    const inclusiveConfig: BridgeSlippageConfig['__default__'] = {
      ...defaultSlippageConfig,
      lower_allowed_slippage_threshold: {
        messageId: 'bridge.lower_allowed_error',
        value: 1,
        inclusive: true,
      },
    };

    const { result: inclusiveResult } = renderHook(() =>
      useShouldDisableCustomSlippageConfirm({
        inputAmount: '1',
        slippageConfig: inclusiveConfig,
      }),
    );

    // With inclusive, value === threshold should disable
    expect(inclusiveResult.current).toBe(true);

    // Test exclusive (value < threshold)
    const exclusiveConfig: BridgeSlippageConfig['__default__'] = {
      ...defaultSlippageConfig,
      lower_allowed_slippage_threshold: {
        messageId: 'bridge.lower_allowed_error',
        value: 1,
        inclusive: false,
      },
    };

    const { result: exclusiveResult } = renderHook(() =>
      useShouldDisableCustomSlippageConfirm({
        inputAmount: '1',
        slippageConfig: exclusiveConfig,
      }),
    );

    // With exclusive, value === threshold should NOT disable
    expect(exclusiveResult.current).toBe(false);
  });

  it('handles inclusive and exclusive upper allowed slippage threshold range', () => {
    // Test inclusive (value >= threshold)
    const inclusiveConfig: BridgeSlippageConfig['__default__'] = {
      ...defaultSlippageConfig,
      upper_allowed_slippage_threshold: {
        messageId: 'bridge.upper_allowed_error',
        value: 50,
        inclusive: true,
      },
    };

    const { result: inclusiveResult } = renderHook(() =>
      useShouldDisableCustomSlippageConfirm({
        inputAmount: '50',
        slippageConfig: inclusiveConfig,
      }),
    );

    // With inclusive, value === threshold should disable
    expect(inclusiveResult.current).toBe(true);

    // Test exclusive (value > threshold)
    const exclusiveConfig: BridgeSlippageConfig['__default__'] = {
      ...defaultSlippageConfig,
      upper_allowed_slippage_threshold: {
        messageId: 'bridge.upper_allowed_error',
        value: 50,
        inclusive: false,
      },
    };

    const { result: exclusiveResult } = renderHook(() =>
      useShouldDisableCustomSlippageConfirm({
        inputAmount: '50',
        slippageConfig: exclusiveConfig,
      }),
    );

    // With exclusive, value === threshold should NOT disable
    expect(exclusiveResult.current).toBe(false);
  });

  describe('edge cases', () => {
    it('enables confirm when value is within valid range', () => {
      const { result } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '5',
          slippageConfig: defaultSlippageConfig,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('handles value at exact min_amount', () => {
      const { result } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '0',
          slippageConfig: defaultSlippageConfig,
        }),
      );

      // Value at min is valid (not less than)
      expect(result.current).toBe(true); // But violates lower_allowed_slippage_threshold
    });

    it('handles value at exact max_amount', () => {
      const { result } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '100',
          slippageConfig: defaultSlippageConfig,
        }),
      );

      // Value at max is valid (not more than), but violates upper threshold
      expect(result.current).toBe(true);
    });

    it('handles decimal values', () => {
      const { result } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '2.5',
          slippageConfig: defaultSlippageConfig,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('handles zero value', () => {
      const configWithZeroMin: BridgeSlippageConfig['__default__'] = {
        ...defaultSlippageConfig,
        min_amount: 0,
        lower_allowed_slippage_threshold: null,
      };

      const { result } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '0',
          slippageConfig: configWithZeroMin,
        }),
      );

      expect(result.current).toBe(false);
    });

    it('handles empty string as input', () => {
      const { result } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '',
          slippageConfig: defaultSlippageConfig,
        }),
      );

      // parseFloat('') returns NaN, which fails all comparisons
      expect(result.current).toBe(false);
    });

    it('handles invalid numeric string', () => {
      const { result } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: 'abc',
          slippageConfig: defaultSlippageConfig,
        }),
      );

      // parseFloat('abc') returns NaN
      expect(result.current).toBe(false);
    });

    it('handles both thresholds as null', () => {
      const configWithoutThresholds: BridgeSlippageConfig['__default__'] = {
        ...defaultSlippageConfig,
        lower_allowed_slippage_threshold: null,
        upper_allowed_slippage_threshold: null,
      };

      const { result } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '50',
          slippageConfig: configWithoutThresholds,
        }),
      );

      // Should only check min/max amounts
      expect(result.current).toBe(false);
    });
  });

  describe('boundary testing', () => {
    it('tests lower threshold exclusive boundary', () => {
      const config: BridgeSlippageConfig['__default__'] = {
        ...defaultSlippageConfig,
        lower_allowed_slippage_threshold: {
          messageId: 'bridge.lower_allowed_error',
          value: 1,
          inclusive: false,
        },
      };

      // Just below threshold (should disable)
      const { result: below } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '0.9',
          slippageConfig: config,
        }),
      );
      expect(below.current).toBe(true);

      // At threshold (should NOT disable with exclusive)
      const { result: at } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '1',
          slippageConfig: config,
        }),
      );
      expect(at.current).toBe(false);

      // Above threshold (should NOT disable)
      const { result: above } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '1.1',
          slippageConfig: config,
        }),
      );
      expect(above.current).toBe(false);
    });

    it('tests upper threshold exclusive boundary', () => {
      const config: BridgeSlippageConfig['__default__'] = {
        ...defaultSlippageConfig,
        upper_allowed_slippage_threshold: {
          messageId: 'bridge.upper_allowed_error',
          value: 50,
          inclusive: false,
        },
      };

      // Below threshold (should NOT disable)
      const { result: below } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '49',
          slippageConfig: config,
        }),
      );
      expect(below.current).toBe(false);

      // At threshold (should NOT disable with exclusive)
      const { result: at } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '50',
          slippageConfig: config,
        }),
      );
      expect(at.current).toBe(false);

      // Above threshold (should disable)
      const { result: above } = renderHook(() =>
        useShouldDisableCustomSlippageConfirm({
          inputAmount: '51',
          slippageConfig: config,
        }),
      );
      expect(above.current).toBe(true);
    });
  });
});
