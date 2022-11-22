// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';

// Internal dependencies.
import CustomInput from './CustomInput';
import { TICKER, MAX_VALUE, DEFAULT_VALUE } from './CustomInput.constants';

const getUpdatedValue = (value: string) => {
  // do something with the value
  /* eslint-disable no-console */
  console.log('value', value);
};

storiesOf('Component Library / CustomInput', module)
  .add('Default', () => (
    <CustomInput
      ticker={TICKER}
      getUpdatedValue={getUpdatedValue}
      maxAvailableValue={MAX_VALUE}
    />
  ))
  .add('With default value', () => (
    <CustomInput
      ticker={TICKER}
      getUpdatedValue={getUpdatedValue}
      maxAvailableValue={MAX_VALUE}
      defaultValue={DEFAULT_VALUE}
    />
  ));
