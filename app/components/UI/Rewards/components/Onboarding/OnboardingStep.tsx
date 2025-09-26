import React, { ReactNode } from 'react';
import { ImageBackground, ImageSourcePropType, View } from 'react-native';
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
  stepInfoContainerStyle?: string;

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
  stepInfoContainerStyle,
  backgroundImageSource,
}) => {
  const tw = useTailwind();

  return (
    <View style={tw.style('flex-1')} testID="onboarding-step-container">
      <ImageBackground
        source={backgroundImageSource}
        style={tw.style('flex-1 px-4 py-10')}
        resizeMode="cover"
        testID="background-image"
      >
        <Box twClassName="mt-8 justify-center items-center">
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

          <Box
            twClassName={`flex-1 flex-col gap-2 justify-between ${stepInfoContainerStyle}`}
          >
            <Box twClassName="flex-col gap-2">{renderStepInfo()}</Box>

            <Box twClassName="w-full flex-col gap-6">
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
