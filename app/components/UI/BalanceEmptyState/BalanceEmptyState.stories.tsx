import React from 'react';

import BalanceEmptyState from './BalanceEmptyState';
import { Box, BoxBackgroundColor } from '@metamask/design-system-react-native';

const BalanceEmptyStateMeta = {
  title: 'Components / UI / BalanceEmptyState',
  component: BalanceEmptyState,
  decorators: [
    (Story: React.FC) => (
      <Box backgroundColor={BoxBackgroundColor.BackgroundDefault} padding={4}>
        <Story />
      </Box>
    ),
  ],
};

export default BalanceEmptyStateMeta;

export const Default = {};
