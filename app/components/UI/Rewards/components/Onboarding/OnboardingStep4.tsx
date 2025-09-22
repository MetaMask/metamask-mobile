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
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStepComponent from './OnboardingStep';
import { selectRewardsActiveAccountHasOptedIn } from '../../../../../selectors/rewards';
import {
  REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL,
  REWARDS_ONBOARD_TERMS_URL,
} from './constants';

const OnboardingStep4: React.FC = () => {
  const tw = useTailwind();
  const hasAccountedOptedIn = useSelector(selectRewardsActiveAccountHasOptedIn);
  const { optin, optinError, optinLoading } = useOptin();
  const {
    referralCode,
    setReferralCode: handleReferralCodeChange,
    isValidating: isValidatingReferralCode,
    isValid: referralCodeIsValid,
  } = useValidateReferralCode();

  const handleNext = useCallback(() => {
    optin({ referralCode });
  }, [optin, referralCode]);

  const renderStepInfo = () => (
    <Box twClassName="flex-1" alignItems={BoxAlignItems.Center}>
      {/* Opt in error message */}
      <Box alignItems={BoxAlignItems.Center} twClassName="min-h-20">
        {optinError && (
          <BannerAlert
            severity={BannerAlertSeverity.Error}
            description={optinError}
          />
        )}
      </Box>

      {/* Placeholder Image */}
      <Box twClassName="w-30 h-30 my-4">
        <Image
          source={step4Img}
          testID="step-4-image"
          style={tw.style('w-full h-full')}
        />
      </Box>

      {/* Referral Code Input Section */}
      <Box twClassName="w-full min-h-32 gap-20 mb-2">
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
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
              onChangeText={handleReferralCodeChange}
              isDisabled={optinLoading}
              size={TextFieldSize.Lg}
              style={tw.style(
                'bg-background-pressed',
                !!referralCode &&
                  !referralCodeIsValid &&
                  !isValidatingReferralCode
                  ? 'border-error-default'
                  : 'border-muted',
              )}
              endAccessory={
                isValidatingReferralCode ? (
                  <ActivityIndicator />
                ) : referralCodeIsValid ? (
                  <Icon
                    name={IconName.Confirmation}
                    size={IconSize.Lg}
                    color={IconColor.SuccessDefault}
                  />
                ) : referralCode ? (
                  <Icon
                    name={IconName.Error}
                    size={IconSize.Lg}
                    color={IconColor.ErrorDefault}
                  />
                ) : (
                  <></>
                )
              }
              isError={!referralCodeIsValid}
            />
            {!!referralCode &&
              !referralCodeIsValid &&
              !isValidatingReferralCode && (
                <Text twClassName="text-error-default">
                  {strings('rewards.onboarding.step4_referral_input_error')}
                </Text>
              )}
          </Box>
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
      <Box twClassName="w-full flex-row px-4 mt-4">
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

  return (
    <OnboardingStepComponent
      currentStep={4}
      onNext={handleNext}
      onNextLoading={optinLoading || isValidatingReferralCode}
      onNextLoadingText={
        optinLoading
          ? strings('rewards.onboarding.step4_confirm_loading')
          : isValidatingReferralCode
          ? strings('rewards.onboarding.step4_title_referral_validating')
          : ''
      }
      onNextDisabled={
        (!referralCodeIsValid && !!referralCode) || hasAccountedOptedIn === true
      }
      nextButtonText={strings('rewards.onboarding.step4_confirm')}
      renderStepInfo={renderStepInfo}
      nextButtonAlternative={renderLegalDisclaimer}
      disableSwipe
    />
  );
};

export default OnboardingStep4;
