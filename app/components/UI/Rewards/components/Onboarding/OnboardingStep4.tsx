import React, { useCallback } from 'react';
import {
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import { useRewardsAuth } from '../../hooks/useRewardsAuth';
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
import {
  OnboardingStep,
  setOnboardingActiveStep,
} from '../../../../../actions/rewards';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStepComponent from './OnboardingStep';
import { REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL } from './constants';

const OnboardingStep4: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { optin, optinError, optinLoading, hasAccountedOptedIn } =
    useRewardsAuth();
  const {
    referralCode,
    setReferralCode: handleReferralCodeChange,
    isValidating: isValidatingReferralCode,
    isValid: referralCodeIsValid,
  } = useValidateReferralCode();

  const handleNext = useCallback(() => {
    optin({ referralCode });
  }, [optin, referralCode]);

  const handlePrevious = useCallback(() => {
    // Reset onboarding state so we can jump from step 1 to 5 next time
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_3));
    navigation.navigate(Routes.REWARDS_ONBOARDING_3);
  }, [dispatch, navigation]);

  const renderStepInfo = () => (
    <Box twClassName="flex-grow mt-6" alignItems={BoxAlignItems.Center}>
      {/* Opt in error message */}
      <Box alignItems={BoxAlignItems.Center} twClassName="mt-4 min-h-20">
        {optinError && (
          <BannerAlert
            severity={BannerAlertSeverity.Error}
            description={optinError}
          />
        )}
      </Box>

      {hasAccountedOptedIn === true && (
        <Box alignItems={BoxAlignItems.Center} twClassName="mt-4 min-h-20">
          <BannerAlert
            severity={BannerAlertSeverity.Success}
            description={strings(
              'rewards.onboarding.step4_success_description',
            )}
          />
        </Box>
      )}

      {/* Placeholder Image */}
      <Box twClassName="w-30 h-30 mb-6">
        <Image
          source={step4Img}
          testID="step-4-image"
          style={tw.style('w-full h-full')}
        />
      </Box>

      {/* Referral Code Input Section */}
      <Box twClassName="w-full min-h-32 gap-20">
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
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderLegalDisclaimer = () => (
    <Box twClassName="w-full flex-row px-4 mt-2">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-center flex-wrap gap-2"
      >
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-alternative text-center"
        >
          {strings('rewards.onboarding.step4_legal_disclaimer')}
        </Text>

        <TouchableOpacity
          onPress={() => {
            Linking.openURL(REWARDS_ONBOARD_OPTIN_LEGAL_LEARN_MORE_URL);
          }}
          style={tw.style('flex-row items-center')}
          activeOpacity={0.7}
        >
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-primary-default inline"
          >
            {strings('rewards.onboarding.step4_legal_disclaimer_learn_more')}
          </Text>

          <Box twClassName="ml-1 inline">
            <Icon
              name={IconName.Export}
              size={IconSize.Sm}
              color={IconColor.PrimaryDefault}
            />
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );

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
      onPrevious={handlePrevious}
      nextButtonText={strings('rewards.onboarding.step4_confirm')}
      renderStepInfo={renderStepInfo}
      enableSwipeGestures={false}
      nextButtonAlternative={renderLegalDisclaimer}
    />
  );
};

export default OnboardingStep4;
