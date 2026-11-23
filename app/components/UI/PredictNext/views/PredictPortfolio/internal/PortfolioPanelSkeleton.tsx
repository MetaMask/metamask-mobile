import React from 'react';
import { Box, Skeleton } from '@metamask/design-system-react-native';

const SKELETON_ROW_COUNT = 3;

/** Placeholder rows shown while a Portfolio panel loads its first page. */
export const PortfolioPanelSkeleton = ({ testID }: { testID: string }) => (
  <Box testID={testID} twClassName="py-2">
    {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
      <Box key={index} twClassName="flex-row items-center py-2">
        <Skeleton height={40} width={40} />
        <Box twClassName="ml-3 flex-1 gap-2">
          <Skeleton height={16} width="70%" />
          <Skeleton height={12} width="45%" />
        </Box>
        <Skeleton height={16} width={60} />
      </Box>
    ))}
  </Box>
);
