import React, { ReactNode, useCallback, useRef } from 'react';
import { View, PanResponder } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Text,
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
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { setOnboardingActiveStep } from '../../../../../reducers/rewards';
import Routes from '../../../../../constants/navigation/Routes';
import { OnboardingStep } from '../../../../../reducers/rewards/types';

interface OnboardingStepProps {
  // Progress indicator props
  currentStep: number;

  // Navigation handlers
  onNext: () => void;
  onPrevious?: () => void;
  onNextLoading?: boolean;
  onNextLoadingText?: string;
  onNextDisabled?: boolean;
  onClose?: () => void;
  onSkip?: () => void;

  // Button props
  nextButtonText?: string;
  nextButtonAlternative?: () => ReactNode;

  // Render props for customizable content
  renderStepImage?: () => ReactNode;
  renderStepInfo: () => ReactNode;
  stepInfoContainerStyle?: string;

  // Gesture control
  disableSwipe?: boolean;
}

const OnboardingStepComponent: React.FC<OnboardingStepProps> = ({
  currentStep,
  onNext,
  onPrevious,
  onSkip,
  onNextLoading,
  onNextLoadingText,
  onNextDisabled,
  nextButtonText,
  nextButtonAlternative,
  renderStepImage,
  renderStepInfo,
  stepInfoContainerStyle,
  disableSwipe = false,
}) => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const onClose = useCallback(() => {
    dispatch(setOnboardingActiveStep(OnboardingStep.INTRO));
    navigation.navigate(Routes.WALLET_VIEW);
  }, [dispatch, navigation]);

  // Create PanResponder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disableSwipe,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        // Only respond to horizontal movements
        !disableSwipe && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        if (disableSwipe) return;

        const { dx } = gestureState;
        const swipeThreshold = 50; // Minimum distance to trigger swipe

        // Right swipe (previous)
        if (dx > swipeThreshold && onPrevious) {
          onPrevious();
        }
        // Left swipe (next)
        else if (dx < -swipeThreshold && !onNextDisabled && !onNextLoading) {
          onNext();
        }
      },
    }),
  ).current;

  return (
    <View
      style={tw.style('flex-1 min-h-full px-4 py-8')}
      testID="onboarding-step-container"
      {...panResponder.panHandlers}
    >
      <Box twClassName="mt-8 justify-center items-center">
        <Box twClassName="absolute right-1 z-10">
          <ButtonIcon
            size={ButtonIconSize.Lg}
            iconName={IconName.Close}
            onPress={onClose}
            testID="close-button"
          />
        </Box>

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
          twClassName={`flex-1 flex-col justify-between ${stepInfoContainerStyle}`}
        >
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

            {onSkip && (
              <Button
                variant={ButtonVariant.Tertiary}
                size={ButtonSize.Lg}
                onPress={onSkip}
                twClassName="w-full bg-gray-500 border-gray-500"
              >
                <Text twClassName="text-text-default">
                  {strings('rewards.onboarding.step_skip')}
                </Text>
              </Button>
            )}

            {nextButtonAlternative?.()}
          </Box>
        </Box>
      </Box>
    </View>
  );
};

export default OnboardingStepComponent;
