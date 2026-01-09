import React, { useCallback, useEffect } from 'react';
import { Image } from 'react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardScreens } from '../../util/metrics';
import MM_CARD_ONBOARDING_FAILED from '../../../../../images/mm-card-onboarding-failed.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';

const KYCFailed = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useMetrics();

  useEffect(() => {
    dispatch(resetOnboardingState());
  }, [dispatch]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.KYC_FAILED,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleClose = useCallback(() => {
    navigation.dispatch(StackActions.popToTop());
  }, [navigation]);

  const renderFormFields = () => (
    <Box twClassName="flex flex-1 items-center justify-center">
      <Image
        source={MM_CARD_ONBOARDING_FAILED}
        resizeMode="contain"
        style={tw.style('w-full h-full')}
      />
    </Box>
  );

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.kyc_failed.close_button')}
      size={ButtonSize.Lg}
      onPress={handleClose}
      width={ButtonWidthTypes.Full}
      testID="kyc-failed-close-button"
    />
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.kyc_failed.title')}
      description={strings('card.card_onboarding.kyc_failed.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default KYCFailed;
