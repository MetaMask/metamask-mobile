import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import {
  PREDICT_DETAILS_HEADER_SKELETON,
  PREDICT_DETAILS_HEADER_SKELETON_TEST_IDS,
} from './PredictDetailsHeaderSkeleton.testIds';

interface PredictDetailsHeaderSkeletonProps {
  testID?: string;
}

const PredictDetailsHeaderSkeleton: React.FC<
  PredictDetailsHeaderSkeletonProps
> = ({ testID = PREDICT_DETAILS_HEADER_SKELETON }) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="pb-4"
      style={{ paddingTop: insets.top + 12 }}
    >
      <Pressable
        onPress={() => navigation.goBack()}
        testID={`${testID}${PREDICT_DETAILS_HEADER_SKELETON_TEST_IDS.BACK_BUTTON}`}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name={IconName.ArrowLeft} size={IconSize.Lg} />
      </Pressable>

      <Box twClassName="flex-1 mx-4">
        <Skeleton
          width="60%"
          height={20}
          style={tw.style('rounded-md self-center')}
          testID={`${testID}${PREDICT_DETAILS_HEADER_SKELETON_TEST_IDS.TITLE}`}
        />
      </Box>

      <Skeleton
        width={24}
        height={24}
        style={tw.style('rounded-md')}
        testID={`${testID}${PREDICT_DETAILS_HEADER_SKELETON_TEST_IDS.SHARE}`}
      />
    </Box>
  );
};

export default PredictDetailsHeaderSkeleton;
