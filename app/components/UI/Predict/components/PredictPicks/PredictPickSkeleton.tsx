import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

interface PredictPickSkeletonProps {
  testID?: string;
}

const PredictPickSkeleton: React.FC<PredictPickSkeletonProps> = ({
  testID = 'predict-pick-skeleton',
}) => {
  const tw = useTailwind();

  return (
    <Box
      testID={testID}
      twClassName="flex-row justify-between items-center py-3 px-4"
    >
      <Box twClassName="gap-1">
        <Skeleton
          width={140}
          height={18}
          style={tw.style('rounded-md')}
          testID={`${testID}-title`}
        />
        <Skeleton
          width={60}
          height={16}
          style={tw.style('rounded-md')}
          testID={`${testID}-pnl`}
        />
      </Box>
      <Skeleton
        width={90}
        height={40}
        style={tw.style('rounded-lg')}
        testID={`${testID}-button`}
      />
    </Box>
  );
};

export default PredictPickSkeleton;
