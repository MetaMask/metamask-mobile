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
import { useCardSDK } from '../../sdk';
import { Linking, TouchableOpacity } from 'react-native';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { OnboardingActions, OnboardingScreens } from '../../util/metrics';

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
              defaultValue={strings(
                'card.card_onboarding.physical_address.state_placeholder',
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
  const { trackEvent, createEventBuilder } = useMetrics();
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isSameMailingAddress, setIsSameMailingAddress] = useState(true);
  const [electronicConsent, setElectronicConsent] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState(false);
  const [accountOpeningDisclosure, setAccountOpeningDisclosure] =
    useState(false);
  const [rightToInformation, setRightToInformation] = useState(false);

  const { data: registrationSettings } = useRegistrationSettings();

  const termsAndConditionsUSUrl = useMemo(
    () => registrationSettings?.links?.us?.termsAndConditions || '',
    [registrationSettings?.links?.us?.termsAndConditions],
  );

  const privacyPolicyUSUrl = useMemo(
    () => registrationSettings?.links?.us?.noticeOfPrivacy || '',
    [registrationSettings?.links?.us?.noticeOfPrivacy],
  );

  const accountOpeningDisclosureUSUrl = useMemo(
    () => registrationSettings?.links?.us?.accountOpeningDisclosure || '',
    [registrationSettings?.links?.us?.accountOpeningDisclosure],
  );

  const eSignConsentDisclosureUSUrl = useMemo(
    () => registrationSettings?.links?.us?.eSignConsentDisclosure || '',
    [registrationSettings?.links?.us?.eSignConsentDisclosure],
  );

  const termsAndConditionsIntlUrl = useMemo(
    () => registrationSettings?.links?.intl?.termsAndConditions || '',
    [registrationSettings?.links?.intl?.termsAndConditions],
  );

  const rightToInformationIntlUrl = useMemo(
    () => registrationSettings?.links?.intl?.rightToInformation || '',
    [registrationSettings?.links?.intl?.rightToInformation],
  );

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

  const openESignConsentDisclosureUS = useCallback(() => {
    if (eSignConsentDisclosureUSUrl) {
      Linking.openURL(eSignConsentDisclosureUSUrl);
    }
    setElectronicConsent(!electronicConsent);
  }, [eSignConsentDisclosureUSUrl, electronicConsent]);

  const handleAccountOpeningDisclosureToggle = useCallback(() => {
    resetRegisterUserConsent();
    resetRegisterAddress();
    setAccountOpeningDisclosure(!accountOpeningDisclosure);
  }, [
    accountOpeningDisclosure,
    resetRegisterAddress,
    resetRegisterUserConsent,
  ]);

  const openAccountOpeningDisclosureUS = useCallback(() => {
    if (accountOpeningDisclosureUSUrl) {
      Linking.openURL(accountOpeningDisclosureUSUrl);
    }
    setAccountOpeningDisclosure(!accountOpeningDisclosure);
  }, [accountOpeningDisclosureUSUrl, accountOpeningDisclosure]);

  const handleRightToInformationToggle = useCallback(() => {
    resetRegisterUserConsent();
    resetRegisterAddress();
    setRightToInformation(!rightToInformation);
  }, [rightToInformation, resetRegisterAddress, resetRegisterUserConsent]);

  const openRightToInformationIntl = useCallback(() => {
    if (rightToInformationIntlUrl) {
      Linking.openURL(rightToInformationIntlUrl);
    }
    setRightToInformation(!rightToInformation);
  }, [rightToInformationIntlUrl, rightToInformation]);

  const handleTermsAndConditionsToggle = useCallback(() => {
    resetRegisterUserConsent();
    resetRegisterAddress();
    setTermsAndConditions(!termsAndConditions);
  }, [termsAndConditions, resetRegisterAddress, resetRegisterUserConsent]);

  const openTermsAndConditionsIntl = useCallback(() => {
    if (termsAndConditionsIntlUrl) {
      Linking.openURL(termsAndConditionsIntlUrl);
    }
    setTermsAndConditions(!termsAndConditions);
  }, [termsAndConditionsIntlUrl, termsAndConditions]);

  const openTermsAndConditionsUS = useCallback(() => {
    if (termsAndConditionsUSUrl) {
      Linking.openURL(termsAndConditionsUSUrl);
    }
    setTermsAndConditions(!termsAndConditions);
  }, [termsAndConditionsUSUrl, termsAndConditions]);

  const handlePrivacyPolicyToggle = useCallback(() => {
    resetRegisterUserConsent();
    resetRegisterAddress();
    setPrivacyPolicy(!privacyPolicy);
  }, [privacyPolicy, resetRegisterAddress, resetRegisterUserConsent]);

  const openPrivacyPolicyUS = useCallback(() => {
    if (privacyPolicyUSUrl) {
      Linking.openURL(privacyPolicyUSUrl);
    }
    setPrivacyPolicy(!privacyPolicy);
  }, [privacyPolicyUSUrl, privacyPolicy]);

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
      (selectedCountry === 'US' &&
        (!electronicConsent ||
          !accountOpeningDisclosure ||
          !privacyPolicy ||
          !termsAndConditions)) ||
      (selectedCountry !== 'US' &&
        (!rightToInformation || !termsAndConditions)),

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
      accountOpeningDisclosure,
      privacyPolicy,
      termsAndConditions,
      rightToInformation,
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
      (selectedCountry === 'US' &&
        (!electronicConsent ||
          !accountOpeningDisclosure ||
          !privacyPolicy ||
          !termsAndConditions)) ||
      (selectedCountry !== 'US' && (!rightToInformation || !termsAndConditions))
    ) {
      return;
    }

    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_ONBOARDING_BUTTON_CLICKED)
          .addProperties({
            action: OnboardingActions.PHYSICAL_ADDRESS_BUTTON_CLICKED,
          })
          .build(),
      );
      const { accessToken, user: updatedUser } = await registerAddress({
        onboardingId,
        addressLine1,
        addressLine2,
        city,
        usState: state || undefined,
        zip: zipCode,
        isSameMailingAddress,
      });
      await registerUserConsent(onboardingId, user.id);

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

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ONBOARDING_PAGE_VIEWED)
        .addProperties({
          page: OnboardingScreens.PHYSICAL_ADDRESS,
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

      {selectedCountry === 'US' ? (
        <>
          {/* US: Check box 1: Same Mailing Address */}
          <Checkbox
            isChecked={isSameMailingAddress}
            onPress={handleSameMailingAddressToggle}
            label={strings(
              'card.card_onboarding.physical_address.same_mailing_address_label',
            )}
            style={tw.style('h-auto')}
            testID="physical-address-same-mailing-address-checkbox"
          />

          {/* US: Check box 2: Electronic Consent */}
          <Checkbox
            isChecked={electronicConsent}
            onPress={handleElectronicConsentToggle}
            label={
              <TouchableOpacity onPress={openESignConsentDisclosureUS}>
                <Text variant={TextVariant.BodyMd}>
                  {strings(
                    'card.card_onboarding.physical_address.electronic_consent_1',
                  )}
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="text-primary-default underline"
                  >
                    {strings(
                      'card.card_onboarding.physical_address.electronic_consent_2',
                    )}
                  </Text>
                  {strings(
                    'card.card_onboarding.physical_address.electronic_consent_3',
                  )}
                </Text>
              </TouchableOpacity>
            }
            style={tw.style('h-auto')}
            testID="physical-address-electronic-consent-checkbox"
          />
          {/* US: Check box 3: Account Opening Disclosure */}
          <Checkbox
            isChecked={accountOpeningDisclosure}
            onPress={handleAccountOpeningDisclosureToggle}
            label={
              <TouchableOpacity onPress={openAccountOpeningDisclosureUS}>
                <Text variant={TextVariant.BodyMd}>
                  {strings(
                    'card.card_onboarding.physical_address.account_opening_disclosure_1',
                  )}
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="text-primary-default underline"
                  >
                    {strings(
                      'card.card_onboarding.physical_address.account_opening_disclosure_2',
                    )}
                  </Text>
                </Text>
              </TouchableOpacity>
            }
            style={tw.style('h-auto')}
            testID="physical-address-account-opening-disclosure-checkbox"
          />
          {/* US: Check box 4: Terms and Conditions */}
          <Checkbox
            isChecked={termsAndConditions}
            onPress={handleTermsAndConditionsToggle}
            label={
              <TouchableOpacity onPress={openTermsAndConditionsUS}>
                <Text variant={TextVariant.BodyMd}>
                  {strings(
                    'card.card_onboarding.physical_address.terms_and_conditions_1',
                  )}
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="text-primary-default underline"
                  >
                    {strings(
                      'card.card_onboarding.physical_address.terms_and_conditions_2',
                    )}
                  </Text>
                  {strings(
                    'card.card_onboarding.physical_address.terms_and_conditions_3',
                  )}
                </Text>
              </TouchableOpacity>
            }
            style={tw.style('h-auto')}
            testID="physical-address-terms-and-conditions-checkbox"
          />

          {/* US: Check box 5: Privacy Policy */}
          <Checkbox
            isChecked={privacyPolicy}
            onPress={handlePrivacyPolicyToggle}
            label={
              <TouchableOpacity onPress={openPrivacyPolicyUS}>
                <Text variant={TextVariant.BodyMd}>
                  {strings(
                    'card.card_onboarding.physical_address.privacy_policy_1',
                  )}

                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="text-primary-default underline"
                  >
                    {strings(
                      'card.card_onboarding.physical_address.privacy_policy_2',
                    )}
                  </Text>

                  {strings(
                    'card.card_onboarding.physical_address.privacy_policy_3',
                  )}
                </Text>
              </TouchableOpacity>
            }
            style={tw.style('h-auto')}
            testID="physical-address-privacy-policy-checkbox"
          />
        </>
      ) : (
        <>
          {/* Intl: Check box 1: Terms and Conditions */}
          <Checkbox
            isChecked={termsAndConditions}
            onPress={handleTermsAndConditionsToggle}
            label={
              <TouchableOpacity onPress={openTermsAndConditionsIntl}>
                <Text variant={TextVariant.BodyMd}>
                  {strings(
                    'card.card_onboarding.physical_address.terms_and_conditions_1',
                  )}

                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="text-primary-default underline"
                  >
                    {strings(
                      'card.card_onboarding.physical_address.terms_and_conditions_2',
                    )}
                  </Text>

                  {strings(
                    'card.card_onboarding.physical_address.terms_and_conditions_3',
                  )}
                </Text>
              </TouchableOpacity>
            }
            style={tw.style('h-auto')}
            testID="physical-address-terms-and-conditions-checkbox"
          />

          {/* Intl: Check box 2: Right to Information */}
          <Checkbox
            isChecked={rightToInformation}
            onPress={handleRightToInformationToggle}
            label={
              <TouchableOpacity onPress={openRightToInformationIntl}>
                <Text variant={TextVariant.BodyMd}>
                  {strings(
                    'card.card_onboarding.physical_address.right_to_information_1',
                  )}
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="text-primary-default underline"
                  >
                    {strings(
                      'card.card_onboarding.physical_address.right_to_information_2',
                    )}
                  </Text>
                  {strings(
                    'card.card_onboarding.physical_address.right_to_information_3',
                  )}
                </Text>
              </TouchableOpacity>
            }
            style={tw.style('h-auto')}
            testID="physical-address-right-to-information-checkbox"
          />
        </>
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
