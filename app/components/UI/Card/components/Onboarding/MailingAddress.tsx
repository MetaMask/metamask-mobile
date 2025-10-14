import React, { useMemo, useState } from 'react';
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
import { useParams } from '../../../../../util/navigation/navUtils';

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
    <>
      {/* Address Line 1 */}
      <Box>
        <Label>
          {strings(
            'card.card_onboarding.physical_address.address_line_1_label',
          )}
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
          {strings(
            'card.card_onboarding.physical_address.address_line_2_label',
          )}
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
