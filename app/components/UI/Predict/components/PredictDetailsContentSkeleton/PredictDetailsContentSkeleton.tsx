import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

interface PredictDetailsContentSkeletonProps {
  testID?: string;
}

const PredictDetailsContentSkeleton: React.FC<
  PredictDetailsContentSkeletonProps
> = ({ testID = 'predict-details-content-skeleton' }) => {
  const tw = useTailwind();

  return (
    <Box twClassName="gap-6 my-8">
      <Box twClassName="gap-3">
        <Skeleton
          width="40%"
          height={16}
          style={tw.style('rounded-md')}
          testID={`${testID}-line-1`}
        />
        <Skeleton
          width="100%"
          height={120}
          style={tw.style('rounded-xl')}
          testID={`${testID}-block-1`}
        />
      </Box>

      <Box twClassName="gap-3">
        <Skeleton
          width="30%"
          height={16}
          style={tw.style('rounded-md')}
          testID={`${testID}-line-2`}
        />
        <Skeleton
          width="100%"
          height={80}
          style={tw.style('rounded-xl')}
          testID={`${testID}-block-2`}
        />
      </Box>
    </Box>
  );
};

export default PredictDetailsContentSkeleton;
