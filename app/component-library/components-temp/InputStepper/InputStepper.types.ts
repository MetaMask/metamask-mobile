import {
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';
import {
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { InputStepperDescriptionType } from './InputStepper.constants';

export interface InputStepperDescription {
  message: string;
  color: TextColor;
  type?: InputStepperDescriptionType;
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
  onSelectionChange?: (
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => void;
  testID?: string;
}
