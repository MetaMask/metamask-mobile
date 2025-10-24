import React, { useCallback, useMemo, useState } from 'react';
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
import Checkbox from '../../../../../component-library/components/Checkbox';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import useRegisterPhysicalAddress from '../../hooks/useRegisterPhysicalAddress';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectOnboardingId,
  selectSelectedCountry,
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
import Logger from '../../../../../util/Logger';
import { useCardSDK } from '../../sdk';

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
          placeholder={strings(
            'card.card_onboarding.physical_address.address_line_1_placeholder',
          )}
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
          placeholder={strings(
            'card.card_onboarding.physical_address.address_line_2_placeholder',
          )}
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
          placeholder={strings(
            'card.card_onboarding.physical_address.city_placeholder',
          )}
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
        <Box twClassName="w-full border border-solid border-border-default rounded-lg py-1">
          <SelectComponent
            options={selectOptions}
            selectedValue={state}
            onValueChange={handleStateChange}
            label={strings('card.card_onboarding.physical_address.state_label')}
            defaultValue={strings(
              'card.card_onboarding.physical_address.state_placeholder',
            )}
            testID="state-select"
          />
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
          placeholder={strings(
            'card.card_onboarding.physical_address.zip_code_placeholder',
          )}
          numberOfLines={1}
          size={TextFieldSize.Lg}
          value={zipCode}
          keyboardType="number-pad"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.physical_address.zip_code_label',
          )}
          testID="zip-code-input"
        />
      </Box>
    </>
  );
};

const PhysicalAddress = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { user, setUser } = useCardSDK();
  const onboardingId = useSelector(selectOnboardingId);
  const selectedCountry = useSelector(selectSelectedCountry);

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isSameMailingAddress, setIsSameMailingAddress] = useState(true);
  const [electronicConsent, setElectronicConsent] = useState(false);

  const {
    registerAddress,
    isLoading: registerLoading,
    isError: registerIsError,
    error: registerError,
    reset: resetRegisterAddress,
  } = useRegisterPhysicalAddress();

  const {
    registerUserConsent,
    isLoading: registerUserConsentLoading,
    isError: registerUserConsentIsError,
    error: registerUserConsentError,
    reset: resetRegisterUserConsent,
  } = useRegisterUserConsent();

  const handleSameMailingAddressToggle = useCallback(() => {
    resetRegisterAddress();
    setIsSameMailingAddress(!isSameMailingAddress);
  }, [isSameMailingAddress, resetRegisterAddress]);

  const handleElectronicConsentToggle = useCallback(() => {
    resetRegisterUserConsent();
    resetRegisterAddress();
    setElectronicConsent(!electronicConsent);
  }, [electronicConsent, resetRegisterAddress, resetRegisterUserConsent]);

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

  const isDisabled = useMemo(
    () =>
      registerLoading ||
      registerIsError ||
      registerUserConsentLoading ||
      registerUserConsentIsError ||
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
      registerUserConsentLoading,
      registerUserConsentIsError,
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
      (!state && selectedCountry === 'US') ||
      !zipCode ||
      !electronicConsent
    ) {
      return;
    }
    try {
      await registerUserConsent(onboardingId, user.id);

      const { accessToken, user: updatedUser } = await registerAddress({
        onboardingId,
        addressLine1,
        addressLine2,
        city,
        usState: state || undefined,
        zip: zipCode,
        isSameMailingAddress,
      });

      if (updatedUser) {
        setUser(updatedUser);
      }

      if (accessToken) {
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
        } else {
          Logger.log(
            'PhysicalAddress: Failed to store access token',
            storeResult.error,
          );
        }

        navigation.navigate(Routes.CARD.ONBOARDING.COMPLETE);
      }

      // When isSameMailingAddress = false AND countryOfResidence = "US"
      if (!isSameMailingAddress && selectedCountry === 'US') {
        navigation.navigate(Routes.CARD.ONBOARDING.MAILING_ADDRESS);
      }

      // Something is wrong. We need to display the registerError or restart the flow
    } catch (error) {
      if (
        error instanceof CardError &&
        error.message.includes('Onboarding ID not found')
      ) {
        // Onboarding ID not found, navigate back and restart the flow
        navigation.navigate(Routes.CARD.ONBOARDING.SIGN_UP);
        return;
      }
      // Allow error message to display
    }
  };

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

      {/* Check box 1: Same Mailing Address */}
      {selectedCountry === 'US' && (
        <Checkbox
          isChecked={isSameMailingAddress}
          onPress={handleSameMailingAddressToggle}
          label={strings(
            'card.card_onboarding.physical_address.same_mailing_address_label',
          )}
          style={tw.style('h-auto')}
          testID="physical-address-same-mailing-address-checkbox"
        />
      )}

      {/* Check box 2: Electronic Consent */}
      <Checkbox
        isChecked={electronicConsent}
        onPress={handleElectronicConsentToggle}
        label={strings(
          'card.card_onboarding.physical_address.electronic_consent',
        )}
        style={tw.style('h-auto')}
        testID="physical-address-electronic-consent-checkbox"
      />
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
        testID="physical-address-continue-button"
      />
      {registerIsError ? (
        <Text
          variant={TextVariant.BodySm}
          testID="physical-address-register-error"
          twClassName="text-error-default"
        >
          {registerError}
        </Text>
      ) : registerUserConsentIsError ? (
        <Text
          variant={TextVariant.BodySm}
          testID="physical-address-register-user-consent-error"
          twClassName="text-error-default"
        >
          {registerUserConsentError}
        </Text>
      ) : null}
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
