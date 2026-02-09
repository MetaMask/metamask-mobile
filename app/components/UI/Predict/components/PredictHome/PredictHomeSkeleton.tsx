import React from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

const SKELETON_COUNT = 4;

interface PredictHomeSkeletonProps {
  testID?: string;
}

const PredictHomeSkeleton: React.FC<PredictHomeSkeletonProps> = ({
  testID = 'predict-home-skeleton',
}) => {
  const tw = useTailwind();

  return (
    <Box testID={testID}>
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <Box
          key={`skeleton-${index}`}
          flexDirection={BoxFlexDirection.Row}
          twClassName="items-start py-2 gap-4 w-full"
          testID={`${testID}-item-${index}`}
        >
          <Box twClassName="pt-1">
            <Skeleton width={40} height={40} style={tw.style('rounded-full')} />
          </Box>

          <Box twClassName="flex-1 gap-1">
            <Skeleton width="80%" height={20} style={tw.style('rounded-md')} />
            <Skeleton width="60%" height={16} style={tw.style('rounded-md')} />
          </Box>

          <Box twClassName="gap-1 items-end">
            <Skeleton width={70} height={20} style={tw.style('rounded-md')} />
            <Skeleton width={50} height={16} style={tw.style('rounded-md')} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default PredictHomeSkeleton;
