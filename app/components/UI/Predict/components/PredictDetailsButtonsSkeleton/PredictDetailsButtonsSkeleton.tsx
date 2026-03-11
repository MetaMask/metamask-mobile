import React from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import {
  PREDICT_DETAILS_BUTTONS_SKELETON,
  PREDICT_DETAILS_BUTTONS_SKELETON_TEST_IDS,
} from './PredictDetailsButtonsSkeleton.testIds';

interface PredictDetailsButtonsSkeletonProps {
  testID?: string;
}

const PredictDetailsButtonsSkeleton: React.FC<
  PredictDetailsButtonsSkeletonProps
> = ({ testID = PREDICT_DETAILS_BUTTONS_SKELETON }) => {
  const tw = useTailwind();

  return (
    <Box flexDirection={BoxFlexDirection.Row} twClassName="w-full gap-3 mt-4">
      <Box twClassName="flex-1">
        <Skeleton
          width="100%"
          height={48}
          style={tw.style('rounded-xl')}
          testID={`${testID}${PREDICT_DETAILS_BUTTONS_SKELETON_TEST_IDS.BUTTON_1}`}
        />
      </Box>

      <Box twClassName="flex-1">
        <Skeleton
          width="100%"
          height={48}
          style={tw.style('rounded-xl')}
          testID={`${testID}${PREDICT_DETAILS_BUTTONS_SKELETON_TEST_IDS.BUTTON_2}`}
        />
      </Box>
    </Box>
  );
};

export default PredictDetailsButtonsSkeleton;
