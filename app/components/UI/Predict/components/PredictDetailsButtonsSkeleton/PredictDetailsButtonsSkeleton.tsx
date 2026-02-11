import React from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

interface PredictDetailsButtonsSkeletonProps {
  testID?: string;
}

const PredictDetailsButtonsSkeleton: React.FC<
  PredictDetailsButtonsSkeletonProps
> = ({ testID = 'predict-details-buttons-skeleton' }) => {
  const tw = useTailwind();

  return (
    <Box flexDirection={BoxFlexDirection.Row} twClassName="w-full gap-3 mt-4">
      <Box twClassName="flex-1">
        <Skeleton
          width="100%"
          height={48}
          style={tw.style('rounded-xl')}
          testID={`${testID}-button-1`}
        />
      </Box>

      <Box twClassName="flex-1">
        <Skeleton
          width="100%"
          height={48}
          style={tw.style('rounded-xl')}
          testID={`${testID}-button-2`}
        />
      </Box>
    </Box>
  );
};

export default PredictDetailsButtonsSkeleton;
