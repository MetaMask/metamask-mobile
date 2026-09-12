import {
  ButtonIconProps,
  HelpTextSeverity,
} from '@metamask/design-system-react-native';

export interface InputStepperDescription {
  message: string;
  severity?: HelpTextSeverity;
  showIcon?: boolean;
  testID?: string;
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
  testID?: string;
  decreaseButtonProps?: Partial<ButtonIconProps>;
  increaseButtonProps?: Partial<ButtonIconProps>;
}
