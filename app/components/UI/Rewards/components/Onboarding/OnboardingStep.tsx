import React, { ReactNode } from 'react';
import {
  ImageBackground,
  ImageSourcePropType,
  PanResponder,
  View,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  ButtonIconSize,
  IconName,
  BoxAlignItems,
  BoxJustifyContent,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import ProgressIndicator from './ProgressIndicator';
import { strings } from '../../../../../../locales/i18n';

interface OnboardingStepProps {
  // Progress indicator props
  currentStep: number;

  // Navigation handlers
  onNext: () => void;
  onNextLoading?: boolean;
  onNextLoadingText?: string;
  onNextDisabled?: boolean;
  onPrevious?: () => void;

  // Button props
  nextButtonText?: string;
  nextButtonAlternative?: () => ReactNode;

  // Render props for customizable content
  renderStepImage?: () => ReactNode;
  renderStepInfo: () => ReactNode;

  // Container type customization
  backgroundImageSource?: ImageSourcePropType;

  // Gesture settings
  enableSwipeGestures?: boolean;
  swipeThreshold?: number;
}

const OnboardingStep: React.FC<OnboardingStepProps> = ({
  currentStep,
  onNext,
  onNextLoading,
  onNextLoadingText,
  onNextDisabled,
  onPrevious,
  nextButtonText,
  nextButtonAlternative,
  renderStepImage,
  renderStepInfo,
  backgroundImageSource,
  enableSwipeGestures = true,
  swipeThreshold = 50,
}) => {
  const tw = useTailwind();

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => enableSwipeGestures,
    onMoveShouldSetPanResponder: (_evt, gestureState) =>
      enableSwipeGestures &&
      Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
      Math.abs(gestureState.dx) > 20,
    onPanResponderMove: () => {
      // Optional: Add visual feedback during swipe
    },
    onPanResponderRelease: (_evt, gestureState) => {
      if (!enableSwipeGestures) return;

      const { dx, dy } = gestureState;

      // Check if it's a horizontal swipe (more horizontal than vertical)
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > swipeThreshold) {
        if (dx > 0 && onPrevious) {
          // Swipe right = go to previous step
          onPrevious();
        } else if (dx < 0) {
          // Swipe left = go to next step
          onNext();
        }
      }
    },
  });

  return (
    <View
      style={tw.style('flex-1')}
      {...panResponder.panHandlers}
      testID="onboarding-step-container"
    >
      <ImageBackground
        source={backgroundImageSource}
        style={tw.style('flex-1 px-4 py-10')}
        resizeMode="cover"
        testID="background-image"
      >
        <Box twClassName="mt-12 justify-center items-center">
          {onPrevious && (
            <Box twClassName="absolute left-1">
              <ButtonIcon
                size={ButtonIconSize.Lg}
                iconName={IconName.ArrowLeft}
                onPress={onPrevious}
                testID="previous-button"
              />
            </Box>
          )}

          <ProgressIndicator
            totalSteps={4}
            currentStep={currentStep}
            variant="bars"
          />
        </Box>

        <Box twClassName="flex-grow flex-col">
          {/* Only render image container if renderStepImage is provided */}
          {renderStepImage && (
            <Box
              twClassName="flex-grow-2 relative gap-2"
              justifyContent={BoxJustifyContent.Center}
              alignItems={BoxAlignItems.Center}
              flexDirection={BoxFlexDirection.Column}
            >
              {renderStepImage()}
            </Box>
          )}

          <Box twClassName="flex-1 flex-col gap-2 justify-between">
            <Box twClassName="flex-col gap-2">{renderStepInfo()}</Box>

            <Box twClassName="w-full flex-col gap-2">
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                onPress={onNext}
                twClassName="w-full"
                isLoading={onNextLoading}
                loadingText={onNextLoadingText}
                isDisabled={onNextDisabled || onNextLoading}
              >
                {nextButtonText || strings('rewards.onboarding.step_confirm')}
              </Button>

              {nextButtonAlternative?.()}
            </Box>
          </Box>
        </Box>
      </ImageBackground>
    </View>
  );
};

export default OnboardingStep;
