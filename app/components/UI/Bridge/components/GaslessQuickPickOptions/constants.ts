import { InputAmountPreset } from '@metamask/bridge-controller';

export const PERCENTAGE_TO_PRESET = {
  25: InputAmountPreset.PERCENT_25,
  50: InputAmountPreset.PERCENT_50,
  75: InputAmountPreset.PERCENT_75,
  90: InputAmountPreset.PERCENT_90,
} as const;
