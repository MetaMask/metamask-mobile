import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import DepositDateField from '../../../Ramp/Deposit/components/DepositDateField';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import {
  selectOnboardingId,
  selectSelectedCountry,
} from '../../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import SelectComponent from '../../../SelectComponent';
import useRegisterPersonalDetails from '../../hooks/useRegisterPersonalDetails';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';

// Utility function to format timestamp to YYYY-MM-DD
const formatDateOfBirth = (timestamp: string): string => {
  if (!timestamp || timestamp.trim() === '') {
    return '';
  }
  const date = new Date(Number(timestamp));
  if (isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
};

const PersonalDetails = () => {
  const navigation = useNavigation();
  const onboardingId = useSelector(selectOnboardingId);
  const selectedCountry = useSelector(selectSelectedCountry);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dateError, setDateError] = useState('');
  const [nationality, setNationality] = useState('');
  const [SSN, setSSN] = useState('');
  const [isSSNError, setIsSSNError] = useState(false);

  // Get registration settings data
  const { data: registrationSettings } = useRegistrationSettings();

  // Create select options from registration settings data
  const selectOptions = useMemo(() => {
    if (!registrationSettings?.countries) {
      return [];
    }
    return registrationSettings.countries.map((country) => ({
      key: country.iso3166alpha2,
      value: country.iso3166alpha2,
      label: country.name,
    }));
  }, [registrationSettings]);

  const {
    registerPersonalDetails,
    isLoading: registerLoading,
    isError: registerIsError,
    error: registerError,
    reset: resetRegisterPersonalDetails,
  } = useRegisterPersonalDetails();

  const handleNationalitySelect = useCallback(
    (value: string) => {
      resetRegisterPersonalDetails();
      setNationality(value);
    },
    [resetRegisterPersonalDetails],
  );

  const handleDateOfBirthChange = useCallback(
    (timestamp: string) => {
      resetRegisterPersonalDetails();
      setDateOfBirth(timestamp);
    },
    [resetRegisterPersonalDetails],
  );

  const debouncedSSN = useDebouncedValue(SSN, 1000);

  const handleSSNChange = useCallback(
    (text: string) => {
      resetRegisterPersonalDetails();
      const cleanedText = text.replace(/\D/g, '');
      setSSN(cleanedText);
    },
    [resetRegisterPersonalDetails],
  );

  useEffect(() => {
    if (!debouncedSSN) {
      return;
    }

    setIsSSNError(
      // 9 digits
      !/^\d{9}$/.test(debouncedSSN),
    );
  }, [debouncedSSN]);

  // Age validation useEffect
  useEffect(() => {
    if (!dateOfBirth) {
      setDateError('');
      return;
    }

    const birthTimestamp = Number(dateOfBirth);
    if (isNaN(birthTimestamp)) {
      setDateError(
        strings('card.card_onboarding.personal_details.invalid_date_of_birth'),
      );
      return;
    }

    const birthDate = new Date(birthTimestamp);
    const today = new Date();

    if (birthDate > today) {
      setDateError(
        strings('card.card_onboarding.personal_details.invalid_date_of_birth'),
      );
      return;
    }

    // Calculate age in years
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Adjust age if birthday hasn't occurred this year yet
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    // Set error if user is under 18
    if (age < 18) {
      setDateError(
        strings(
          'card.card_onboarding.personal_details.invalid_date_of_birth_underage',
        ),
      );
    }
  }, [dateOfBirth]);

  const handleContinue = async () => {
    if (
      !onboardingId ||
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !nationality ||
      (!debouncedSSN && selectedCountry === 'US')
    ) {
      return;
    }

    try {
      await registerPersonalDetails(
        {
          onboardingId,
          firstName,
          lastName,
          dateOfBirth: formatDateOfBirth(dateOfBirth),
          countryOfNationality: nationality,
          ssn: debouncedSSN,
        },
        selectedCountry === 'US' ? 'us' : 'international',
      );
      navigation.navigate(Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS);
    } catch (error) {
      console.error('Error registering personal details:', error);
      return;
    }
  };

  const isDisabled = useMemo(
    () =>
      registerLoading ||
      registerIsError ||
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !nationality ||
      (!debouncedSSN && selectedCountry === 'US') ||
      isSSNError ||
      !!dateError,
    [
      registerLoading,
      registerIsError,
      firstName,
      lastName,
      dateOfBirth,
      nationality,
      debouncedSSN,
      selectedCountry,
      isSSNError,
      dateError,
    ],
  );

  const renderFormFields = () => (
    <>
      {/* First Name */}
      <Box>
        <Label>
          {strings('card.card_onboarding.personal_details.first_name_label')}
        </Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={setFirstName}
          placeholder={strings(
            'card.card_onboarding.personal_details.first_name_placeholder',
          )}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={firstName}
          keyboardType="default"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.personal_details.first_name_label',
          )}
        />
      </Box>

      {/* Last Name */}
      <Box>
        <Label>
          {strings('card.card_onboarding.personal_details.last_name_label')}
        </Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={setLastName}
          placeholder={strings(
            'card.card_onboarding.personal_details.last_name_placeholder',
          )}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={lastName}
          keyboardType="default"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.personal_details.last_name_label',
          )}
        />
      </Box>

      {/* Date of Birth */}
      <DepositDateField
        label="Date of Birth"
        value={dateOfBirth}
        onChangeText={handleDateOfBirthChange}
        error={dateError}
      />

      {/* Nationality */}
      <Box>
        <Label>
          {strings('card.card_onboarding.personal_details.nationality_label')}
        </Label>
        <SelectComponent
          label={strings(
            'card.card_onboarding.personal_details.nationality_label',
          )}
          selectedValue={nationality}
          options={selectOptions}
          onValueChange={handleNationalitySelect}
          defaultValue={strings(
            'card.card_onboarding.personal_details.nationality_placeholder',
          )}
          testID="nationality-select"
        />
      </Box>

      {/* SSN */}
      {selectedCountry === 'US' && (
        <Box>
          <Label>
            {strings('card.card_onboarding.personal_details.ssn_label')}
          </Label>
          <TextField
            autoCapitalize={'none'}
            onChangeText={handleSSNChange}
            placeholder={strings(
              'card.card_onboarding.personal_details.ssn_placeholder',
            )}
            numberOfLines={1}
            size={TextFieldSize.Lg}
            value={SSN}
            keyboardType="number-pad"
            maxLength={9}
            accessibilityLabel={strings(
              'card.card_onboarding.personal_details.ssn_label',
            )}
            isError={!!debouncedSSN && isSSNError}
          />
          {debouncedSSN.length > 0 && isSSNError && (
            <Text variant={TextVariant.BodySm} twClassName="text-error-default">
              {strings('card.card_onboarding.personal_details.invalid_ssn')}
            </Text>
          )}
        </Box>
      )}
    </>
  );

  const renderActions = () => (
    <Box>
      <Button
        variant={ButtonVariants.Primary}
        label={strings('card.card_onboarding.continue_button')}
        size={ButtonSize.Lg}
        onPress={handleContinue}
        width={ButtonWidthTypes.Full}
        isDisabled={isDisabled}
      />
      {!!registerError && (
        <Text variant={TextVariant.BodySm} twClassName="text-error-default">
          {registerError}
        </Text>
      )}
    </Box>
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.personal_details.title')}
      description={strings('card.card_onboarding.personal_details.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default PersonalDetails;
