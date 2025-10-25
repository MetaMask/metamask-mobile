import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import OnboardingStep from './OnboardingStep';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { ActivityIndicator } from 'react-native';
import useUserRegistrationStatus from '../../hooks/useUserRegistrationStatus';

const ValidatingKYC = () => {
  const navigation = useNavigation();

  const { verificationState } = useUserRegistrationStatus();

  useEffect(() => {
    if (verificationState === 'VERIFIED') {
      navigation.navigate(Routes.CARD.ONBOARDING.PERSONAL_DETAILS);
    } else if (verificationState === 'REJECTED') {
      navigation.navigate(Routes.CARD.ONBOARDING.KYC_FAILED);
    }
  }, [verificationState, navigation]);

  const renderFormFields = () => <ActivityIndicator />;

  const renderActions = () => null;

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
