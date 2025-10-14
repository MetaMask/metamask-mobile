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
import { ActivityIndicator } from 'react-native';

const ValidatingKYC = () => {
  const navigation = useNavigation();

  const handleContinue = () => {
    navigation.navigate(Routes.CARD.ONBOARDING.PERSONAL_DETAILS);
  };

  const renderFormFields = () => <ActivityIndicator />;

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.confirm_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      width={ButtonWidthTypes.Full}
    />
  );
  return (
    <OnboardingStep
      title={strings('card.card_onboarding.validating_kyc.title')}
      description={''}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default ValidatingKYC;
