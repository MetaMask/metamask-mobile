import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import Label from '../../../../../component-library/components/Form/Label';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import Checkbox from '../../../../../component-library/components/Checkbox';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export const AddressFields = ({
  addressLine1,
  setAddressLine1,
  addressLine2,
  setAddressLine2,
  city,
  setCity,
  state,
  setState,
  zipCode,
  handleZipCodeChange,
}: {
  addressLine1: string;
  setAddressLine1: (text: string) => void;
  addressLine2: string;
  setAddressLine2: (text: string) => void;
  city: string;
  setCity: (text: string) => void;
  state: string;
  setState: (text: string) => void;
  zipCode: string;
  handleZipCodeChange: (text: string) => void;
}) => (
  <>
    {/* Address Line 1 */}
    <Box>
      <Label>
        {strings('card.card_onboarding.physical_address.address_line_1_label')}
      </Label>
      <TextField
        autoCapitalize={'none'}
        onChangeText={setAddressLine1}
        placeholder={strings(
          'card.card_onboarding.physical_address.address_line_1_placeholder',
        )}
        numberOfLines={1}
        size={TextFieldSize.Lg}
        value={addressLine1}
        returnKeyType={'next'}
        keyboardType="default"
        maxLength={255}
        accessibilityLabel={strings(
          'card.card_onboarding.physical_address.address_line_1_label',
        )}
      />
    </Box>
    {/* Address Line 2 */}
    <Box>
      <Label>
        {strings('card.card_onboarding.physical_address.address_line_2_label')}
      </Label>
      <TextField
        autoCapitalize={'none'}
        onChangeText={setAddressLine2}
        placeholder={strings(
          'card.card_onboarding.physical_address.address_line_2_placeholder',
        )}
        numberOfLines={1}
        size={TextFieldSize.Lg}
        value={addressLine2}
        returnKeyType={'next'}
        keyboardType="default"
        maxLength={255}
        accessibilityLabel={strings(
          'card.card_onboarding.physical_address.address_line_2_label',
        )}
      />
    </Box>
    {/* City */}
    <Box>
      <Label>
        {strings('card.card_onboarding.physical_address.city_label')}
      </Label>
      <TextField
        autoCapitalize={'none'}
        onChangeText={setCity}
        placeholder={strings(
          'card.card_onboarding.physical_address.city_placeholder',
        )}
        numberOfLines={1}
        size={TextFieldSize.Lg}
        value={city}
        returnKeyType={'next'}
        keyboardType="default"
        maxLength={255}
        accessibilityLabel={strings(
          'card.card_onboarding.physical_address.city_label',
        )}
      />
    </Box>
    {/* State */}
    <Box>
      <Label>
        {strings('card.card_onboarding.physical_address.state_label')}
      </Label>
      <TextField
        autoCapitalize={'none'}
        onChangeText={setState}
        placeholder={strings(
          'card.card_onboarding.physical_address.state_placeholder',
        )}
        numberOfLines={1}
        size={TextFieldSize.Lg}
        value={state}
        returnKeyType={'next'}
        keyboardType="default"
        maxLength={255}
        accessibilityLabel={strings(
          'card.card_onboarding.physical_address.state_label',
        )}
      />
    </Box>
    {/* ZIP Code */}
    <Box>
      <Label>
        {strings('card.card_onboarding.physical_address.zip_code_label')}
      </Label>
      <TextField
        autoCapitalize={'none'}
        onChangeText={handleZipCodeChange}
        placeholder={strings(
          'card.card_onboarding.physical_address.zip_code_placeholder',
        )}
        numberOfLines={1}
        size={TextFieldSize.Lg}
        value={zipCode}
        returnKeyType={'done'}
        keyboardType="number-pad"
        maxLength={255}
        accessibilityLabel={strings(
          'card.card_onboarding.physical_address.zip_code_label',
        )}
      />
    </Box>
  </>
);

const PhysicalAddress = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isSameMailingAddress, setIsSameMailingAddress] = useState(true);
  const [electronicConsent, setElectronicConsent] = useState(false);

  const handleSameMailingAddressToggle = useCallback(() => {
    setIsSameMailingAddress(!isSameMailingAddress);
  }, [isSameMailingAddress]);

  const handleElectronicConsentToggle = useCallback(() => {
    setElectronicConsent(!electronicConsent);
  }, [electronicConsent]);

  const handleZipCodeChange = (text: string) => {
    const cleanedText = text.replace(/\D/g, '');
    setZipCode(cleanedText);
  };

  const isDisabled = useMemo(
    () => !addressLine1 || !city || !state || !zipCode || !electronicConsent,
    [addressLine1, city, state, zipCode, electronicConsent],
  );

  const additionalParams = isSameMailingAddress
    ? {
        addressLine1,
        addressLine2,
        city,
        state,
        zipCode,
      }
    : {};

  const handleContinue = () => {
    navigation.navigate(
      Routes.CARD.ONBOARDING.MAILING_ADDRESS,
      additionalParams,
    );
  };

  const renderFormFields = () => (
    <>
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

      {/* Check box 1: Same Mailing Address */}
      <Checkbox
        isChecked={isSameMailingAddress}
        onPress={handleSameMailingAddressToggle}
        label={strings(
          'card.card_onboarding.physical_address.same_mailing_address_label',
        )}
        style={tw.style('h-auto')}
      />

      {/* Check box 2: Electronic Consent */}
      <Checkbox
        isChecked={electronicConsent}
        onPress={handleElectronicConsentToggle}
        label={strings(
          'card.card_onboarding.physical_address.electronic_consent',
        )}
        style={tw.style('h-auto')}
      />
    </>
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
      title={strings('card.card_onboarding.physical_address.title')}
      description={strings('card.card_onboarding.physical_address.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default PhysicalAddress;
