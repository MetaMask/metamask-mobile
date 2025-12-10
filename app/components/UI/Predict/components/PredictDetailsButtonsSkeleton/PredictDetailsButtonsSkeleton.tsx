import React from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';

interface PredictDetailsButtonsSkeletonProps {
  testID?: string;
}

/**
 * Skeleton loader component for Predict market details action buttons
 * Displays loading placeholders for Yes/No action buttons
 */
const PredictDetailsButtonsSkeleton: React.FC<
  PredictDetailsButtonsSkeletonProps
> = ({ testID = 'predict-details-buttons-skeleton' }) => {
  const tw = useTailwind();

  return (
    <Box flexDirection={BoxFlexDirection.Row} twClassName="w-full gap-3 mt-4">
      {/* Buy Yes Button - Green tint */}
      <Box twClassName="flex-1">
        <Skeleton
          width="100%"
          height={48}
          style={tw.style('rounded-lg bg-success-muted')}
          testID={`${testID}-button-yes`}
        />
      </Box>

      {/* Buy No Button - Red tint */}
      <Box twClassName="flex-1">
        <Skeleton
          width="100%"
          height={48}
          style={tw.style('rounded-lg bg-error-muted')}
          testID={`${testID}-button-no`}
        />
      </Box>
    </Box>
  );
};

export default PredictDetailsButtonsSkeleton;
