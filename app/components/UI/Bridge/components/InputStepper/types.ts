import {
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';

export interface InputStepperProps {
  value: string;
  onIncrease: () => void;
  onDecrease: () => void;
  description?: {
    message: string;
    color: TextColor;
    icon?: {
      name: IconName;
      size: IconSize;
      color: IconColor;
    };
  };
  minAmount: number;
  maxAmount: number;
  postValue?: string;
  placeholder?: string;
}
