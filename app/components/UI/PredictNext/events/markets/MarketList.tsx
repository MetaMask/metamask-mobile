import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { MarketListTestIds } from './MarketList.testIds';

export interface MarketListProps {
  children: React.ReactNode;
  testID?: string;
}

export const MarketList = ({
  children,
  testID = MarketListTestIds.ROOT,
}: MarketListProps) => (
  <Box testID={testID} twClassName="gap-[14px]">
    {children}
  </Box>
);
