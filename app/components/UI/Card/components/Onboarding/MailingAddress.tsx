import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import { useParams } from '../../../../../util/navigation/navUtils';
import { AddressFields } from './PhysicalAddress';

const MailingAddress = () => {
  const navigation = useNavigation();

  const {
    addressLine1: initialAddressLine1,
    addressLine2: initialAddressLine2,
    city: initialCity,
    state: initialState,
    zipCode: initialZipCode,
  } = useParams<{
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zipCode: string;
  }>();

  const [addressLine1, setAddressLine1] = useState(initialAddressLine1);
  const [addressLine2, setAddressLine2] = useState(initialAddressLine2);
  const [city, setCity] = useState(initialCity);
  const [state, setState] = useState(initialState);
  const [zipCode, setZipCode] = useState(initialZipCode);

  const handleContinue = () => {
    navigation.navigate(Routes.CARD.ONBOARDING.COMPLETE);
  };

  const handleZipCodeChange = (text: string) => {
    const cleanedText = text.replace(/\D/g, '');
    setZipCode(cleanedText);
  };

  const isDisabled = useMemo(
    () => !addressLine1 || !city || !state || !zipCode,
    [addressLine1, city, state, zipCode],
  );

  const renderFormFields = () => (
    <AddressFields
      addressLine1={addressLine1}
      setAddressLine1={setAddressLine1}
      addressLine2={addressLine2}
      setAddressLine2={setAddressLine2}
      city={city}
      setCity={setCity}
      state={state}
      setState={setState}
      zipCode={zipCode}
      handleZipCodeChange={handleZipCodeChange}
    />
  );

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.continue_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      width={ButtonWidthTypes.Full}
      isDisabled={isDisabled}
    />
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.mailing_address.title')}
      description={strings('card.card_onboarding.mailing_address.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default MailingAddress;
