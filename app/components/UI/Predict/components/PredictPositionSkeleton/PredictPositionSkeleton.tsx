import React from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

interface PredictPositionSkeletonProps {
  testID?: string;
}

/**
 * Skeleton loader component for Predict positions
 * Mimics the structure of PredictPosition and PredictPositionResolved components
 */
const PredictPositionSkeleton: React.FC<PredictPositionSkeletonProps> = ({
  testID = 'predict-position-skeleton',
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="items-start py-2 gap-4 w-full"
      testID={testID}
    >
      {/* Left: Avatar/Image */}
      <Box twClassName="pt-1">
        <Skeleton
          width={40}
          height={40}
          style={tw.style('rounded-full')}
          testID={`${testID}-image`}
        />
      </Box>

      {/* Middle: Title and subtitle */}
      <Box twClassName="flex-1 gap-1">
        <Skeleton
          width="80%"
          height={20}
          style={tw.style('rounded-md')}
          testID={`${testID}-title`}
        />
        <Skeleton
          width="60%"
          height={16}
          style={tw.style('rounded-md')}
          testID={`${testID}-subtitle`}
        />
      </Box>

      {/* Right: Value and P&L */}
      <Box twClassName="gap-1 items-end">
        <Skeleton
          width={70}
          height={20}
          style={tw.style('rounded-md')}
          testID={`${testID}-value`}
        />
        <Skeleton
          width={50}
          height={16}
          style={tw.style('rounded-md')}
          testID={`${testID}-pnl`}
        />
      </Box>
    </Box>
  );
};

export default PredictPositionSkeleton;
