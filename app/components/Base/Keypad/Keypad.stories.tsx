/* eslint-disable react/display-name */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@metamask/design-system-react-native';
import Keypad from './index';

// Basic story component
const DefaultKeypadStory = () => {
  const [value, setValue] = useState('0');

  const handleChange = (changeData: any) => {
    setValue(changeData.value);
    console.log('Keypad value changed:', changeData.value);
  };

  return (
    <View>
      <View>
        <Text>Current Value: {value}</Text>
      </View>
      <Keypad currency="native" value={value} onChange={handleChange} />
    </View>
  );
};

// Storybook metadata
export default {
  title: 'Base Components / Keypad',
  component: Keypad,
};

// Export the story
export const Default = DefaultKeypadStory;
