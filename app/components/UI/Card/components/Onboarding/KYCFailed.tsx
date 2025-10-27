import React from 'react';
import { useNavigation } from '@react-navigation/native';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';

const KYCFailed = () => {
  const navigation = useNavigation();

  const handleContinue = () => {
    navigation.navigate(Routes.CARD.ONBOARDING.VERIFY_IDENTITY);
  };

  const renderFormFields = () => null;

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.retry_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      width={ButtonWidthTypes.Full}
      testID="kyc-failed-retry-button"
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
