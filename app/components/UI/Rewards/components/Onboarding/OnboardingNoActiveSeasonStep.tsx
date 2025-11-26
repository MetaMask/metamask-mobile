import React, { useCallback } from 'react';
import { Image, Linking, useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useOptin } from '../../hooks/useOptIn';
import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import step1Img from '../../../../../images/rewards/rewards-onboarding-step1.png';
import Step1BgImg from '../../../../../images/rewards/rewards-onboarding-step1-bg.svg';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStepComponent from './OnboardingStep';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import RewardsErrorBanner from '../RewardsErrorBanner';
import {
  REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
  REWARDS_ONBOARD_TERMS_URL,
} from './constants';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';

export interface OnboardingNoActiveSeasonStepProps {
  canContinue: () => boolean;
}

/**
 * OnboardingNoActiveSeasonStep Component
 *
 * Displays a sign-up form when there is no active rewards season.
 * Allows users to sign up for rewards without referral code validation.
 */
const OnboardingNoActiveSeasonStep: React.FC<
  OnboardingNoActiveSeasonStepProps
> = ({ canContinue }) => {
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

  const renderLegalDisclaimer = () => {
    const openTermsOfUse = () => {
      Linking.openURL(REWARDS_ONBOARD_TERMS_URL);
    };

    const openLearnMore = () => {
      Linking.openURL(REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL);
    };

    return (
      <Box twClassName="w-full flex-row mt-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="justify-center flex-wrap gap-2"
        >
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-alternative text-center"
          >
            {strings('rewards.onboarding.no_active_season.legal_disclaimer_1')}{' '}
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-primary-default"
              onPress={openTermsOfUse}
            >
              {strings(
                'rewards.onboarding.no_active_season.legal_disclaimer_2',
              )}
            </Text>
            {strings('rewards.onboarding.no_active_season.legal_disclaimer_3')}{' '}
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-primary-default"
              onPress={openLearnMore}
            >
              {strings(
                'rewards.onboarding.no_active_season.legal_disclaimer_4',
              )}
            </Text>
            .{' '}
          </Text>
        </Box>
      </Box>
    );
  };

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

  const onNextLoadingText = optinLoading
    ? strings('rewards.onboarding.no_active_season.sign_up_loading')
    : '';

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
      onNextLoading={optinLoading}
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
