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
import { Country } from '../../types';

// Mock countries data following DepositRegion structure
export const MOCK_COUNTRIES: Country[] = [
  {
    key: 'us',
    name: 'United States',
    areaCode: '+1',
  },
  {
    key: 'ca',
    name: 'Canada',
    areaCode: '+1',
  },
  {
    key: 'uk',
    name: 'United Kingdom',
    areaCode: '+44',
  },
  {
    key: 'de',
    name: 'Germany',
    areaCode: '+49',
  },
  {
    key: 'fr',
    name: 'France',
    areaCode: '+33',
  },
  {
    key: 'au',
    name: 'Australia',
    areaCode: '+61',
  },
  {
    key: 'jp',
    name: 'Japan',
    areaCode: '+81',
  },
];

const selectOptions = MOCK_COUNTRIES.map((country) => ({
  key: country.key,
  value: country.key,
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
          returnKeyType={'next'}
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
          returnKeyType={'next'}
          //hsecureTextEntry
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
          returnKeyType={'next'}
          //secureTextEntry
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
