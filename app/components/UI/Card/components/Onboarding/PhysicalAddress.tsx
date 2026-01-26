import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import useRegisterPhysicalAddress from '../../hooks/useRegisterPhysicalAddress';
import { useDispatch, useSelector } from 'react-redux';
import {
  resetOnboardingState,
  selectConsentSetId,
  selectOnboardingId,
  selectSelectedCountry,
  setConsentSetId,
  setIsAuthenticatedCard,
  setSelectedCountry,
  setUserCardLocation,
} from '../../../../../core/redux/slices/card';
import useRegisterUserConsent from '../../hooks/useRegisterUserConsent';
import { CardError } from '../../types';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import { storeCardBaanxToken } from '../../util/cardTokenVault';
import { mapCountryToLocation } from '../../util/mapCountryToLocation';
import { extractTokenExpiration } from '../../util/extractTokenExpiration';
import { useCardSDK } from '../../sdk';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import Logger from '../../../../../util/Logger';
import { Linking, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Checkbox from '../../../../../component-library/components/Checkbox';
import {
  clearOnValueChange,
  createRegionSelectorModalNavigationDetails,
  Region,
  setOnValueChange,
} from './RegionSelectorModal';
import { countryCodeToFlag } from '../../util/countryCodeToFlag';

const VERIFICATION_POLLING_INTERVAL_MS = 3000;

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
  const navigation = useNavigation();
  const { data: registrationSettings } = useRegistrationSettings();
  const selectedCountry = useSelector(selectSelectedCountry);

  const regions: Region[] = useMemo(() => {
    if (!registrationSettings?.usStates) {
      return [];
    }
    return [...registrationSettings.usStates]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((usState) => ({
        key: usState.postalAbbreviation,
        name: usState.name,
        emoji: countryCodeToFlag('US'),
      }));
  }, [registrationSettings]);

  useEffect(() => () => clearOnValueChange(), []);

  const handleStateSelect = useCallback(() => {
    setOnValueChange((region) => {
      handleStateChange(region.key);
    });
    navigation.navigate(
      ...createRegionSelectorModalNavigationDetails({
        regions,
      }),
    );
  }, [handleStateChange, navigation, regions]);

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
          autoComplete="off"
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
          autoComplete="off"
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
          autoComplete="off"
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
      {selectedCountry?.key === 'US' && (
        <Box>
          <Label>
            {strings('card.card_onboarding.physical_address.state_label')}
          </Label>
          <Box twClassName="w-full border border-solid border-border-default rounded-lg py-1">
            <TouchableOpacity onPress={handleStateSelect} testID="state-select">
              <Box twClassName="flex flex-row items-center justify-between px-4 py-2">
                <Text variant={TextVariant.BodyMd}>{state}</Text>
                <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
              </Box>
            </TouchableOpacity>
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
          autoComplete="off"
          value={zipCode}
          keyboardType="default"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.physical_address.zip_code_label',
          )}
          testID="zip-code-input"
        />
      </Box>
      {/* Country (read-only) */}
      <Box>
        <Label>
          {strings('card.card_onboarding.physical_address.country_label')}
        </Label>
        <Box twClassName="w-full border border-solid border-border-default rounded-lg py-1">
          <Box twClassName="flex flex-row items-center justify-between px-4 py-2">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-text-alternative"
            >
              {selectedCountry?.name}
            </Text>
          </Box>
        </Box>
      </Box>
    </>
  );
};

const PhysicalAddress = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const dispatch = useDispatch();
  const { user, setUser, sdk } = useCardSDK();
  const onboardingId = useSelector(selectOnboardingId);
  const initialSelectedCountry = useSelector(selectSelectedCountry);
  const existingConsentSetId = useSelector(selectConsentSetId);
  const { trackEvent, createEventBuilder } = useMetrics();
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [electronicConsent, setElectronicConsent] = useState(false);
  const [isPollingVerification, setIsPollingVerification] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const { data: registrationSettings } = useRegistrationSettings();

  // Cleanup polling interval on unmount
  useEffect(
    () => () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    },
    [],
  );

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

  // If user data is available, set the state values
  useEffect(() => {
    if (user) {
      setAddressLine1(user.addressLine1 || '');
      setAddressLine2(user.addressLine2 || '');
      setCity(user.city || '');
      setState(user.usState || '');
      setZipCode(user.zip || '');
      const country = regions.find(
        (region) => region.key === user.countryOfResidence,
      );
      if (country) {
        dispatch(setSelectedCountry(country));
      }
    }
  }, [dispatch, regions, user]);

  const selectedCountry = useMemo(
    () =>
      initialSelectedCountry ||
      regions.find((region) => region.key === user?.countryOfResidence),
    [initialSelectedCountry, regions, user?.countryOfResidence],
  );

  useEffect(() => {
    if (!initialSelectedCountry && selectedCountry) {
      dispatch(setSelectedCountry(selectedCountry));
    }
  }, [selectedCountry, dispatch, initialSelectedCountry]);

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
      isPollingVerification ||
      !onboardingId ||
      !user?.id ||
      !addressLine1 ||
      !city ||
      (!state && selectedCountry?.key === 'US') ||
      !zipCode ||
      (!electronicConsent && selectedCountry?.key === 'US'),
    [
      registerLoading,
      registerIsError,
      consentLoading,
      consentIsError,
      isPollingVerification,
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
      (!state && selectedCountry?.key === 'US') ||
      !zipCode ||
      (!electronicConsent && selectedCountry?.key === 'US')
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
        const location = mapCountryToLocation(selectedCountry?.key || null);
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

        // Step 11: Check KYC status and navigate accordingly
        // Start polling to check verification state before navigating
        setIsPollingVerification(true);

        // Track whether we should continue polling (used to prevent interval setup after navigation)
        let shouldContinuePolling = true;

        const stopPollingAndNavigate = (route: {
          name: string;
          params?: Record<string, unknown>;
        }) => {
          shouldContinuePolling = false;
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsPollingVerification(false);
          dispatch(resetOnboardingState());
          navigation.reset({
            index: 0,
            routes: [route],
          });
        };

        const pollVerificationState = async (): Promise<void> => {
          if (!sdk) {
            // No SDK available, redirect to Card Home
            stopPollingAndNavigate({ name: Routes.CARD.HOME });
            return;
          }

          try {
            const userDetails = await sdk.getUserDetails();
            const currentVerificationState = userDetails.verificationState;
            // Update user in context with fresh data
            setUser(userDetails);

            if (currentVerificationState === 'VERIFIED') {
              // KYC verified - proceed to SpendingLimit
              stopPollingAndNavigate({
                name: Routes.CARD.SPENDING_LIMIT,
                params: { flow: 'onboarding' },
              });
            } else if (currentVerificationState === 'REJECTED') {
              // KYC rejected - show failure screen
              stopPollingAndNavigate({
                name: Routes.CARD.ONBOARDING.ROOT,
                params: { screen: Routes.CARD.ONBOARDING.KYC_FAILED },
              });
            }
            // For PENDING or any other status, continue polling
            // The interval will trigger the next poll
          } catch (fetchError) {
            Logger.log(
              'PhysicalAddress: Failed to fetch user details for KYC status',
              fetchError,
            );
            // On error, redirect to Card Home to avoid stuck state
            stopPollingAndNavigate({ name: Routes.CARD.HOME });
          }
        };

        // Execute first poll immediately
        await pollVerificationState();

        // Only set up interval if we should continue polling (not already navigated)
        if (shouldContinuePolling) {
          pollingIntervalRef.current = setInterval(() => {
            pollVerificationState();
          }, VERIFICATION_POLLING_INTERVAL_MS);

          // Set a timeout to stop polling after a reasonable time and redirect to Card Home
          // This prevents infinite polling if the status never changes
          setTimeout(() => {
            if (pollingIntervalRef.current) {
              stopPollingAndNavigate({ name: Routes.CARD.HOME });
            }
          }, VERIFICATION_POLLING_INTERVAL_MS * 2); // Poll 2 times max (6 seconds total)
        }

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
      {/* Electronic Consent (US only) */}
      {selectedCountry?.key === 'US' && (
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
      )}
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
        loading={registerLoading || isPollingVerification}
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
