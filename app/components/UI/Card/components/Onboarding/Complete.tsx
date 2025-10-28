import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import { useDispatch } from 'react-redux';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { OnboardingActions, OnboardingScreens } from '../../util/metrics';
import { getCardBaanxToken } from '../../util/cardTokenVault';
import Logger from '../../../../../util/Logger';

const Complete = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const { trackEvent, createEventBuilder } = useMetrics();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ONBOARDING_PAGE_VIEWED)
        .addProperties({
          page: OnboardingScreens.COMPLETE,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleContinue = async () => {
    setIsLoading(true);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ONBOARDING_BUTTON_CLICKED)
        .addProperties({
          action: OnboardingActions.COMPLETE_BUTTON_CLICKED,
        })
        .build(),
    );

    try {
      const token = await getCardBaanxToken();
      if (token.success && token.tokenData?.accessToken) {
        navigation.navigate(Routes.CARD.HOME);
      } else {
        navigation.navigate(Routes.CARD.AUTHENTICATION);
      }
      dispatch(resetOnboardingState());
    } catch (error) {
      Logger.log('Complete::handleContinue error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormFields = () => null;

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.confirm_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      disabled={isLoading}
      loading={isLoading}
      width={ButtonWidthTypes.Full}
      testID="complete-confirm-button"
    />
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.complete.title')}
      description={strings('card.card_onboarding.complete.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default Complete;
