import React from 'react';
import { Box, BoxBackgroundColor } from '@metamask/design-system-react-native';
import SearchingForDevice from './index';

const SearchingForDeviceMeta = {
  title: 'Views / Connect Hardware / Searching For Device',
  component: SearchingForDevice,
  decorators: [
    (Story: React.FC) => (
      <Box backgroundColor={BoxBackgroundColor.BackgroundDefault}>
        <Story />
      </Box>
    ),
  ],
};

export default SearchingForDeviceMeta;

export const Default = {};
