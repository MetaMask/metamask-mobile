import { renderHook } from '@testing-library/react-hooks';
import { useSlippageStepperDescription } from './index';
import { BridgeSlippageConfig } from '../../types';
import { InputStepperDescriptionType } from '../../components/InputStepper/constants';
import {
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, options?: { value?: number }) => {
    if (options?.value !== undefined) {
      return `${key} [${options.value}]`;
    }
    return key;
  }),
}));

describe('useSlippageStepperDescription', () => {
  const defaultSlippageConfig: BridgeSlippageConfig['__default__'] = {
    input_step: 0.1,
    max_amount: 100,
    min_amount: 0,
    input_max_decimals: 2,
    lower_allowed_slippage_threshold: {
      messageId: 'bridge.lower_allowed_error',
      value: 0.1,
      inclusive: true,
    },
    lower_suggested_slippage_threshold: {
      messageId: 'bridge.lower_suggested_warning',
      value: 0.5,
      inclusive: false,
    },
    upper_suggested_slippage_threshold: {
      messageId: 'bridge.upper_suggested_warning',
      value: 5,
      inclusive: false,
    },
    upper_allowed_slippage_threshold: {
      messageId: 'bridge.upper_allowed_error',
      value: 50,
      inclusive: true,
    },
    default_slippage_options: ['0.5', '2', '3'],
    has_custom_slippage_option: true,
  };

  describe('returns undefined when no threshold violated', () => {
    it('returns undefined for valid value in range', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '2',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current).toBeUndefined();
    });

    it('returns undefined when value is in safe zone', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '3',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe('lower_allowed_slippage_threshold (ERROR)', () => {
    it('returns error when value violates inclusive lower allowed threshold', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.1',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
      expect(result.current?.color).toBe(TextColor.ErrorDefault);
      expect(result.current?.message).toBe('bridge.lower_allowed_error [0.1]');
      expect(result.current).toMatchSnapshot();
    });

    it('returns error when value is below inclusive lower allowed threshold', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.05',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
      expect(result.current).toMatchSnapshot();
    });

    it('handles exclusive lower allowed threshold', () => {
      const config = {
        ...defaultSlippageConfig,
        lower_allowed_slippage_threshold: {
          messageId: 'bridge.lower_allowed_error',
          value: 0.5,
          inclusive: false,
        },
      };

      // At threshold with exclusive should NOT trigger error
      const { result: atThreshold } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.5',
          slippageConfig: config,
          hasAttemptedToExceedMax: false,
        }),
      );
      expect(atThreshold.current).toBeUndefined();

      // Below threshold should trigger error
      const { result: belowThreshold } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.4',
          slippageConfig: config,
          hasAttemptedToExceedMax: false,
        }),
      );
      expect(belowThreshold.current?.type).toBe(
        InputStepperDescriptionType.ERROR,
      );
    });
  });

  describe('lower_suggested_slippage_threshold (WARNING)', () => {
    it('returns warning when value violates exclusive lower suggested threshold', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.4',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.WARNING);
      expect(result.current?.color).toBe(TextColor.WarningDefault);
      expect(result.current?.message).toBe(
        'bridge.lower_suggested_warning [0.5]',
      );
      expect(result.current).toMatchSnapshot();
    });

    it('does not trigger at threshold value with exclusive', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.5',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      // At 0.5 with exclusive should not trigger
      expect(result.current).toBeUndefined();
    });
  });

  describe('upper_suggested_slippage_threshold (WARNING)', () => {
    it('returns warning when value exceeds exclusive upper suggested threshold', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '6',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.WARNING);
      expect(result.current?.color).toBe(TextColor.WarningDefault);
      expect(result.current?.message).toBe(
        'bridge.upper_suggested_warning [5]',
      );
      expect(result.current).toMatchSnapshot();
    });

    it('does not trigger at threshold value with exclusive', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '5',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      // At 5 with exclusive should not trigger
      expect(result.current).toBeUndefined();
    });
  });

  describe('upper_allowed_slippage_threshold (ERROR)', () => {
    it('returns error when value violates inclusive upper allowed threshold', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '50',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
      expect(result.current?.color).toBe(TextColor.ErrorDefault);
      expect(result.current?.message).toBe('bridge.upper_allowed_error [50]');
      expect(result.current).toMatchSnapshot();
    });

    it('returns error when value exceeds inclusive upper allowed threshold', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '51',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
      expect(result.current).toMatchSnapshot();
    });

    it('triggers error with hasAttemptedToExceedMax flag', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '10',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: true,
        }),
      );

      // Even though value is valid, hasAttemptedToExceedMax should trigger error
      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
      expect(result.current).toMatchSnapshot();
    });
  });

  describe('threshold priority order', () => {
    it('prioritizes lower allowed error over lower suggested warning', () => {
      // 0.09 violates both lower_allowed (0.1) and lower_suggested (0.5)
      // Should return ERROR, not WARNING
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.09',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
      expect(result.current?.message).toBe('bridge.lower_allowed_error [0.1]');
    });

    it('shows warning when only suggested threshold violated', () => {
      // 0.2 is above lower_allowed (0.1) but below lower_suggested (0.5)
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.2',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.WARNING);
      expect(result.current?.message).toBe(
        'bridge.lower_suggested_warning [0.5]',
      );
    });

    it('prioritizes upper allowed error over upper suggested warning', () => {
      // 60 violates both upper_suggested (5) and upper_allowed (50)
      // Should return ERROR, not WARNING
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '60',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
      expect(result.current?.message).toBe('bridge.upper_allowed_error [50]');
    });
  });

  describe('icon configuration', () => {
    it('includes icon with correct properties for ERROR', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.05',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.icon).toEqual({
        name: IconName.Danger,
        size: IconSize.Lg,
        color: IconColor.ErrorDefault,
      });
    });

    it('includes icon with correct properties for WARNING', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.3',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.icon).toEqual({
        name: IconName.Danger,
        size: IconSize.Lg,
        color: IconColor.WarningDefault,
      });
    });
  });

  describe('null threshold handling', () => {
    it('works when all thresholds are null', () => {
      const config: BridgeSlippageConfig['__default__'] = {
        ...defaultSlippageConfig,
        lower_allowed_slippage_threshold: null,
        lower_suggested_slippage_threshold: null,
        upper_suggested_slippage_threshold: null,
        upper_allowed_slippage_threshold: null,
      };

      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.01',
          slippageConfig: config,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current).toBeUndefined();
    });

    it('skips null thresholds and checks next one', () => {
      const config: BridgeSlippageConfig['__default__'] = {
        ...defaultSlippageConfig,
        lower_allowed_slippage_threshold: null,
        lower_suggested_slippage_threshold: {
          messageId: 'bridge.lower_suggested_warning',
          value: 0.5,
          inclusive: false,
        },
      };

      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.3',
          slippageConfig: config,
          hasAttemptedToExceedMax: false,
        }),
      );

      // Should skip null lower_allowed and trigger lower_suggested
      expect(result.current?.type).toBe(InputStepperDescriptionType.WARNING);
      expect(result.current?.message).toBe(
        'bridge.lower_suggested_warning [0.5]',
      );
    });
  });

  describe('hasAttemptedToExceedMax flag', () => {
    it('triggers upper allowed error when flag is true', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '10',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: true,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
      expect(result.current?.message).toBe('bridge.upper_allowed_error [50]');
    });

    it('does not trigger when flag is false and value is in safe range', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '5',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      // Value 3 is in safe zone (above 0.5, below 5), should not trigger anything
      expect(result.current).toBeUndefined();
    });

    it('flag works even at threshold boundary', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '50',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: true,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
    });
  });

  describe('edge cases', () => {
    it('handles empty string input', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      // parseFloat('') returns NaN, which fails all comparisons
      expect(result.current).toBeUndefined();
    });

    it('handles zero value', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      // 0 <= 0.1 (inclusive) triggers error
      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
    });

    it('handles decimal values', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '2.75',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current).toBeUndefined();
    });

    it('handles very large values', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '999',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
      expect(result.current?.message).toBe('bridge.upper_allowed_error [50]');
    });

    it('handles very small decimal values', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.001',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
    });

    it('handles invalid numeric input', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: 'abc',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      // parseFloat('abc') returns NaN
      expect(result.current).toBeUndefined();
    });
  });

  describe('inclusive vs exclusive logic', () => {
    it('inclusive lower threshold triggers at exact value', () => {
      const config = {
        ...defaultSlippageConfig,
        lower_suggested_slippage_threshold: null, // Disable to isolate test
        lower_allowed_slippage_threshold: {
          messageId: 'bridge.error',
          value: 1,
          inclusive: true,
        },
      };

      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '1',
          slippageConfig: config,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
    });

    it('exclusive lower threshold does not trigger at exact value', () => {
      const config = {
        ...defaultSlippageConfig,
        lower_suggested_slippage_threshold: null, // Disable to isolate test
        lower_allowed_slippage_threshold: {
          messageId: 'bridge.error',
          value: 1,
          inclusive: false,
        },
      };

      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '1',
          slippageConfig: config,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current).toBeUndefined();
    });

    it('inclusive upper threshold triggers at exact value', () => {
      const config = {
        ...defaultSlippageConfig,
        upper_suggested_slippage_threshold: null, // Disable to isolate test
        upper_allowed_slippage_threshold: {
          messageId: 'bridge.error',
          value: 10,
          inclusive: true,
        },
      };

      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '10',
          slippageConfig: config,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current?.type).toBe(InputStepperDescriptionType.ERROR);
    });

    it('exclusive upper threshold does not trigger at exact value', () => {
      const config = {
        ...defaultSlippageConfig,
        upper_suggested_slippage_threshold: null, // Disable to isolate test
        upper_allowed_slippage_threshold: {
          messageId: 'bridge.error',
          value: 10,
          inclusive: false,
        },
      };

      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '10',
          slippageConfig: config,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe('complete snapshots for all states', () => {
    it('snapshot for lower allowed error', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.05',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current).toMatchSnapshot();
    });

    it('snapshot for lower suggested warning', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '0.3',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current).toMatchSnapshot();
    });

    it('snapshot for upper suggested warning', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '10',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current).toMatchSnapshot();
    });

    it('snapshot for upper allowed error', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '60',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current).toMatchSnapshot();
    });

    it('snapshot for no violation', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '2',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: false,
        }),
      );

      expect(result.current).toMatchSnapshot();
    });

    it('snapshot with hasAttemptedToExceedMax', () => {
      const { result } = renderHook(() =>
        useSlippageStepperDescription({
          inputAmount: '5',
          slippageConfig: defaultSlippageConfig,
          hasAttemptedToExceedMax: true,
        }),
      );

      expect(result.current).toMatchSnapshot();
    });
  });
});
