import React from 'react';
import { Keyboard } from 'react-native';
import { storiesOf } from '@storybook/react-native';
import CustomInput from './CustomInput';
import { TICKER, MAX_VALUE } from './CustomInput.constants';

let maxOptionSelected = false;

const showMaxValue = () => {
  Keyboard.dismiss();
  maxOptionSelected = true;
};

storiesOf('Component Library / CustomInput', module).add('Default', () => (
  <CustomInput
    isMaxValue
    ticker={TICKER}
    showMaxValue={showMaxValue}
    maxAvailableValue={MAX_VALUE}
    maxOptionSelected={maxOptionSelected}
  />
));
