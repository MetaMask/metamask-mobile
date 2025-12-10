import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
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

interface PredictDetailsHeaderSkeletonProps {
  testID?: string;
}

/**
 * Skeleton loader component for Predict market details header
 * Displays loading placeholders for back button, avatar, and title
 */
const PredictDetailsHeaderSkeleton: React.FC<
  PredictDetailsHeaderSkeletonProps
> = ({ testID = 'predict-details-header-skeleton' }) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <Box twClassName="mb-6" style={{ paddingTop: insets.top + 12 }}>
      {/* Back Arrow + Avatar + Title Row */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-4 mb-4"
      >
        {/* Back Arrow - Pressable */}
        <Pressable
          onPress={() => navigation.goBack()}
          testID={`${testID}-back-button`}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name={IconName.ArrowLeft} size={IconSize.Lg} />
        </Pressable>

        {/* Circle Avatar Skeleton */}
        <Skeleton
          width={40}
          height={40}
          style={tw.style('rounded-full')}
          testID={`${testID}-avatar`}
        />

        {/* Title Skeleton */}
        <Box twClassName="flex-1">
          <Skeleton
            width="100%"
            height={20}
            style={tw.style('rounded-lg')}
            testID={`${testID}-title`}
          />
        </Box>
      </Box>

      {/* Subtitle Skeleton */}
      <Skeleton
        width="75%"
        height={20}
        style={tw.style('rounded-lg')}
        testID={`${testID}-subtitle`}
      />
    </Box>
  );
};

export default PredictDetailsHeaderSkeleton;
