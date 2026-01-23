import { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { BridgeSlippageConfig } from '../../types';
import { InputStepperDescriptionType } from '../../components/InputStepper/constants';

interface Props {
  inputAmount: string;
  slippageConfig: BridgeSlippageConfig['__default__'];
  hasAttemptedToExceedMax: boolean;
}

export const useSlippageStepperDescription = ({
  inputAmount,
  slippageConfig,
  hasAttemptedToExceedMax,
}: Props) =>
  useMemo(() => {
    const value = parseFloat(inputAmount);

    // Note that order matters to render the correct messages.
    const thresholds = [
      {
        threshold: slippageConfig.lower_allowed_slippage_threshold,
        type: InputStepperDescriptionType.ERROR,
        compare: (v: number, t: number, inclusive: boolean) =>
          inclusive ? v <= t : v < t,
      },
      {
        threshold: slippageConfig.lower_suggested_slippage_threshold,
        type: InputStepperDescriptionType.WARNING,
        compare: (v: number, t: number, inclusive: boolean) =>
          inclusive ? v <= t : v < t,
      },
      {
        threshold: slippageConfig.upper_allowed_slippage_threshold,
        type: InputStepperDescriptionType.ERROR,
        compare: (v: number, t: number, inclusive: boolean) =>
          hasAttemptedToExceedMax || (inclusive ? v >= t : v > t),
      },
      {
        threshold: slippageConfig.upper_suggested_slippage_threshold,
        type: InputStepperDescriptionType.WARNING,
        compare: (v: number, t: number, inclusive: boolean) =>
          inclusive ? v >= t : v > t,
      },
    ] as const;

    for (const { threshold, type, compare } of thresholds) {
      if (threshold && compare(value, threshold.value, threshold.inclusive)) {
        return {
          type,
          message: strings(threshold.messageId, { value: threshold.value }),
        };
      }
    }
  }, [inputAmount, slippageConfig, hasAttemptedToExceedMax]);
