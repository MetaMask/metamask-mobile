import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { RiveOnboardingStepperTestIds } from './RiveOnboardingStepper.testIds';

const FADE_IN_DURATION = 800;

interface StepperContentProps {
  title: string;
  titleTextColor: TextColor;
  body: string;
  bodyTextColor: TextColor;
  onClose?: () => void;
  closeButtonIconColor?: IconColor;
}

const StepperContent = ({
  title,
  titleTextColor,
  body,
  bodyTextColor,
  onClose,
  closeButtonIconColor,
}: StepperContentProps) => {
  // Using useSharedValue + useAnimatedStyle instead of Reanimated's `entering`
  // prop to avoid a first-paint bug where entering animations can temporarily
  // position the component at (0,0), causing it to render above the progress bar.
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: FADE_IN_DURATION });
    // Reset on unmount so the next step starts from invisible when remounted via `key`.
    return () => {
      opacity.value = 0;
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={animatedStyle}>
      {onClose && (
        <Box alignItems={BoxAlignItems.End}>
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Lg}
            iconProps={
              closeButtonIconColor ? { color: closeButtonIconColor } : undefined
            }
            onPress={onClose}
            testID={RiveOnboardingStepperTestIds.CLOSE_BUTTON}
          />
        </Box>
      )}

      <Text
        variant={TextVariant.HeadingLg}
        twClassName="text-center mb-1"
        color={titleTextColor}
        numberOfLines={1}
        testID={RiveOnboardingStepperTestIds.TITLE}
      >
        {title}
      </Text>

      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-center"
        color={bodyTextColor}
        numberOfLines={2}
        testID={RiveOnboardingStepperTestIds.BODY}
      >
        {body}
      </Text>
    </Animated.View>
  );
};

export default StepperContent;
