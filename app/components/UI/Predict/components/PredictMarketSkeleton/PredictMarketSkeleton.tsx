import React from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

interface PredictMarketSkeletonProps {
  testID?: string;
}

/**
 * Skeleton loader component for Predict market cards
 * Displays a loading placeholder that matches the market card layout
 */
const PredictMarketSkeleton: React.FC<PredictMarketSkeletonProps> = ({
  testID = 'predict-market-skeleton',
}) => {
  const tw = useTailwind();

  return (
    <Box testID={testID} twClassName="bg-section rounded-xl p-4 my-2">
      {/* Header: Circle Avatar + Title Bar */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="items-center gap-4 mb-4"
      >
        {/* Circle Avatar - 40x40 */}
        <Skeleton
          width={40}
          height={40}
          style={tw.style('rounded-full')}
          testID={`${testID}-avatar`}
        />

        {/* Title Bar - takes remaining space */}
        <Box twClassName="flex-1">
          <Skeleton
            width="100%"
            height={20}
            style={tw.style('rounded-md')}
            testID={`${testID}-title`}
          />
        </Box>
      </Box>

      {/* Prediction Options Area */}
      <Skeleton
        width="100%"
        height={150}
        style={tw.style('rounded-xl mb-4')}
        testID={`${testID}-chart`}
      />

      {/* Bottom Info Bar - narrower width */}
      <Skeleton
        width="75%"
        height={40}
        style={tw.style('rounded-md')}
        testID={`${testID}-footer`}
      />
    </Box>
  );
};

export default PredictMarketSkeleton;
