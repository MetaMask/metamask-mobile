import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import {
  PREDICT_DETAILS_CONTENT_SKELETON,
  PREDICT_DETAILS_CONTENT_SKELETON_TEST_IDS,
} from './PredictDetailsContentSkeleton.testIds';

interface PredictDetailsContentSkeletonProps {
  testID?: string;
}

const PredictDetailsContentSkeleton: React.FC<
  PredictDetailsContentSkeletonProps
> = ({ testID = PREDICT_DETAILS_CONTENT_SKELETON }) => {
  const tw = useTailwind();

  return (
    <Box twClassName="gap-6 my-8">
      <Box twClassName="gap-3">
        <Skeleton
          width="40%"
          height={16}
          style={tw.style('rounded-md')}
          testID={`${testID}${PREDICT_DETAILS_CONTENT_SKELETON_TEST_IDS.LINE_1}`}
        />
        <Skeleton
          width="100%"
          height={120}
          style={tw.style('rounded-xl')}
          testID={`${testID}${PREDICT_DETAILS_CONTENT_SKELETON_TEST_IDS.BLOCK_1}`}
        />
      </Box>

      <Box twClassName="gap-3">
        <Skeleton
          width="30%"
          height={16}
          style={tw.style('rounded-md')}
          testID={`${testID}${PREDICT_DETAILS_CONTENT_SKELETON_TEST_IDS.LINE_2}`}
        />
        <Skeleton
          width="100%"
          height={80}
          style={tw.style('rounded-xl')}
          testID={`${testID}${PREDICT_DETAILS_CONTENT_SKELETON_TEST_IDS.BLOCK_2}`}
        />
      </Box>
    </Box>
  );
};

export default PredictDetailsContentSkeleton;
