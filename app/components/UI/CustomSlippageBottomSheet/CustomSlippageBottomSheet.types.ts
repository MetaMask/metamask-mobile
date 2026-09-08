import type { InputStepperDescription } from '../../../component-library/components-temp/InputStepper';

export interface CustomSlippageBottomSheetProps {
  isVisible?: boolean;
  goBack?: () => void;
  onClose: () => void;
  title: string;
  primaryButtonLabel: string;
  secondaryButtonLabel: string;
  value: string;
  onValueChange: (value: string) => void;
  minAmount: number;
  maxAmount: number;
  step: number;
  inputMaxDecimals: number;
  keypadCurrency?: string;
  keypadDecimals?: number;
  description?: InputStepperDescription;
  isConfirmDisabled?: boolean;
  onAttemptExceedMaxChange?: (exceeded: boolean) => void;
  onConfirm: (value: string) => void;
  normalizeValue?: (pct: number) => string;
  testID?: string;
  closeButtonTestID?: string;
  primaryButtonTestID?: string;
  secondaryButtonTestID?: string;
  keypadTestID?: string;
}
