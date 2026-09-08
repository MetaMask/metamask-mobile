import React from 'react';
import {
  IconColor,
  IconName,
  IconSize,
  TextColor,
} from '@metamask/design-system-react-native';
import InputStepper from './InputStepper';
import { InputStepperDescriptionType } from './InputStepper.constants';

const InputStepperMeta = {
  title: 'Components Temp / InputStepper',
  component: InputStepper,
  args: {
    value: '2',
    minAmount: 0,
    maxAmount: 100,
    postValue: '%',
    placeholder: '0',
    onIncrease: () => undefined,
    onDecrease: () => undefined,
  },
};

export default InputStepperMeta;

export const Default = {};

export const WithDescription = {
  args: {
    description: {
      type: InputStepperDescriptionType.WARNING,
      message: 'High slippage may result in a worse price',
      color: TextColor.WarningDefault,
      icon: {
        name: IconName.Danger,
        size: IconSize.Lg,
        color: IconColor.WarningDefault,
      },
    },
  },
};

export const AtMinimum = {
  args: {
    value: '0',
    minAmount: 0,
  },
};

export const AtMaximum = {
  args: {
    value: '100',
    maxAmount: 100,
  },
};
