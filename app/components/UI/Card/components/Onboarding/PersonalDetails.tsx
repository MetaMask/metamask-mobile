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
  resetOnboardingState,
  selectOnboardingId,
  selectSelectedCountry,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import SelectComponent from '../../../SelectComponent';
import useRegisterPersonalDetails from '../../hooks/useRegisterPersonalDetails';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import {
  formatDateOfBirth,
  validateDateOfBirth,
} from '../../util/validateDateOfBirth';
import { CardError } from '../../types';
import { useCardSDK } from '../../sdk';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';

const PersonalDetails = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { setUser, user: userData } = useCardSDK();
  const onboardingId = useSelector(selectOnboardingId);
  const selectedCountry = useSelector(selectSelectedCountry);
  const { trackEvent, createEventBuilder } = useMetrics();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dateError, setDateError] = useState('');
  const [nationality, setNationality] = useState('');
  const [SSN, setSSN] = useState('');
  const [isSSNError, setIsSSNError] = useState(false);

  // Get registration settings data
  const { data: registrationSettings } = useRegistrationSettings();

  // If user data is available, set the state values
  useEffect(() => {
    if (userData) {
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setDateOfBirth(
        userData.dateOfBirth ? formatDateOfBirth(userData.dateOfBirth) : '',
      );
      setNationality(userData.countryOfResidence || '');
      setSSN(userData.ssn || '');
    }
  }, [userData]);

  // Create select options from registration settings data
  const selectOptions = useMemo(() => {
    if (!registrationSettings?.countries) {
      return [];
    }
    return [...registrationSettings.countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((country) => ({
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

    if (!validateDateOfBirth(birthTimestamp)) {
      setDateError(
        strings('card.card_onboarding.personal_details.invalid_date_of_birth'),
      );
    } else setDateError('');
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
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.PERSONAL_DETAILS_BUTTON,
            country_of_residence: selectedCountry,
          })
          .build(),
      );
      const { user } = await registerPersonalDetails({
        onboardingId,
        firstName,
        lastName,
        dateOfBirth: formatDateOfBirth(dateOfBirth),
        countryOfNationality: nationality,
        ssn: debouncedSSN,
      });

      if (user) {
        setUser(user);
        navigation.navigate(Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS);
      }
    } catch (error) {
      if (
        error instanceof CardError &&
        error.message.includes('Onboarding ID not found')
      ) {
        // Onboarding ID not found, navigate back and restart the flow
        dispatch(resetOnboardingState());
        navigation.navigate(Routes.CARD.ONBOARDING.SIGN_UP);
        return;
      }
      // Allow error message to display
    }
  };

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.PERSONAL_DETAILS,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

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
      !!dateError ||
      !onboardingId,
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
      onboardingId,
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
          testID="personal-details-first-name-input"
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
          testID="personal-details-last-name-input"
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
      <Box twClassName="mt-[-14px]">
        <Label>
          {strings('card.card_onboarding.personal_details.nationality_label')}
        </Label>
        <Box twClassName="w-full border border-solid border-border-default rounded-lg py-1">
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
            testID="personal-details-nationality-select"
          />
        </Box>
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
            testID="personal-details-ssn-input"
          />
          {debouncedSSN.length > 0 && isSSNError && (
            <Text
              variant={TextVariant.BodySm}
              testID="personal-details-ssn-error"
              twClassName="text-error-default"
            >
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
        testID="personal-details-continue-button"
      />
      {!!registerError && (
        <Text
          variant={TextVariant.BodySm}
          testID="personal-details-error"
          twClassName="text-error-default"
        >
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
