import { BridgeSlippageConfig } from '../../types';

interface Props {
  inputAmount: string;
  slippageConfig: BridgeSlippageConfig['__default__'];
}

export const useShouldDisableCustomSlippageConfirm = ({
  inputAmount,
  slippageConfig,
}: Props) => {
  const value = parseFloat(inputAmount);

  const violatesThreshold = (
    threshold: { value: number; inclusive: boolean } | null,
    compare: (v: number, t: number) => boolean,
  ): boolean => {
    if (!threshold) return false;
    return threshold.inclusive
      ? compare(value, threshold.value) || value === threshold.value
      : compare(value, threshold.value);
  };

  return (
    value > slippageConfig.max_amount ||
    value < slippageConfig.min_amount ||
    violatesThreshold(
      slippageConfig.upper_allowed_slippage_threshold,
      (v, t) => v > t,
    ) ||
    violatesThreshold(
      slippageConfig.lower_allowed_slippage_threshold,
      (v, t) => v < t,
    )
  );
};
