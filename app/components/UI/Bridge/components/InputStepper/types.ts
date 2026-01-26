import {
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';
import { InputStepperDescriptionType } from './constants';

export interface InputStepperProps {
  value: string;
  onIncrease: () => void;
  onDecrease: () => void;
  description?: {
    type: InputStepperDescriptionType;
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
