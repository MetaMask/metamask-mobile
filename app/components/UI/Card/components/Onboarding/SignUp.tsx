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
import { validateEmail } from '../../../Ramp/Deposit/utils';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import SelectComponent from '../../../SelectComponent';
import { CountriesOutput } from '../../types';

// Mock countries data following DepositRegion structure
export const MOCK_COUNTRIES: CountriesOutput = {
  countries: [
    {
      id: 'us-country-id-001',
      name: 'United States',
      iso3166alpha2: 'US',
      callingCode: '1',
      canSignUp: true,
    },
    {
      id: 'uk-country-id-002',
      name: 'United Kingdom',
      iso3166alpha2: 'GB',
      callingCode: '44',
      canSignUp: true,
    },
    {
      id: 'de-country-id-003',
      name: 'Germany',
      iso3166alpha2: 'DE',
      callingCode: '49',
      canSignUp: true,
    },
    {
      id: 'fr-country-id-004',
      name: 'France',
      iso3166alpha2: 'FR',
      callingCode: '33',
      canSignUp: true,
    },
    {
      id: 'au-country-id-005',
      name: 'Australia',
      iso3166alpha2: 'AU',
      callingCode: '61',
      canSignUp: true,
    },
    {
      id: 'jp-country-id-006',
      name: 'Japan',
      iso3166alpha2: 'JP',
      callingCode: '81',
      canSignUp: true,
    },
  ],
  usStates: [
    {
      id: '8c334d96-6bf6-424b-9bed-d8d140141043',
      name: 'Alaska',
      postalAbbreviation: 'AK',
      canSignUp: true,
    },
  ],
  links: {
    us: {
      termsAndConditions: '',
      accountOpeningDisclosure: '',
      noticeOfPrivacy: '',
    },
    intl: {
      termsAndConditions: '',
      rightToInformation: '',
    },
  },
  config: {
    us: {
      emailSpecialCharactersDomainsException: '',
      consentSmsNumber: '',
      supportEmail: '',
    },
    intl: {
      emailSpecialCharactersDomainsException: '',
      consentSmsNumber: '',
      supportEmail: '',
    },
  },
};

const selectOptions = MOCK_COUNTRIES.countries.map((country) => ({
  key: country.iso3166alpha2,
  value: country.iso3166alpha2,
  label: country.name,
}));

const SignUp = () => {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [isEmailError, setIsEmailError] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('us');
  const [isPasswordError, setIsPasswordError] = useState(false);

  const debouncedEmail = useDebouncedValue(email, 1000);
  const debouncedConfirmPassword = useDebouncedValue(confirmPassword, 1000);

  useEffect(() => {
    if (!debouncedEmail) {
      return;
    }
    setIsEmailError(!validateEmail(debouncedEmail));
  }, [debouncedEmail]);

  useEffect(() => {
    if (!debouncedConfirmPassword) {
      return;
    }
    setIsPasswordError(debouncedConfirmPassword !== password);
  }, [debouncedConfirmPassword, password]);

  const isDisabled = useMemo(
    () =>
      email.length === 0 ||
      password.length === 0 ||
      !selectedCountry ||
      isPasswordError ||
      isEmailError,
    [email, password, selectedCountry, isPasswordError, isEmailError],
  );

  const handleContinue = () => {
    navigation.navigate(Routes.CARD.ONBOARDING.CONFIRM_EMAIL, {
      email,
    });
  };

  const handleCountrySelect = (countryValue: string) => {
    setSelectedCountry(countryValue);
  };

  const renderFormFields = () => (
    <>
      <Box>
        <Label>{strings('card.card_onboarding.sign_up.email_label')}</Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={setEmail}
          placeholder={strings(
            'card.card_onboarding.sign_up.email_placeholder',
          )}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={email}
          keyboardType="email-address"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.sign_up.email_label',
          )}
          isError={debouncedEmail.length > 0 && isEmailError}
        />
        {debouncedEmail.length > 0 && isEmailError && (
          <Text variant={TextVariant.BodySm} twClassName="text-error-default">
            {strings('card.card_onboarding.sign_up.invalid_email')}
          </Text>
        )}
      </Box>

      <Box>
        <Label>{strings('card.card_onboarding.sign_up.password_label')}</Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={setPassword}
          placeholder={strings(
            'card.card_onboarding.sign_up.password_placeholder',
          )}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={password}
          maxLength={255}
          secureTextEntry
          accessibilityLabel={strings(
            'card.card_onboarding.sign_up.password_label',
          )}
        />
      </Box>

      <Box>
        <Label>
          {strings('card.card_onboarding.sign_up.confirm_password_label')}
        </Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={setConfirmPassword}
          placeholder={strings(
            'card.card_onboarding.sign_up.password_placeholder',
          )}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={confirmPassword}
          maxLength={255}
          secureTextEntry
          accessibilityLabel={strings(
            'card.card_onboarding.sign_up.confirm_password_label',
          )}
          isError={debouncedConfirmPassword.length > 0 && isPasswordError}
        />
        {debouncedConfirmPassword.length > 0 && isPasswordError && (
          <Text variant={TextVariant.BodySm} twClassName="text-error-default">
            {strings('card.card_onboarding.sign_up.password_mismatch')}
          </Text>
        )}
      </Box>

      <Box>
        <Label>{strings('card.card_onboarding.sign_up.country_label')}</Label>
        <Box twClassName="w-full border border-solid border-border-default rounded-lg py-1">
          <SelectComponent
            options={selectOptions}
            selectedValue={selectedCountry}
            onValueChange={handleCountrySelect}
            label={strings('card.card_onboarding.sign_up.country_label')}
            defaultValue={strings(
              'card.card_onboarding.sign_up.country_placeholder',
            )}
          />
        </Box>
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
      title={strings('card.card_onboarding.sign_up.title')}
      description={strings('card.card_onboarding.sign_up.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default SignUp;
