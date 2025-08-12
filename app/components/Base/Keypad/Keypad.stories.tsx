import React, { useState } from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
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
    <Box twClassName="px-4">
      <Text variant={TextVariant.DisplayMd} twClassName="mb-4">
        Current Value: {value}
      </Text>
      <Keypad currency="native" value={value} onChange={handleChange} />
    </Box>
  );
};

export const Default = {
  render: DefaultKeypadStory,
};
