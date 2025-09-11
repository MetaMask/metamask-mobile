import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import React from 'react';
import { WaysToEarn } from './WaysToEarn/WaysToEarn';

export const OverviewTab: React.FC = () => (
  <Box flexDirection={BoxFlexDirection.Column}>
    <WaysToEarn />
  </Box>
);
