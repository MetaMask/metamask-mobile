/* eslint-disable no-console */
import React, { useState } from 'react';
import { EditAmountKeyboard } from './edit-amount-keyboard';

export default {
  title: 'Views / Confirmations / Components / Edit Amount Keyboard',
  component: EditAmountKeyboard,
};

const DefaultEditAmountKeyboardStory = () => {
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
    <EditAmountKeyboard
      value={value}
      onChange={handleChange}
      onPercentagePress={handlePercentagePress}
      onDonePress={handleDonePress}
    />
  );
};

export const Default = {
  render: DefaultEditAmountKeyboardStory,
};
