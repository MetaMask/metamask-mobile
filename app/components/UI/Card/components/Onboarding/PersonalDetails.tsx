import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
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
import {
  resetOnboardingState,
  selectOnboardingId,
  selectSelectedCountry,
  setSelectedCountry,
} from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
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
import { countryCodeToFlag } from '../../util/countryCodeToFlag';
import {
  clearOnValueChange,
  createRegionSelectorModalNavigationDetails,
  Region,
  setOnValueChange,
} from './RegionSelectorModal';
import { TouchableOpacity } from 'react-native';

const PersonalDetails = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { setUser, fetchUserData, user: userData } = useCardSDK();
  const onboardingId = useSelector(selectOnboardingId);
  const initialSelectedCountry = useSelector(selectSelectedCountry);
  const { trackEvent, createEventBuilder } = useMetrics();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dateError, setDateError] = useState('');
  const [nationalityKey, setNationalityKey] = useState(''); // ISO 3166-1 alpha-2 country code
  const [SSN, setSSN] = useState('');
  const [isSSNError, setIsSSNError] = useState(false);
  const [isSSNTouched, setIsSSNTouched] = useState(false);

  // Get registration settings data
  const { data: registrationSettings } = useRegistrationSettings();

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // If user data is available, set the state values
  useEffect(() => {
    if (userData) {
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      // userData.dateOfBirth is in ISO 8601 format, parse it to local timezone
      if (userData.dateOfBirth && typeof userData.dateOfBirth === 'string') {
        // Parse the date components: YYYY-MM-DD
        const dateMatch = userData.dateOfBirth.match(
          /^(\d{4})-(\d{2})-(\d{2})/,
        );
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          // Create date in local timezone (month is 0-indexed)
          const date = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
          );
          const timestamp = date.getTime();
          setDateOfBirth(timestamp.toString());
        } else {
          setDateOfBirth('');
        }
      } else {
        setDateOfBirth('');
      }

      // Use countryOfResidence as fallback since countryOfNationality is not populated
      setNationalityKey(
        userData.countryOfNationality || userData.countryOfResidence || '',
      );
      setSSN(userData.ssn || '');
    }
  }, [userData]);

  const regions: Region[] = useMemo(() => {
    if (!registrationSettings?.countries) {
      return [];
    }
    return [...registrationSettings.countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((country) => ({
        key: country.iso3166alpha2,
        name: country.name,
        emoji: countryCodeToFlag(country.iso3166alpha2),
        areaCode: country.callingCode,
      }));
  }, [registrationSettings]);

  const nationalityName = useMemo(
    () => regions.find((region) => region.key === nationalityKey)?.name,
    [regions, nationalityKey],
  );

  const selectedCountry = useMemo(
    () =>
      initialSelectedCountry ||
      regions.find((region) => region.key === userData?.countryOfResidence),
    [initialSelectedCountry, regions, userData?.countryOfResidence],
  );

  useEffect(() => {
    if (!initialSelectedCountry && selectedCountry) {
      dispatch(setSelectedCountry(selectedCountry));
    }
  }, [selectedCountry, dispatch, initialSelectedCountry]);

  const {
    registerPersonalDetails,
    isLoading: registerLoading,
    isError: registerIsError,
    error: registerError,
    reset: resetRegisterPersonalDetails,
  } = useRegisterPersonalDetails();

  const handleNationalitySelect = useCallback(() => {
    resetRegisterPersonalDetails();
    setOnValueChange((region) => {
      setNationalityKey(region.key);
    });
    navigation.navigate(
      ...createRegionSelectorModalNavigationDetails({
        regions,
      }),
    );
  }, [navigation, regions, resetRegisterPersonalDetails]);

  const handleDateOfBirthChange = useCallback(
    (timestamp: string) => {
      resetRegisterPersonalDetails();
      setDateOfBirth(timestamp);
    },
    [resetRegisterPersonalDetails],
  );

  const handleSSNChange = useCallback(
    (text: string) => {
      resetRegisterPersonalDetails();
      const cleanedText = text.replace(/\D/g, '');
      setSSN(cleanedText);
      // Clear error when user starts typing again
      if (isSSNError) {
        setIsSSNError(false);
      }
    },
    [resetRegisterPersonalDetails, isSSNError],
  );

  const handleSSNBlur = useCallback(() => {
    setIsSSNTouched(true);
    if (SSN) {
      setIsSSNError(!/^\d{9}$/.test(SSN));
    }
  }, [SSN]);

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

  useEffect(() => () => clearOnValueChange(), []);

  const handleContinue = async () => {
    if (
      !onboardingId ||
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !nationalityKey ||
      (!SSN && selectedCountry?.key === 'US')
    ) {
      return;
    }

    // Validate SSN before submitting if it's a US user
    if (selectedCountry?.key === 'US') {
      const isSSNValid = /^\d{9}$/.test(SSN);
      if (!isSSNValid) {
        setIsSSNError(true);
        return;
      }
    }

    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.PERSONAL_DETAILS_BUTTON,
            country_of_residence: selectedCountry?.key,
          })
          .build(),
      );
      const { user } = await registerPersonalDetails({
        onboardingId,
        firstName,
        lastName,
        dateOfBirth: formatDateOfBirth(dateOfBirth),
        countryOfNationality: nationalityKey,
        ssn: SSN,
      });

      if (user) {
        setUser(user);
        navigation.reset({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS }],
        });
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

  const isDisabled = useMemo(() => {
    // Check the actual SSN value, not the debounced one
    const isSSNValid =
      SSN && selectedCountry?.key === 'US' ? /^\d{9}$/.test(SSN) : true;

    return (
      registerLoading ||
      registerIsError ||
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !nationalityKey ||
      (!SSN && selectedCountry?.key === 'US') ||
      !isSSNValid ||
      !!dateError ||
      !onboardingId
    );
  }, [
    registerLoading,
    registerIsError,
    firstName,
    lastName,
    dateOfBirth,
    nationalityKey,
    SSN,
    selectedCountry,
    dateError,
    onboardingId,
  ]);

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
          numberOfLines={1}
          size={TextFieldSize.Lg}
          autoComplete="one-time-code"
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
          numberOfLines={1}
          size={TextFieldSize.Lg}
          autoComplete="one-time-code"
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
          <TouchableOpacity
            onPress={handleNationalitySelect}
            testID="personal-details-nationality-select"
          >
            <Box twClassName="flex flex-row items-center justify-between px-4 py-2">
              <Text variant={TextVariant.BodyMd}>
                {nationalityName || nationalityKey}
              </Text>
              <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
            </Box>
          </TouchableOpacity>
        </Box>
      </Box>

      {/* SSN */}
      {selectedCountry?.key === 'US' && (
        <Box>
          <Label>
            {strings('card.card_onboarding.personal_details.ssn_label')}
          </Label>
          <TextField
            autoCapitalize={'none'}
            onChangeText={handleSSNChange}
            onBlur={handleSSNBlur}
            numberOfLines={1}
            size={TextFieldSize.Lg}
            value={SSN}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            secureTextEntry
            maxLength={9}
            accessibilityLabel={strings(
              'card.card_onboarding.personal_details.ssn_label',
            )}
            isError={isSSNTouched && isSSNError}
            testID="personal-details-ssn-input"
          />
          {isSSNTouched && isSSNError && (
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
    <Box twClassName="flex flex-col justify-center gap-2">
      {!!registerError && (
        <Text
          variant={TextVariant.BodySm}
          testID="personal-details-error"
          twClassName="text-error-default"
        >
          {registerError}
        </Text>
      )}
      <Button
        variant={ButtonVariants.Primary}
        label={strings('card.card_onboarding.continue_button')}
        size={ButtonSize.Lg}
        onPress={handleContinue}
        width={ButtonWidthTypes.Full}
        isDisabled={isDisabled}
        loading={registerLoading}
        testID="personal-details-continue-button"
      />
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
