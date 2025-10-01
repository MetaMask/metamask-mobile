import React, { useCallback } from 'react';
import { Image, ActivityIndicator, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useOptin } from '../../hooks/useOptIn';
import { useValidateReferralCode } from '../../hooks/useValidateReferralCode';
import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxFlexDirection,
  IconSize,
  Icon,
  IconName,
  IconColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import step4Img from '../../../../../images/rewards/rewards-onboarding-step4.png';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
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
import { useParams } from '../../../../../util/navigation/navUtils';

const OnboardingStep4: React.FC = () => {
  const tw = useTailwind();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const navigation = useNavigation();
  const { optin, optinError, optinLoading } = useOptin();
  const urlParams = useParams<{ isFromDeeplink: boolean; referral?: string }>();
  const {
    referralCode,
    setReferralCode: handleReferralCodeChange,
    isValidating: isValidatingReferralCode,
    isValid: referralCodeIsValid,
    isUnknownError: isUnknownErrorReferralCode,
  } = useValidateReferralCode(
    urlParams?.isFromDeeplink && urlParams?.referral
      ? urlParams.referral.trim().toUpperCase()
      : undefined,
  );

  const handleNext = useCallback(() => {
    optin({ referralCode });
  }, [optin, referralCode]);

  const renderIcon = () => {
    if (isValidatingReferralCode) {
      return <ActivityIndicator />;
    }

    if (referralCodeIsValid) {
      return (
        <Icon
          name={IconName.Confirmation}
          size={IconSize.Lg}
          color={IconColor.SuccessDefault}
        />
      );
    }

    if (referralCode.length >= 6) {
      return (
        <Icon
          name={IconName.Error}
          size={IconSize.Lg}
          color={IconColor.ErrorDefault}
        />
      );
    }

    return null;
  };

  const renderStepInfo = () => (
    <Box alignItems={BoxAlignItems.Center} twClassName="min-h-[70%]">
      {/* Opt in error message */}

      {optinError && (
        <RewardsErrorBanner
          title={strings('rewards.optin_error.title')}
          description={strings('rewards.optin_error.description')}
        />
      )}

      {/* Placeholder Image */}
      <Box twClassName="my-4">
        <Image
          source={step4Img}
          testID="step-4-image"
          style={tw.style('w-30 h-30')}
        />
      </Box>

      {/* Referral Code Input Section */}
      <Box twClassName="w-full gap-4">
        <Text
          variant={TextVariant.HeadingLg}
          twClassName="text-center mb-[20%]"
        >
          {referralCodeIsValid
            ? strings('rewards.onboarding.step4_title_referral_bonus')
            : strings('rewards.onboarding.step4_title')}
        </Text>

        <Box twClassName="gap-4">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            twClassName="text-center"
          >
            {strings('rewards.onboarding.step4_referral_bonus_description')}
          </Text>

          <Box twClassName="relative">
            <TextField
              placeholder={strings(
                'rewards.onboarding.step4_referral_input_placeholder',
              )}
              value={referralCode}
              autoCapitalize="characters"
              onChangeText={handleReferralCodeChange}
              isDisabled={optinLoading}
              size={TextFieldSize.Lg}
              style={tw.style(
                'bg-background-pressed',
                referralCode.length >= 6 &&
                  !referralCodeIsValid &&
                  !isValidatingReferralCode &&
                  !isUnknownErrorReferralCode
                  ? 'border-error-default'
                  : 'border-muted',
              )}
              endAccessory={renderIcon()}
              isError={!referralCodeIsValid}
            />
            {referralCode.length >= 6 &&
              !referralCodeIsValid &&
              !isValidatingReferralCode &&
              !isUnknownErrorReferralCode && (
                <Text twClassName="text-error-default">
                  {strings('rewards.onboarding.step4_referral_input_error')}
                </Text>
              )}
          </Box>

          {isUnknownErrorReferralCode && (
            <RewardsErrorBanner
              title={strings('rewards.referral_validation_unknown_error.title')}
              description={strings(
                'rewards.referral_validation_unknown_error.description',
              )}
            />
          )}
        </Box>
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
            {strings('rewards.onboarding.step4_legal_disclaimer_1')}{' '}
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-primary-default"
              onPress={openTermsOfUse}
            >
              {strings('rewards.onboarding.step4_legal_disclaimer_2')}
            </Text>
            {strings('rewards.onboarding.step4_legal_disclaimer_3')}{' '}
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-primary-default"
              onPress={openLearnMore}
            >
              {strings('rewards.onboarding.step4_legal_disclaimer_4')}
            </Text>
            .{' '}
          </Text>
        </Box>
      </Box>
    );
  };

  let onNextLoadingText = '';
  if (optinLoading) {
    onNextLoadingText = strings('rewards.onboarding.step4_confirm_loading');
  } else if (isValidatingReferralCode) {
    onNextLoadingText = strings(
      'rewards.onboarding.step4_title_referral_validating',
    );
  }

  const onNextDisabled =
    (!referralCodeIsValid && !!referralCode) ||
    !!subscriptionId ||
    isUnknownErrorReferralCode;

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
      onNextLoading={optinLoading || isValidatingReferralCode}
      onNextLoadingText={onNextLoadingText}
      onNextDisabled={onNextDisabled}
      nextButtonText={strings('rewards.onboarding.step4_confirm')}
      renderStepInfo={renderStepInfo}
      nextButtonAlternative={renderLegalDisclaimer}
      disableSwipe
    />
  );
};

export default OnboardingStep4;
