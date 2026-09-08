import { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { type InputStepperProps } from '../../../../../component-library/components-temp/InputStepper';
import { BridgeSlippageConfig } from '../../types';
import { HelpTextSeverity } from '@metamask/design-system-react-native';

interface Props {
  inputAmount: string;
  slippageConfig: BridgeSlippageConfig['__default__'];
  hasAttemptedToExceedMax: boolean;
}

export const useSlippageStepperDescription = ({
  inputAmount,
  slippageConfig,
  hasAttemptedToExceedMax,
}: Props): InputStepperProps['description'] =>
  useMemo(() => {
    const value = parseFloat(inputAmount);

    // Note that order matters to render the correct messages.
    const thresholds = [
      {
        threshold: slippageConfig.lower_allowed_slippage_threshold,
        severity: HelpTextSeverity.Danger,
        compare: (v: number, t: number, inclusive: boolean) =>
          inclusive ? v <= t : v < t,
      },
      {
        threshold: slippageConfig.lower_suggested_slippage_threshold,
        severity: HelpTextSeverity.Warning,
        compare: (v: number, t: number, inclusive: boolean) =>
          inclusive ? v <= t : v < t,
      },
      {
        threshold: slippageConfig.upper_allowed_slippage_threshold,
        severity: HelpTextSeverity.Danger,
        compare: (v: number, t: number, inclusive: boolean) =>
          hasAttemptedToExceedMax || (inclusive ? v >= t : v > t),
      },
      {
        threshold: slippageConfig.upper_suggested_slippage_threshold,
        severity: HelpTextSeverity.Warning,
        compare: (v: number, t: number, inclusive: boolean) =>
          inclusive ? v >= t : v > t,
      },
    ] as const;

    for (const { threshold, severity, compare } of thresholds) {
      if (threshold && compare(value, threshold.value, threshold.inclusive)) {
        return {
          severity,
          showIcon: true,
          message: strings(threshold.messageId, { value: threshold.value }),
        };
      }
    }
  }, [inputAmount, slippageConfig, hasAttemptedToExceedMax]);
