import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
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
import { Country } from '../../types';
import { MOCK_COUNTRIES } from './SignUp';
import SelectComponent from '../../../SelectComponent';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

const selectOptions = MOCK_COUNTRIES.map((country) => ({
  key: country.key,
  value: country.areaCode,
  label: country.areaCode,
}));

const SetPhoneNumber = () => {
  const navigation = useNavigation();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneNumberError, setIsPhoneNumberError] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const debouncedPhoneNumber = useDebouncedValue(phoneNumber, 1000);

  const handleContinue = () => {
    navigation.navigate(Routes.CARD.ONBOARDING.CONFIRM_PHONE_NUMBER);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
  };

  const handlePhoneNumberChange = (text: string) => {
    const cleanedText = text.replace(/\D/g, '');
    setPhoneNumber(cleanedText);
  };

  useEffect(() => {
    if (!debouncedPhoneNumber) {
      return;
    }

    setIsPhoneNumberError(
      // 8-14 digits
      !/^\d{8,14}$/.test(debouncedPhoneNumber),
    );
  }, [debouncedPhoneNumber]);

  const isDisabled = useMemo(
    () => !phoneNumber || !selectedCountry || isPhoneNumberError,
    [phoneNumber, selectedCountry, isPhoneNumberError],
  );

  const renderFormFields = () => (
    <Box>
      <Label>
        {strings('card.card_onboarding.set_phone_number.phone_number_label')}
      </Label>
      {/* Area code selector */}
      <Box twClassName="flex flex-row items-center justify-center gap-2">
        <Box twClassName="w-24 border border-solid border-border-default rounded-lg py-1">
          <SelectComponent
            options={selectOptions}
            selectedValue={selectedCountry}
            onValueChange={handleCountrySelect}
            label={strings(
              'card.card_onboarding.set_phone_number.country_area_code_label',
            )}
          />
        </Box>

        {/* Phone number input */}
        <Box twClassName="flex-1">
          <TextField
            autoCapitalize={'none'}
            onChangeText={handlePhoneNumberChange}
            placeholder={strings(
              'card.card_onboarding.set_phone_number.phone_number_placeholder',
            )}
            numberOfLines={1}
            size={TextFieldSize.Lg}
            value={phoneNumber}
            returnKeyType={'next'}
            keyboardType="phone-pad"
            maxLength={255}
            accessibilityLabel={strings(
              'card.card_onboarding.set_phone_number.phone_number_label',
            )}
          />
        </Box>
      </Box>
      {debouncedPhoneNumber && isPhoneNumberError && (
        <Text variant={TextVariant.BodySm} twClassName="text-error-default">
          {strings(
            'card.card_onboarding.set_phone_number.invalid_phone_number',
          )}
        </Text>
      )}
    </Box>
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
      title={strings('card.card_onboarding.set_phone_number.title')}
      description={strings('card.card_onboarding.set_phone_number.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default SetPhoneNumber;
