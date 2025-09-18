/* eslint-disable no-console */
import React, { useState } from 'react';
import { DepositKeyboard } from './deposit-keyboard';

export default {
  title: 'Views / Confirmations / Components / Deposit Keyboard',
  component: DepositKeyboard,
};

const DefaultDepositKeyboardStory = () => {
  const [value, setValue] = useState('0');

  const handleChange = (newValue: string) => {
    setValue(newValue);
  };

  const handlePercentagePress = (percentage: number) => {
    console.log(`Percentage pressed: ${percentage}%`);
  };

  const handleDonePress = () => {
    console.log('Done pressed');
  };

  return (
    <DepositKeyboard
      value={value}
      onChange={handleChange}
      onPercentagePress={handlePercentagePress}
      onDonePress={handleDonePress}
      hasInput={false}
    />
  );
};

export const Default = {
  render: DefaultDepositKeyboardStory,
};
