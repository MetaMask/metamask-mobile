import React, { useState } from 'react';
import { View } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import Keypad from './index';

export default {
  title: 'Base Components / Keypad',
  component: Keypad,
};

const DefaultKeypadStory = () => {
  const [value, setValue] = useState('0');

  const handleChange = (changeData: { value: string }) => {
    setValue(changeData.value);
  };

  return (
    <View>
      <View>
        <Text variant={TextVariant.DisplayMd}>Current Value: {value}</Text>
      </View>
      <Keypad currency="native" value={value} onChange={handleChange} />
    </View>
  );
};

export const Default = {
  render: DefaultKeypadStory,
};
