import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  IconName as DesignSystemIconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import ButtonIconGlass from '../../../../../component-library/components-temp/ButtonIconGlass';
import HeaderSubpageGlass from '../../../../../component-library/components-temp/HeaderSubpageGlass';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import {
  PREDICT_DETAILS_HEADER_SKELETON,
  PREDICT_DETAILS_HEADER_SKELETON_TEST_IDS,
} from './PredictDetailsHeaderSkeleton.testIds';

interface PredictDetailsHeaderSkeletonProps {
  testID?: string;
  isGlass?: boolean;
}

const PredictDetailsHeaderSkeleton: React.FC<
  PredictDetailsHeaderSkeletonProps
> = ({ testID = PREDICT_DETAILS_HEADER_SKELETON, isGlass = false }) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();

  if (isGlass) {
    // Mirrors the loaded glass header so nothing moves when the market arrives.
    return (
      <HeaderSubpageGlass
        isFloating={false}
        twClassName="min-h-14 h-auto bg-default justify-center"
        style={{ marginTop: insets.top }}
        startAccessory={
          <ButtonIconGlass
            isCapsule
            iconName={DesignSystemIconName.ArrowLeft}
            onPress={() => navigation.goBack()}
            accessibilityLabel={strings('predict.buttons.back')}
            testID={`${testID}${PREDICT_DETAILS_HEADER_SKELETON_TEST_IDS.BACK_BUTTON}`}
          />
        }
        avatar={
          <Skeleton width={40} height={40} style={tw.style('rounded-lg')} />
        }
        title={
          <Skeleton
            width="60%"
            height={20}
            style={tw.style('rounded-md')}
            testID={`${testID}${PREDICT_DETAILS_HEADER_SKELETON_TEST_IDS.TITLE}`}
          />
        }
        endAccessory={
          <Skeleton
            width={40}
            height={40}
            style={tw.style('rounded-full')}
            testID={`${testID}${PREDICT_DETAILS_HEADER_SKELETON_TEST_IDS.SHARE}`}
          />
        }
      />
    );
  }

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
