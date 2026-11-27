import React from 'react';
import { Box, Skeleton } from '@metamask/design-system-react-native';

const SKELETON_ROW_COUNT = 3;

/** Placeholder rows shown while a Portfolio panel loads its first page. */
export const PortfolioPanelSkeleton = ({ testID }: { testID: string }) => (
  <Box testID={testID} className="gap-3 py-4">
    {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
      <Box key={index} className="flex-row items-start gap-4 py-2">
        <Skeleton height={40} width={40} twClassName="rounded-full" />
        <Box className="flex-1 gap-2">
          <Skeleton height={18} width="100%" twClassName="rounded-md" />
          <Skeleton height={16} width="70%" twClassName="rounded-md" />
        </Box>
        <Box className="items-end gap-2">
          <Skeleton height={18} width={64} twClassName="rounded-md" />
          <Skeleton height={16} width={48} twClassName="rounded-md" />
        </Box>
      </Box>
    ))}
  </Box>
);
