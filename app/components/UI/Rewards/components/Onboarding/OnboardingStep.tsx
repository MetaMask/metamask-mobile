import React, { ReactNode, useCallback, useMemo, useRef } from 'react';
import { PanResponder } from 'react-native';
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
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Device from '../../../../../util/device';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';

interface OnboardingStepProps {
  // Progress indicator props
  currentStep: number;
  showProgressIndicator?: boolean;

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

  // Gesture control
  disableSwipe?: boolean;
}

const OnboardingStepComponent: React.FC<OnboardingStepProps> = ({
  currentStep,
  showProgressIndicator = true,
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
  disableSwipe = false,
}) => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isLargeDevice = useMemo(() => Device.isLargeDevice(), []);

  const onClose = useCallback(() => {
    dispatch(setOnboardingActiveStep(OnboardingStep.INTRO));
    navigation.navigate(Routes.WALLET.HOME);
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
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      testID="onboarding-step-container"
      contentContainerStyle={tw.style(
        `min-h-full px-4 ${isLargeDevice ? 'py-8' : 'py-2'}`,
      )}
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

        {showProgressIndicator && (
          <ProgressIndicator
            totalSteps={4}
            currentStep={currentStep}
            variant="bars"
          />
        )}
      </Box>
      <Box twClassName="flex-col flex-1 justify-between items-center">
        {/* Only render image container if renderStepImage is provided */}
        <Box
          justifyContent={BoxJustifyContent.Center}
          alignItems={BoxAlignItems.Center}
          flexDirection={BoxFlexDirection.Column}
          twClassName="flex-1"
        >
          {renderStepImage?.()}
        </Box>

        <Box twClassName="gap-4 w-full flex justify-between">
          <Box twClassName="flex-col">{renderStepInfo()}</Box>

          <Box twClassName="w-full flex-col gap-2">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={onNext}
              twClassName="w-full"
              isLoading={onNextLoading}
              loadingText={onNextLoadingText}
              isDisabled={onNextDisabled || onNextLoading}
              testID={REWARDS_VIEW_SELECTORS.NEXT_BUTTON}
            >
              {nextButtonText || strings('rewards.onboarding.step_confirm')}
            </Button>

            {onSkip && (
              <Button
                variant={ButtonVariant.Tertiary}
                size={ButtonSize.Lg}
                onPress={onSkip}
                twClassName="w-full bg-gray-500 border-gray-500"
                testID={REWARDS_VIEW_SELECTORS.SKIP_BUTTON}
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
    </KeyboardAwareScrollView>
  );
};

export default OnboardingStepComponent;
