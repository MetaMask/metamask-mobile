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
import PickerBase from '../../../../../component-library/components/Pickers/PickerBase';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import OnboardingStep from './OnboardingStep';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { validateEmail } from '../../../Ramp/Deposit/utils';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

// Country type definition
interface Country {
  name: string;
}

// Mock countries data following DepositRegion structure
const MOCK_COUNTRIES: Country[] = [
  {
    name: 'United States',
  },
  {
    name: 'Canada',
  },
  {
    name: 'United Kingdom',
  },
  {
    name: 'Germany',
  },
  {
    name: 'France',
  },
  {
    name: 'Australia',
  },
  {
    name: 'Japan',
  },
];

const SignUp = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const debouncedEmail = useDebouncedValue(email, 1000);
  const debouncedConfirmPassword = useDebouncedValue(confirmPassword, 1000);

  useEffect(() => {
    if (!debouncedEmail) {
      return;
    }
    setIsEmailValid(validateEmail(debouncedEmail));
  }, [debouncedEmail]);

  useEffect(() => {
    if (!debouncedConfirmPassword) {
      return;
    }
    setIsPasswordValid(debouncedConfirmPassword === password);
  }, [debouncedConfirmPassword, password]);

  const isDisabled = useMemo(
    () =>
      email.length === 0 ||
      password.length === 0 ||
      !selectedCountry ||
      !isPasswordValid ||
      !isEmailValid,
    [email, password, selectedCountry, isPasswordValid, isEmailValid],
  );

  const handleContinue = () => {
    navigation.navigate(Routes.CARD.ONBOARDING.CONFIRM_EMAIL, {
      email,
      password,
      country: selectedCountry?.name || '',
    });
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
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
          isError={debouncedEmail.length > 0 && !isEmailValid}
        />
        {debouncedEmail.length > 0 && !isEmailValid && (
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
          isError={debouncedConfirmPassword.length > 0 && !isPasswordValid}
        />
        {debouncedConfirmPassword.length > 0 && !isPasswordValid && (
          <Text variant={TextVariant.BodySm} twClassName="text-error-default">
            {strings('card.card_onboarding.sign_up.password_mismatch')}
          </Text>
        )}
      </Box>

      <Box>
        <Label>{strings('card.card_onboarding.sign_up.country_label')}</Label>
        <PickerBase onPress={toggleDropdown} style={tw.style('rounded-lg')}>
          <Box twClassName="flex-row items-center flex-1">
            {selectedCountry ? (
              <Text variant={TextVariant.BodyMd}>{selectedCountry.name}</Text>
            ) : (
              <Text
                variant={TextVariant.BodyMd}
                twClassName="text-text-alternative"
              >
                {strings('card.card_onboarding.sign_up.country_placeholder')}
              </Text>
            )}
          </Box>
        </PickerBase>

        {isDropdownOpen && (
          <Box twClassName="mt-4 max-h-400 overflow-y-auto">
            {MOCK_COUNTRIES.map((country) => (
              <ListItemSelect
                key={country.name}
                isSelected={selectedCountry?.name === country.name}
                onPress={() => handleCountrySelect(country)}
              >
                <Text variant={TextVariant.BodyMd}>{country.name}</Text>
              </ListItemSelect>
            ))}
          </Box>
        )}
      </Box>
    </>
  );

  const renderActions = () => (
    <>
      <Button
        variant={ButtonVariants.Primary}
        label={strings('card.card_onboarding.continue_button')}
        size={ButtonSize.Lg}
        onPress={handleContinue}
        width={ButtonWidthTypes.Full}
        disabled={isDisabled}
      />
    </>
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
