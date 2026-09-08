import {
  ButtonIconProps,
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';
import { type TextInputSelectionChangeEvent } from 'react-native';
import { InputProps } from '../../components/Form/TextField/foundation/Input/Input.types';
import { InputStepperDescriptionType } from './InputStepper.constants';

export interface InputStepperDescription {
  message: string;
  color: TextColor;
  type?: InputStepperDescriptionType;
  testID?: string;
  icon?: {
    name: IconName;
    size: IconSize;
    color: IconColor;
  };
}

export interface InputStepperProps {
  value: string;
  onIncrease: () => void;
  onDecrease: () => void;
  description?: InputStepperDescription;
  minAmount: number;
  maxAmount: number;
  postValue?: string;
  placeholder?: string;
  selection?: {
    start: number;
    end: number;
  };
  onSelectionChange?: (event: TextInputSelectionChangeEvent) => void;
  testID?: string;
  decreaseButtonProps?: Partial<ButtonIconProps>;
  increaseButtonProps?: Partial<ButtonIconProps>;
  inputProps?: Partial<InputProps>;
}
