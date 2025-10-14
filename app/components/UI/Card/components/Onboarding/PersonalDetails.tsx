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
import DepositDateField from '../../../Ramp/Deposit/components/DepositDateField';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';

const PersonalDetails = () => {
  const navigation = useNavigation();

  const handleContinue = () => {
    navigation.navigate(Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS);
  };

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dateError, setDateError] = useState('');
  const [nationality, setNationality] = useState('');
  const [SSN, setSSN] = useState('');
  const [isSSNError, setIsSSNError] = useState(false);

  const debouncedSSN = useDebouncedValue(SSN, 1000);

  const handleSSNChange = (text: string) => {
    const cleanedText = text.replace(/\D/g, '');
    setSSN(cleanedText);
  };

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

  const isDisabled = useMemo(
    () =>
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !nationality ||
      !SSN ||
      isSSNError ||
      !!dateError,
    [firstName, lastName, dateOfBirth, nationality, SSN, isSSNError, dateError],
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
          returnKeyType={'next'}
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
          returnKeyType={'next'}
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
        onChangeText={setDateOfBirth}
        error={dateError}
      />

      {/* Nationality */}
      <Box>
        <Label>
          {strings('card.card_onboarding.personal_details.nationality_label')}
        </Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={setNationality}
          placeholder={strings(
            'card.card_onboarding.personal_details.nationality_placeholder',
          )}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={nationality}
          returnKeyType={'next'}
          keyboardType="default"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.personal_details.nationality_label',
          )}
        />
      </Box>

      {/* SSN */}
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
          returnKeyType={'next'}
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
      title={strings('card.card_onboarding.personal_details.title')}
      description={strings('card.card_onboarding.personal_details.description')}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default PersonalDetails;
