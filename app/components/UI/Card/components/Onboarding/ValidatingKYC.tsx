import React, { useEffect, useCallback } from 'react';
import { Image } from 'react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useUserRegistrationStatus from '../../hooks/useUserRegistrationStatus';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardScreens } from '../../util/metrics';
import MM_CARD_KYC_PENDING from '../../../../../images/mm-card-KYC-pending.png';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';

const ValidatingKYC = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useMetrics();

  const { verificationState, startPolling, stopPolling } =
    useUserRegistrationStatus();

  const handleClose = useCallback(() => {
    navigation.dispatch(StackActions.popToTop());
  }, [navigation]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.VALIDATING_KYC,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    startPolling();
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  useEffect(() => {
    if (verificationState === 'VERIFIED') {
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.COMPLETE }],
      });
    } else if (verificationState === 'REJECTED') {
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.ONBOARDING.KYC_FAILED }],
      });
    }
  }, [verificationState, navigation]);

  const renderFormFields = () => (
    <>
      <Box twClassName="flex flex-1 items-center justify-center">
        <Image
          source={MM_CARD_KYC_PENDING}
          resizeMode="contain"
          style={tw.style('w-full h-full')}
        />
      </Box>

      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-center text-text-alternative"
      >
        {strings('card.card_onboarding.validating_kyc.terms')}
      </Text>
    </>
  );

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Secondary}
      label={strings('card.card_onboarding.close_button')}
      size={ButtonSize.Lg}
      onPress={handleClose}
      width={ButtonWidthTypes.Full}
      testID="validating-kyc-close-button"
    />
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.validating_kyc.title')}
      description={strings('card.card_onboarding.validating_kyc.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default ValidatingKYC;
