import { InputStepperDescriptionType } from './constants';

export interface InputStepperProps {
  value: string;
  onIncrease: () => void;
  onDecrease: () => void;
  description?: {
    type: InputStepperDescriptionType;
    message: string;
  };
  minAmount: number;
  maxAmount: number;
}
