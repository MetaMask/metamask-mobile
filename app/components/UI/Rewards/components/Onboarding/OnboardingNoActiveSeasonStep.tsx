import React, { useCallback } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useOptin } from '../../hooks/useOptIn';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import step1Img from '../../../../../images/rewards/rewards-onboarding-step1.png';
import Step1BgImg from '../../../../../images/rewards/rewards-onboarding-step1-bg.svg';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStepComponent from './OnboardingStep';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import RewardsLegalDisclaimer from './RewardsLegalDisclaimer';

export interface OnboardingNoActiveSeasonStepProps {
  canContinue: () => boolean;
  geoLoading?: boolean;
}

/**
 * OnboardingNoActiveSeasonStep Component
 *
 * Displays a sign-up form when there is no active rewards season.
 * Allows users to sign up for rewards without referral code validation.
 */
const OnboardingNoActiveSeasonStep: React.FC<
  OnboardingNoActiveSeasonStepProps
> = ({ canContinue, geoLoading = false }) => {
  const tw = useTailwind();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { optin, optinError, optinLoading } = useOptin();

  const handleNext = useCallback(() => {
    if (!canContinue()) {
      return;
    }

    optin({});
  }, [optin, canContinue]);

  const renderStepInfo = () => (
    <Box twClassName="flex-col gap-2 min-h-40">
      {/* Opt in error message */}
      {optinError && (
        <RewardsErrorBanner
          title={strings('rewards.optin_error.title')}
          description={strings('rewards.optin_error.description')}
        />
      )}

      {/* Title and Description */}
      <Box twClassName="w-full gap-4">
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
          {strings('rewards.onboarding.no_active_season.title')}
        </Text>

        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-center text-alternative"
        >
          {strings('rewards.onboarding.no_active_season.description')}
        </Text>
      </Box>
    </Box>
  );

  const renderLegalDisclaimer = () => (
    <RewardsLegalDisclaimer
      disclaimerPart1={strings(
        'rewards.onboarding.no_active_season.legal_disclaimer_1',
      )}
      disclaimerPart2={strings(
        'rewards.onboarding.no_active_season.legal_disclaimer_2',
      )}
      disclaimerPart3={strings(
        'rewards.onboarding.no_active_season.legal_disclaimer_3',
      )}
      disclaimerPart4={strings(
        'rewards.onboarding.no_active_season.legal_disclaimer_4',
      )}
    />
  );

  const renderStepImage = () => (
    <>
      <Step1BgImg
        name="rewards-onboarding-step1-bg"
        fill={colors.background.muted}
        style={tw.style('absolute')}
        width={screenWidth}
        height={screenHeight}
      />

      <Image
        source={step1Img}
        style={tw.style('h-[75%] z-10')}
        testID="step-1-image"
        resizeMode="contain"
      />
    </>
  );

  const isLoading = optinLoading || geoLoading;
  let onNextLoadingText = '';
  if (isLoading) {
    if (optinLoading) {
      onNextLoadingText = strings(
        'rewards.onboarding.no_active_season.sign_up_loading',
      );
    } else {
      onNextLoadingText = strings(
        'rewards.onboarding.intro_confirm_geo_loading',
      );
    }
  }

  const onNextDisabled = !!subscriptionId;

  /**
   * Auto-redirect to dashboard if user is already opted in
   */
  useFocusEffect(
    useCallback(() => {
      if (subscriptionId) {
        navigation.navigate(Routes.REWARDS_DASHBOARD);
      }
    }, [subscriptionId, navigation]),
  );

  return (
    <OnboardingStepComponent
      currentStep={4}
      onNext={handleNext}
      onNextLoading={isLoading}
      onNextLoadingText={onNextLoadingText}
      onNextDisabled={onNextDisabled}
      nextButtonText={strings('rewards.onboarding.no_active_season.sign_up')}
      renderStepImage={renderStepImage}
      renderStepInfo={renderStepInfo}
      nextButtonAlternative={renderLegalDisclaimer}
      disableSwipe
      showProgressIndicator={false}
    />
  );
};

export default OnboardingNoActiveSeasonStep;
