import React, { useEffect } from 'react';
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

const Complete = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
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

  const handleContinue = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ONBOARDING_BUTTON_CLICKED)
        .addProperties({
          action: OnboardingActions.COMPLETE_BUTTON_CLICKED,
        })
        .build(),
    );
    dispatch(resetOnboardingState());
    navigation.navigate(Routes.CARD.HOME);
  };

  const renderFormFields = () => null;

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.confirm_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
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
