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
import useRegisterPhysicalAddress from '../../hooks/useRegisterPhysicalAddress';
import { useDispatch, useSelector } from 'react-redux';
import {
  resetOnboardingState,
  selectConsentSetId,
  selectOnboardingId,
  selectSelectedCountry,
  setConsentSetId,
  setIsAuthenticatedCard,
  setUserCardLocation,
} from '../../../../../core/redux/slices/card';
import useRegisterUserConsent from '../../hooks/useRegisterUserConsent';
import { CardError } from '../../types';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import SelectComponent from '../../../SelectComponent';
import { storeCardBaanxToken } from '../../util/cardTokenVault';
import { mapCountryToLocation } from '../../util/mapCountryToLocation';
import { extractTokenExpiration } from '../../util/extractTokenExpiration';
import { useCardSDK } from '../../sdk';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { Linking, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Checkbox from '../../../../../component-library/components/Checkbox';

// No-op function for disabled SelectComponent
const noop = () => undefined;

export const AddressFields = ({
  addressLine1,
  handleAddressLine1Change,
  addressLine2,
  handleAddressLine2Change,
  city,
  handleCityChange,
  state,
  handleStateChange,
  zipCode,
  handleZipCodeChange,
}: {
  addressLine1: string;
  handleAddressLine1Change: (text: string) => void;
  addressLine2: string;
  handleAddressLine2Change: (text: string) => void;
  city: string;
  handleCityChange: (text: string) => void;
  state: string;
  handleStateChange: (text: string) => void;
  zipCode: string;
  handleZipCodeChange: (text: string) => void;
}) => {
  const { data: registrationSettings } = useRegistrationSettings();
  const selectedCountry = useSelector(selectSelectedCountry);

  const selectOptions = useMemo(() => {
    if (!registrationSettings?.usStates) {
      return [];
    }
    return [...registrationSettings.usStates]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((usState) => ({
        key: usState.postalAbbreviation,
        value: usState.postalAbbreviation,
        label: usState.name,
      }));
  }, [registrationSettings]);

  const countryOptions = useMemo(() => {
    if (!registrationSettings?.countries) {
      return [];
    }
    return registrationSettings.countries.map((country) => ({
      key: country.iso3166alpha2,
      value: country.iso3166alpha2,
      label: country.name,
    }));
  }, [registrationSettings]);

  return (
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
          onChangeText={handleAddressLine1Change}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={addressLine1}
          keyboardType="default"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.physical_address.address_line_1_label',
          )}
          testID="address-line-1-input"
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
          onChangeText={handleAddressLine2Change}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={addressLine2}
          keyboardType="default"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.physical_address.address_line_2_label',
          )}
          testID="address-line-2-input"
        />
      </Box>
      {/* City */}
      <Box>
        <Label>
          {strings('card.card_onboarding.physical_address.city_label')}
        </Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={handleCityChange}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={city}
          keyboardType="default"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.physical_address.city_label',
          )}
          testID="city-input"
        />
      </Box>
      {/* State */}
      {selectedCountry === 'US' && (
        <Box>
          <Label>
            {strings('card.card_onboarding.physical_address.state_label')}
          </Label>
          <Box twClassName="w-full border border-solid border-border-default rounded-lg py-1">
            <SelectComponent
              options={selectOptions}
              selectedValue={state}
              onValueChange={handleStateChange}
              label={strings(
                'card.card_onboarding.physical_address.state_label',
              )}
              testID="state-select"
            />
          </Box>
        </Box>
      )}
      {/* ZIP Code */}
      <Box>
        <Label>
          {strings('card.card_onboarding.physical_address.zip_code_label')}
        </Label>
        <TextField
          autoCapitalize={'none'}
          onChangeText={handleZipCodeChange}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={zipCode}
          keyboardType="default"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.physical_address.zip_code_label',
          )}
          testID="zip-code-input"
        />
      </Box>
      {/* Country */}
      <Box>
        <Label>
          {strings('card.card_onboarding.physical_address.country_label')}
        </Label>
        <Box twClassName="w-full border border-solid border-border-default rounded-lg py-1">
          <SelectComponent
            options={countryOptions}
            selectedValue={selectedCountry || ''}
            onValueChange={noop}
            label={strings(
              'card.card_onboarding.physical_address.country_label',
            )}
            testID="country-select"
          />
        </Box>
      </Box>
    </>
  );
};

const PhysicalAddress = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const dispatch = useDispatch();
  const { user, setUser } = useCardSDK();
  const onboardingId = useSelector(selectOnboardingId);
  const selectedCountry = useSelector(selectSelectedCountry);
  const existingConsentSetId = useSelector(selectConsentSetId);
  const { trackEvent, createEventBuilder } = useMetrics();
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [electronicConsent, setElectronicConsent] = useState(false);

  const { data: registrationSettings } = useRegistrationSettings();

  const eSignConsentDisclosureUSUrl = useMemo(
    () => registrationSettings?.links?.us?.eSignConsentDisclosure || '',
    [registrationSettings?.links?.us?.eSignConsentDisclosure],
  );

  const {
    registerAddress,
    isLoading: registerLoading,
    isError: registerIsError,
    error: registerError,
    reset: resetRegisterAddress,
  } = useRegisterPhysicalAddress();

  const {
    createOnboardingConsent,
    linkUserToConsent,
    getOnboardingConsentSetByOnboardingId,
    isLoading: consentLoading,
    isError: consentIsError,
    error: consentError,
    reset: resetConsent,
  } = useRegisterUserConsent();

  const openESignConsentDisclosureUS = useCallback(() => {
    if (eSignConsentDisclosureUSUrl) {
      Linking.openURL(eSignConsentDisclosureUSUrl);
    }
  }, [eSignConsentDisclosureUSUrl]);

  const handleAddressLine1Change = useCallback(
    (text: string) => {
      resetRegisterAddress();
      setAddressLine1(text);
    },
    [resetRegisterAddress],
  );

  const handleAddressLine2Change = useCallback(
    (text: string) => {
      resetRegisterAddress();
      setAddressLine2(text);
    },
    [resetRegisterAddress],
  );

  const handleCityChange = useCallback(
    (text: string) => {
      resetRegisterAddress();
      setCity(text);
    },
    [resetRegisterAddress],
  );

  const handleStateChange = useCallback(
    (text: string) => {
      resetRegisterAddress();
      setState(text);
    },
    [resetRegisterAddress],
  );

  const handleZipCodeChange = useCallback(
    (text: string) => {
      resetRegisterAddress();
      setZipCode(text);
    },
    [resetRegisterAddress],
  );

  const handleElectronicConsentToggle = useCallback(() => {
    resetConsent();
    resetRegisterAddress();
    setElectronicConsent(!electronicConsent);
  }, [electronicConsent, resetRegisterAddress, resetConsent]);

  const isDisabled = useMemo(
    () =>
      registerLoading ||
      registerIsError ||
      consentLoading ||
      consentIsError ||
      !onboardingId ||
      !user?.id ||
      !addressLine1 ||
      !city ||
      (!state && selectedCountry === 'US') ||
      !zipCode ||
      !electronicConsent,
    [
      registerLoading,
      registerIsError,
      consentLoading,
      consentIsError,
      onboardingId,
      user?.id,
      addressLine1,
      city,
      state,
      selectedCountry,
      zipCode,
      electronicConsent,
    ],
  );

  const handleContinue = async () => {
    if (
      !onboardingId ||
      !user?.id ||
      !addressLine1 ||
      !city ||
      (selectedCountry === 'US' && !state) ||
      !zipCode ||
      !electronicConsent
    ) {
      return;
    }

    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties({
            action: CardActions.RESIDENTIAL_ADDRESS_BUTTON,
          })
          .build(),
      );

      // Step 7: Create or retrieve consent record
      let consentSetId = existingConsentSetId;
      let shouldLinkConsent = true;

      if (!consentSetId) {
        // Check if consent already exists for this onboarding
        const consentSet =
          await getOnboardingConsentSetByOnboardingId(onboardingId);

        if (consentSet) {
          // Check if consent is already completed (both fields must be present)
          if (consentSet.completedAt && consentSet.userId) {
            // Consent already linked - skip consent operations entirely
            shouldLinkConsent = false;
            consentSetId = null;
          } else {
            // Consent exists but not completed - reuse it
            consentSetId = consentSet.consentSetId;
            // Store it in Redux for future use
            dispatch(setConsentSetId(consentSetId));
          }
        } else {
          // No consent exists - create a new one
          consentSetId = await createOnboardingConsent(onboardingId);
          dispatch(setConsentSetId(consentSetId));
        }
      }

      // Step 8: Register physical address
      const { accessToken, user: updatedUser } = await registerAddress({
        onboardingId,
        addressLine1,
        addressLine2,
        city,
        usState: state || undefined,
        zip: zipCode,
        isSameMailingAddress: true,
      });

      if (updatedUser) {
        setUser(updatedUser);
      }

      // If registration is complete (accessToken received), link consent to user
      if (accessToken && updatedUser?.id) {
        // Store the access token for immediate authentication
        const location = mapCountryToLocation(selectedCountry);
        const accessTokenExpiresIn = extractTokenExpiration(accessToken);

        const storeResult = await storeCardBaanxToken({
          accessToken,
          accessTokenExpiresAt: accessTokenExpiresIn,
          location,
        });

        if (storeResult.success) {
          // Update Redux state to reflect authentication
          dispatch(setIsAuthenticatedCard(true));
          dispatch(setUserCardLocation(location));
        }

        // Step 10: Link consent to user (only if needed)
        if (shouldLinkConsent && consentSetId) {
          await linkUserToConsent(consentSetId, updatedUser.id);
          dispatch(setConsentSetId(null));
        }

        // Reset the navigation stack to the verifying registration screen
        navigation.reset({
          index: 0,
          routes: [{ name: Routes.CARD.ONBOARDING.VALIDATING_KYC }],
        });
        return;
      }

      // Something is wrong. We need to display the registerError or restart the flow
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
    }
  };

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.RESIDENTIAL_ADDRESS,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const renderFormFields = () => (
    <>
      <AddressFields
        addressLine1={addressLine1}
        handleAddressLine1Change={handleAddressLine1Change}
        addressLine2={addressLine2}
        handleAddressLine2Change={handleAddressLine2Change}
        city={city}
        handleCityChange={handleCityChange}
        state={state}
        handleStateChange={handleStateChange}
        zipCode={zipCode}
        handleZipCodeChange={handleZipCodeChange}
      />
      <Checkbox
        isChecked={electronicConsent}
        onPress={handleElectronicConsentToggle}
        label={
          <TouchableOpacity
            onPress={openESignConsentDisclosureUS}
            style={tw.style('flex-1 flex-shrink mr-2 -mt-1')}
          >
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-text-alternative"
            >
              {strings(
                'card.card_onboarding.physical_address.electronic_consent_1',
              )}
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-primary-default underline"
              >
                {strings(
                  'card.card_onboarding.physical_address.electronic_consent_2',
                )}
              </Text>
            </Text>
          </TouchableOpacity>
        }
        style={tw.style('h-auto flex flex-row items-start')}
        testID="physical-address-electronic-consent-checkbox"
      />
    </>
  );

  const renderActions = () => (
    <Box twClassName="flex flex-col justify-center gap-2">
      {registerIsError ? (
        <Text
          variant={TextVariant.BodySm}
          testID="physical-address-register-error"
          twClassName="text-error-default"
        >
          {registerError}
        </Text>
      ) : consentIsError ? (
        <Text
          variant={TextVariant.BodySm}
          testID="physical-address-consent-error"
          twClassName="text-error-default"
        >
          {consentError}
        </Text>
      ) : null}
      <Button
        variant={ButtonVariants.Primary}
        label={strings('card.card_onboarding.continue_button')}
        size={ButtonSize.Lg}
        onPress={handleContinue}
        width={ButtonWidthTypes.Full}
        isDisabled={isDisabled}
        testID="physical-address-continue-button"
      />
    </Box>
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
