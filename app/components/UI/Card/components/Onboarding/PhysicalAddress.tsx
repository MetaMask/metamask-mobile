import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  navigateWithDetails,
  resetWithRoutes,
} from '../../../../../util/navigation/navUtils';
import {
  HelpText,
  HelpTextSeverity,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  Checkbox,
  TextField,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import SelectField from './SelectField';
import CardFormField from './CardFormField';
import type { ShippingAddress } from '../../Views/ReviewOrder';
import useRegisterPhysicalAddress from '../../hooks/useRegisterPhysicalAddress';
import { useDispatch, useSelector } from 'react-redux';
import {
  resetOnboardingState,
  selectConsentSetId,
  selectOnboardingId,
  setConsentSetId,
} from '../../../../../core/redux/slices/card';
import { selectMetalCardCheckoutFeatureFlag } from '../../../../../selectors/featureFlagController/card';
import useRegisterUserConsent from '../../hooks/useRegisterUserConsent';
import { CardError, type Region } from '../../types';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import useRegions from '../../hooks/useRegions';
import { storeCardBaanxToken } from '../../util/cardTokenVault';
import Engine from '../../../../../core/Engine';
import { mapCountryToLocation } from '../../util/mapCountryToLocation';
import { extractTokenExpiration } from '../../util/extractTokenExpiration';
import { useCardSDK } from '../../sdk';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import Logger from '../../../../../util/Logger';
import { Linking } from 'react-native';
import {
  clearOnValueChange,
  createRegionSelectorModalNavigationDetails,
  setOnValueChange,
} from './RegionSelectorModal';
import { countryCodeToFlag } from '../../util/countryCodeToFlag';
import { COINME_TERMS_URL, CRB_PRIVACY_POLICY_URL } from '../../constants';
import { getCardUsDisclosureUrls } from '../../util/registrationSettings';

const VERIFICATION_POLLING_INTERVAL_MS = 3000;
const VERIFICATION_POLLING_TIMEOUT_MS = 6000;

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
  selectedCountry,
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
  selectedCountry: Region | null;
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { data: registrationSettings } = useRegistrationSettings();

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
    navigateWithDetails(
      navigation,
      createRegionSelectorModalNavigationDetails({
        regions,
      }),
    );
  }, [handleStateChange, navigation, regions]);

  return (
    <>
      {/* Address Line 1 */}
      <CardFormField
        label={strings(
          'card.card_onboarding.physical_address.address_line_1_label',
        )}
      >
        <TextField
          onChangeText={handleAddressLine1Change}
          value={addressLine1}
          inputProps={{
            autoCapitalize: 'none',
            numberOfLines: 1,
            autoComplete: 'one-time-code',
            keyboardType: 'default',
            maxLength: 255,
            accessibilityLabel: strings(
              'card.card_onboarding.physical_address.address_line_1_label',
            ),
            testID: 'address-line-1-input',
          }}
        />
      </CardFormField>
      {/* Address Line 2 */}
      <CardFormField
        label={strings(
          'card.card_onboarding.physical_address.address_line_2_label',
        )}
      >
        <TextField
          onChangeText={handleAddressLine2Change}
          value={addressLine2}
          inputProps={{
            autoCapitalize: 'none',
            numberOfLines: 1,
            autoComplete: 'one-time-code',
            keyboardType: 'default',
            maxLength: 255,
            accessibilityLabel: strings(
              'card.card_onboarding.physical_address.address_line_2_label',
            ),
            testID: 'address-line-2-input',
          }}
        />
      </CardFormField>
      {/* City */}
      <CardFormField
        label={strings('card.card_onboarding.physical_address.city_label')}
      >
        <TextField
          onChangeText={handleCityChange}
          value={city}
          inputProps={{
            autoCapitalize: 'none',
            numberOfLines: 1,
            autoComplete: 'one-time-code',
            keyboardType: 'default',
            maxLength: 255,
            accessibilityLabel: strings(
              'card.card_onboarding.physical_address.city_label',
            ),
            testID: 'city-input',
          }}
        />
      </CardFormField>
      {/* State */}
      {selectedCountry?.key === 'US' && (
        <CardFormField
          label={strings('card.card_onboarding.physical_address.state_label')}
        >
          <SelectField
            value={state}
            placeholder={strings(
              'card.card_onboarding.physical_address.state_placeholder',
            )}
            onPress={handleStateSelect}
            testID="state-select"
            accessibilityLabel={`${strings(
              'card.card_onboarding.physical_address.state_label',
            )}, ${
              state ||
              strings('card.card_onboarding.physical_address.state_placeholder')
            }`}
          />
        </CardFormField>
      )}
      {/* ZIP Code */}
      <CardFormField
        label={strings('card.card_onboarding.physical_address.zip_code_label')}
      >
        <TextField
          onChangeText={handleZipCodeChange}
          value={zipCode}
          inputProps={{
            autoCapitalize: 'none',
            numberOfLines: 1,
            autoComplete: 'one-time-code',
            keyboardType: 'default',
            maxLength: 255,
            accessibilityLabel: strings(
              'card.card_onboarding.physical_address.zip_code_label',
            ),
            testID: 'zip-code-input',
          }}
        />
      </CardFormField>
      {/* Country (read-only) */}
      <CardFormField
        label={strings('card.card_onboarding.physical_address.country_label')}
      >
        <SelectField value={selectedCountry?.name} />
      </CardFormField>
    </>
  );
};

const PhysicalAddress = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const { user, setUser, sdk } = useCardSDK();
  const onboardingId = useSelector(selectOnboardingId);
  const existingConsentSetId = useSelector(selectConsentSetId);
  const isMetalCardCheckoutEnabled = useSelector(
    selectMetalCardCheckoutFeatureFlag,
  );
  const { userCountry: selectedCountry } = useRegions();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [electronicConsent, setElectronicConsent] = useState(false);
  const [coinmeConsent, setCoinmeConsent] = useState(false);
  const [crbConsent, setCrbConsent] = useState(false);
  const [isPollingVerification, setIsPollingVerification] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const { data: registrationSettings } = useRegistrationSettings();

  // Cleanup polling timers on unmount
  useEffect(
    () => () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    },
    [],
  );

  // If user data is available, set the state values
  useEffect(() => {
    if (user) {
      setAddressLine1(user.addressLine1 || '');
      setAddressLine2(user.addressLine2 || '');
      setCity(user.city || '');
      setState(user.usState || '');
      setZipCode(user.zip || '');
    }
  }, [user]);

  const {
    eSignConsentDisclosureUSUrl,
    crbTermsUrl,
    crbAccountOpeningUrl,
    crbNoticeOfPrivacyUrl,
  } = useMemo(
    () => getCardUsDisclosureUrls(registrationSettings),
    [registrationSettings],
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

  const openCoinmeTerms = useCallback(() => {
    if (COINME_TERMS_URL) {
      Linking.openURL(COINME_TERMS_URL);
    }
  }, []);

  const openCrbTerms = useCallback(() => {
    if (crbTermsUrl) {
      Linking.openURL(crbTermsUrl);
    }
  }, [crbTermsUrl]);

  const openCrbAccountOpening = useCallback(() => {
    if (crbAccountOpeningUrl) {
      Linking.openURL(crbAccountOpeningUrl);
    }
  }, [crbAccountOpeningUrl]);

  const openCrbPrivacyNotice = useCallback(() => {
    if (crbNoticeOfPrivacyUrl) {
      Linking.openURL(crbNoticeOfPrivacyUrl);
    }
  }, [crbNoticeOfPrivacyUrl]);

  const openCrbPrivacyPolicy = useCallback(() => {
    if (CRB_PRIVACY_POLICY_URL) {
      Linking.openURL(CRB_PRIVACY_POLICY_URL);
    }
  }, []);

  const handleAddressLine1Change = useCallback(
    (text: string) => {
      resetRegisterAddress();
      resetConsent();
      setAddressLine1(text);
    },
    [resetRegisterAddress, resetConsent],
  );

  const handleAddressLine2Change = useCallback(
    (text: string) => {
      resetRegisterAddress();
      resetConsent();
      setAddressLine2(text);
    },
    [resetRegisterAddress, resetConsent],
  );

  const handleCityChange = useCallback(
    (text: string) => {
      resetRegisterAddress();
      resetConsent();
      setCity(text);
    },
    [resetRegisterAddress, resetConsent],
  );

  const handleStateChange = useCallback(
    (text: string) => {
      resetRegisterAddress();
      resetConsent();
      setState(text);
    },
    [resetRegisterAddress, resetConsent],
  );

  const handleZipCodeChange = useCallback(
    (text: string) => {
      resetRegisterAddress();
      resetConsent();
      setZipCode(text);
    },
    [resetRegisterAddress, resetConsent],
  );

  const handleElectronicConsentToggle = useCallback(() => {
    resetConsent();
    resetRegisterAddress();
    setElectronicConsent(!electronicConsent);
  }, [electronicConsent, resetRegisterAddress, resetConsent]);

  const handleCoinmeConsentToggle = useCallback(() => {
    resetConsent();
    resetRegisterAddress();
    setCoinmeConsent(!coinmeConsent);
  }, [coinmeConsent, resetRegisterAddress, resetConsent]);

  const handleCrbConsentToggle = useCallback(() => {
    resetConsent();
    resetRegisterAddress();
    setCrbConsent(!crbConsent);
  }, [crbConsent, resetRegisterAddress, resetConsent]);

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
      (!electronicConsent && selectedCountry?.key === 'US') ||
      (!coinmeConsent && selectedCountry?.key === 'US') ||
      (!crbConsent && selectedCountry?.key === 'US'),
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
      coinmeConsent,
      crbConsent,
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
      (!electronicConsent && selectedCountry?.key === 'US') ||
      (!coinmeConsent && selectedCountry?.key === 'US') ||
      (!crbConsent && selectedCountry?.key === 'US')
    ) {
      return;
    }

    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Baanx, {
              action: CardActions.RESIDENTIAL_ADDRESS_BUTTON,
            }),
          )
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
          await Engine.context.CardController.syncSessionAfterExternalAuth().catch(
            () => undefined,
          );
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
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
          }
          if (!isMountedRef.current) {
            return;
          }
          setIsPollingVerification(false);
          dispatch(resetOnboardingState());
          resetWithRoutes(navigation, {
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
              if (location === 'us' && isMetalCardCheckoutEnabled) {
                const shippingAddress: ShippingAddress = {
                  line1: addressLine1,
                  line2: addressLine2 || undefined,
                  city,
                  state,
                  zip: zipCode,
                };
                stopPollingAndNavigate({
                  name: Routes.CARD.CHOOSE_YOUR_CARD,
                  params: { flow: 'onboarding', shippingAddress },
                });
              } else {
                stopPollingAndNavigate({
                  name: Routes.CARD.SPENDING_LIMIT,
                  params: { flow: 'onboarding' },
                });
              }
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

          pollingTimeoutRef.current = setTimeout(() => {
            if (pollingIntervalRef.current) {
              stopPollingAndNavigate({ name: Routes.CARD.HOME });
            }
          }, VERIFICATION_POLLING_TIMEOUT_MS);
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
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            screen: CardScreens.RESIDENTIAL_ADDRESS,
          }),
        )
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
        selectedCountry={selectedCountry}
      />
      {/* Electronic Consent (US only) */}
      {selectedCountry?.key === 'US' && (
        <Checkbox
          isSelected={electronicConsent}
          onChange={handleElectronicConsentToggle}
          label={
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              // A node label skips Checkbox's string-label ml-3, so mirror it.
              twClassName="ml-3 flex-1"
            >
              {strings(
                'card.card_onboarding.physical_address.electronic_consent_1',
              )}
              <TextButton
                variant={TextVariant.BodySm}
                onPress={openESignConsentDisclosureUS}
              >
                {strings(
                  'card.card_onboarding.physical_address.electronic_consent_2',
                )}
              </TextButton>
              {strings(
                'card.card_onboarding.physical_address.electronic_consent_3',
              )}
            </Text>
          }
          // Top-align the box with multi-line legal copy (DS gap: Checkbox has
          // no top-align option).
          twClassName="items-start"
          testID="physical-address-electronic-consent-checkbox"
        />
      )}
      {/* Coinme Terms Consent (US only) */}
      {selectedCountry?.key === 'US' && (
        <Checkbox
          isSelected={coinmeConsent}
          onChange={handleCoinmeConsentToggle}
          label={
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              // A node label skips Checkbox's string-label ml-3, so mirror it.
              twClassName="ml-3 flex-1"
            >
              {strings(
                'card.card_onboarding.physical_address.coinme_terms_consent_1',
              )}
              <TextButton
                variant={TextVariant.BodySm}
                onPress={openCoinmeTerms}
              >
                {strings(
                  'card.card_onboarding.physical_address.coinme_terms_consent_2',
                )}
              </TextButton>
              {strings(
                'card.card_onboarding.physical_address.coinme_terms_consent_3',
              )}
            </Text>
          }
          // Top-align the box with multi-line legal copy (DS gap: Checkbox has
          // no top-align option).
          twClassName="items-start"
          testID="physical-address-coinme-terms-checkbox"
        />
      )}
      {/* CRB Consent (US only) */}
      {selectedCountry?.key === 'US' && (
        <Checkbox
          isSelected={crbConsent}
          onChange={handleCrbConsentToggle}
          label={
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              // A node label skips Checkbox's string-label ml-3, so mirror it.
              twClassName="ml-3 flex-1"
            >
              {strings('card.card_onboarding.physical_address.crb_consent_1')}
              <TextButton variant={TextVariant.BodySm} onPress={openCrbTerms}>
                {strings('card.card_onboarding.physical_address.crb_consent_2')}
              </TextButton>
              {strings('card.card_onboarding.physical_address.crb_consent_3')}
              <TextButton
                variant={TextVariant.BodySm}
                onPress={openCrbAccountOpening}
              >
                {strings('card.card_onboarding.physical_address.crb_consent_4')}
              </TextButton>
              {strings('card.card_onboarding.physical_address.crb_consent_5')}
              <TextButton
                variant={TextVariant.BodySm}
                onPress={openCrbPrivacyNotice}
              >
                {strings('card.card_onboarding.physical_address.crb_consent_6')}
              </TextButton>
              {strings('card.card_onboarding.physical_address.crb_consent_7')}
              <TextButton
                variant={TextVariant.BodySm}
                onPress={openCrbPrivacyPolicy}
              >
                {strings('card.card_onboarding.physical_address.crb_consent_8')}
              </TextButton>
              {strings('card.card_onboarding.physical_address.crb_consent_9')}
            </Text>
          }
          // Top-align the box with multi-line legal copy (DS gap: Checkbox has
          // no top-align option).
          twClassName="items-start"
          testID="physical-address-crb-consent-checkbox"
        />
      )}
      {registerIsError ? (
        <HelpText
          severity={HelpTextSeverity.Danger}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="physical-address-register-error"
        >
          {registerError}
        </HelpText>
      ) : consentIsError ? (
        <HelpText
          severity={HelpTextSeverity.Danger}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          testID="physical-address-consent-error"
        >
          {consentError}
        </HelpText>
      ) : null}
    </>
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.physical_address.title')}
      description={strings('card.card_onboarding.physical_address.description')}
      formFields={renderFormFields()}
      primaryButtonProps={{
        children: strings('card.card_onboarding.continue_button'),
        onPress: handleContinue,
        isDisabled,
        isLoading: registerLoading || isPollingVerification,
        testID: 'physical-address-continue-button',
      }}
      headerMode="close-with-confirmation"
    />
  );
};

export default PhysicalAddress;
