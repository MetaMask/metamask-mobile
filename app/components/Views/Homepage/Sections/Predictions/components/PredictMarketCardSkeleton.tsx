import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import Skeleton from '../../../../../../component-library/components/Skeleton/Skeleton';

/**
 * Skeleton loader for PredictMarketCard.
 * Matches the compact card layout for smooth loading transitions.
 */
const PredictMarketCardSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="w-[280px] rounded-2xl bg-background-muted"
      padding={4}
      gap={3}
    >
      {/* Header skeleton */}
      <Box gap={1}>
        <Skeleton width="80%" height={20} style={tw.style('rounded')} />
        <Skeleton width="40%" height={16} style={tw.style('rounded')} />
      </Box>

      {/* Outcome rows skeleton */}
      <Box gap={2}>
        {/* Outcome 1 */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
        >
          <Skeleton width={32} height={32} style={tw.style('rounded-lg')} />
          <Box twClassName="flex-1">
            <Skeleton width="60%" height={16} style={tw.style('rounded')} />
          </Box>
          <Skeleton width={48} height={32} style={tw.style('rounded-lg')} />
        </Box>

        {/* Outcome 2 */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
        >
          <Skeleton width={32} height={32} style={tw.style('rounded-lg')} />
          <Box twClassName="flex-1">
            <Skeleton width="50%" height={16} style={tw.style('rounded')} />
          </Box>
          <Skeleton width={48} height={32} style={tw.style('rounded-lg')} />
        </Box>
      </Box>
    </Box>
  );
};

export default PredictMarketCardSkeleton;
