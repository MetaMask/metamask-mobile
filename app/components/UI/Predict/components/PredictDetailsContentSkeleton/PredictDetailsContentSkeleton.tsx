import React from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

interface PredictDetailsContentSkeletonProps {
  testID?: string;
}

/**
 * Skeleton loader component for Predict market details content
 * Displays loading placeholders for outcome options
 */
const PredictDetailsContentSkeleton: React.FC<
  PredictDetailsContentSkeletonProps
> = ({ testID = 'predict-details-content-skeleton' }) => {
  const tw = useTailwind();

  return (
    <Box twClassName="gap-4 my-8">
      {/* Market Outcome Options */}
      <Skeleton
        width="25%"
        height={20}
        style={tw.style('rounded-full mb-2')}
        testID={`${testID}-option-1`}
      />

      {/* Show 2 outcome cards */}
      {[1, 2].map((index) => (
        <Box
          key={index}
          flexDirection={BoxFlexDirection.Row}
          twClassName="items-center gap-3 bg-muted rounded-lg p-4"
        >
          <Skeleton
            width={48}
            height={48}
            style={tw.style('rounded-lg')}
            testID={`${testID}-option-${index + 1}-avatar`}
          />
          <Box twClassName="flex-1 gap-2">
            <Skeleton
              width="100%"
              height={20}
              style={tw.style('rounded-md')}
              testID={`${testID}-option-${index + 1}-title`}
            />
            <Skeleton
              width="80%"
              height={20}
              style={tw.style('rounded-md')}
              testID={`${testID}-option-${index + 1}-subtitle`}
            />
          </Box>
          <Box twClassName="flex-1 gap-2 items-end">
            <Skeleton
              width="70%"
              height={20}
              style={tw.style('rounded-md')}
              testID={`${testID}-option-${index + 1}-value-1`}
            />
            <Skeleton
              width="50%"
              height={20}
              style={tw.style('rounded-md')}
              testID={`${testID}-option-${index + 1}-value-2`}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default PredictDetailsContentSkeleton;
