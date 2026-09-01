import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../../../util/navigation/navUtils';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
  Icon,
  IconSize,
  IconName,
  Label,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import TextField from '../../../../../component-library/components/Form/TextField';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import { validateEmail } from '../../../Ramp/utils/depositUtils';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import useEmailVerificationSend from '../../hooks/useEmailVerificationSend';
import useRegions from '../../hooks/useRegions';
import { setContactVerificationId } from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { validatePassword } from '../../util/validatePassword';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { useAccountGroupName } from '../../../../hooks/multichainAccounts/useAccountGroupName';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';
import { safeToChecksumAddress } from '../../../../../util/address';
import { useImmersveResumeOnboarding } from '../../hooks/useImmersveResumeOnboarding';
import { getCardProviderErrorMessage } from '../../util/getCardProviderErrorMessage';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardScreens,
  withCardProvider,
} from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import {
  clearOnValueChange,
  createRegionSelectorModalNavigationDetails,
  setOnValueChange,
} from './RegionSelectorModal';
import SelectField from './SelectField';
import { mapCountryToLocation } from '../../util/mapCountryToLocation';
import type { Region } from '../../types';
import { selectGeolocationLocation } from '../../../../../selectors/geolocationController';
import {
  selectCardImmersveCountries,
  selectCardImmersveEnabled,
} from '../../../../../selectors/featureFlagController/card';
import { HUBSPOT_WAITLIST_URL } from '../../constants';
import { useCardPostAuthRedirect } from '../../hooks/useCardPostAuthRedirect';
import useImmersveSupportedRegions from '../../hooks/useImmersveSupportedRegions';
import ImmersveLegalClickwrap from './ImmersveLegalClickwrap';
import { useCardSDK } from '../../sdk';
import type { CardOnboardingStackParamList } from '../../types/navigation';
import Logger from '../../../../../util/Logger';

const UK_MIGRATION_COUNTRY_CODE = 'GB';

const buildWaitlistUrl = (countryName: string, email?: string): string => {
  // country must come first per HubSpot field ordering
  let query = `country=${encodeURIComponent(countryName)}`;
  if (email) query += `&email=${encodeURIComponent(email)}`;
  return `${HUBSPOT_WAITLIST_URL}?${query}`;
};

const normalizeCallingCode = (code: string | null | undefined): string =>
  (code ?? '').replace(/\D/g, '');

const matchPhoneRegionByCallingCode = (
  callingCode: string,
  allRegions: Region[],
  getRegionByCode: (code: string | null | undefined) => Region | null,
  options: {
    fromMigration: boolean;
    selectedCountryKey?: string;
  },
): Region | null => {
  if (!callingCode) {
    return null;
  }

  const preferredCountryKey = options.fromMigration
    ? UK_MIGRATION_COUNTRY_CODE
    : options.selectedCountryKey;

  if (preferredCountryKey) {
    const preferredRegion = getRegionByCode(preferredCountryKey);
    if (preferredRegion?.areaCode === callingCode) {
      return preferredRegion;
    }
  }

  return allRegions.find((region) => region.areaCode === callingCode) ?? null;
};

const SignUp = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<CardOnboardingStackParamList, 'CardOnboardingSignUp'>>();
  const fromMigration = Boolean(route.params?.fromMigration);
  const dispatch = useDispatch();
  const { sdk } = useCardSDK();
  const [email, setEmail] = useState('');
  const [isEmailError, setIsEmailError] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordError, setIsPasswordError] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Region | null>(null);
  const hasAutoSelectedCountry = useRef(false);
  const hasPrefillAttempted = useRef(false);
  const hasUserEditedEmail = useRef(false);
  const hasUserEditedPhoneNumber = useRef(false);
  const hasUserEditedPhoneRegion = useRef(false);
  const geoLocation = useSelector(selectGeolocationLocation);
  const immersveCountries = useSelector(selectCardImmersveCountries);
  const immersveOnboardingEnabled = useSelector(selectCardImmersveEnabled);
  const {
    allRegions,
    getRegionByCode,
    isLoading: isLoadingRegistrationSettings,
  } = useRegions();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const postAuthRedirect = useCardPostAuthRedirect();

  // Immersve onboarding entry: SIWE binds to the currently-selected EVM account.
  const accountName = useAccountGroupName();
  const selectAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const immersveAddress = safeToChecksumAddress(
    selectAccountByScope('eip155:0')?.address,
  );
  const resumeImmersveOnboarding = useImmersveResumeOnboarding();
  const [isImmersveSubmitting, setIsImmersveSubmitting] = useState(false);
  const [immersveError, setImmersveError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneRegion, setPhoneRegion] = useState<Region | null>(null);
  const [isPhoneNumberError, setIsPhoneNumberError] = useState(false);
  const debouncedPhoneNumber = useDebouncedValue(phoneNumber, 1000);

  const handleAlreadyHaveAccountPress = useCallback(() => {
    if (postAuthRedirect) {
      navigation.navigate(Routes.CARD.AUTHENTICATION, { postAuthRedirect });
      return;
    }
    navigation.navigate(Routes.CARD.AUTHENTICATION);
  }, [navigation, postAuthRedirect]);

  const {
    sendEmailVerification,
    isLoading: emailVerificationIsLoading,
    isError: emailVerificationIsError,
    error: emailVerificationError,
    reset: resetEmailVerificationSend,
  } = useEmailVerificationSend();

  const debouncedEmail = useDebouncedValue(email, 1000);
  const debouncedPassword = useDebouncedValue(password, 1000);

  useEffect(() => {
    if (!allRegions.length) {
      return;
    }

    // Run at most once: prevents a background re-fetch of registrationSettings
    // (which produces a new getRegionByCode reference) from overwriting the
    // user's manual country selection.
    if (hasAutoSelectedCountry.current) {
      return;
    }

    if (fromMigration) {
      const ukRegion = getRegionByCode(UK_MIGRATION_COUNTRY_CODE);
      if (!ukRegion) {
        return;
      }
      // Local UI only — do not call setSelectedCountry here. That would switch
      // the active provider / clear Baanx before the user confirms with Next.
      hasAutoSelectedCountry.current = true;
      setSelectedCountry(ukRegion);
      setPhoneRegion(ukRegion);
      return;
    }

    if (geoLocation === 'UNKNOWN') {
      return;
    }

    const matchedRegion = getRegionByCode(geoLocation);

    if (matchedRegion) {
      hasAutoSelectedCountry.current = true;
      setSelectedCountry(matchedRegion);
      setPhoneRegion(matchedRegion);
      Engine.context.CardController.setUserLocation(
        mapCountryToLocation(matchedRegion.key),
      );
      Engine.context.CardController.setSelectedCountry(matchedRegion.key);
    }
  }, [allRegions.length, fromMigration, geoLocation, getRegionByCode]);

  useEffect(() => {
    if (!fromMigration) {
      return;
    }
    hasUserEditedEmail.current = false;
    hasUserEditedPhoneNumber.current = false;
    hasUserEditedPhoneRegion.current = false;
    hasPrefillAttempted.current = false;
  }, [fromMigration]);

  // Best-effort contact prefill for UK migration while Baanx is still active.
  useEffect(() => {
    if (
      !fromMigration ||
      !sdk ||
      !allRegions.length ||
      hasPrefillAttempted.current
    ) {
      return;
    }

    let cancelled = false;
    sdk
      .getUserDetails()
      .then((user) => {
        if (cancelled || hasPrefillAttempted.current) {
          return;
        }
        hasPrefillAttempted.current = true;
        if (user.email && !hasUserEditedEmail.current) {
          setEmail(user.email);
        }
        if (user.phoneNumber && !hasUserEditedPhoneNumber.current) {
          setPhoneNumber(user.phoneNumber.replace(/\D/g, ''));
        }
        const callingCode = normalizeCallingCode(user.phoneCountryCode);
        if (
          user.phoneNumber &&
          !hasUserEditedPhoneNumber.current &&
          !hasUserEditedPhoneRegion.current &&
          callingCode &&
          allRegions.length
        ) {
          const matchedPhoneRegion = matchPhoneRegionByCallingCode(
            callingCode,
            allRegions,
            getRegionByCode,
            {
              fromMigration,
              selectedCountryKey: selectedCountry?.key,
            },
          );
          if (matchedPhoneRegion) {
            setPhoneRegion(matchedPhoneRegion);
          }
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        hasPrefillAttempted.current = true;
        Logger.error(error as Error, {
          tags: { feature: 'card' },
          context: {
            name: 'SignUp',
            data: { method: 'fromMigrationPrefill' },
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [allRegions, fromMigration, sdk, getRegionByCode, selectedCountry?.key]);

  useEffect(() => {
    if (!debouncedEmail) {
      return;
    }
    const isValid = validateEmail(debouncedEmail);
    setIsEmailError(!isValid);
    setIsEmailValid(isValid);
  }, [debouncedEmail]);

  useEffect(() => {
    if (!debouncedPassword) {
      return;
    }
    const isValid = validatePassword(debouncedPassword);
    setIsPasswordError(!isValid);
    setIsPasswordValid(isValid);
  }, [debouncedPassword]);

  useEffect(() => {
    if (!debouncedPhoneNumber) {
      setIsPhoneNumberError(false);
      return;
    }
    setIsPhoneNumberError(!/^\d{4,15}$/.test(debouncedPhoneNumber));
  }, [debouncedPhoneNumber]);

  const isImmersveCountry = Boolean(
    immersveOnboardingEnabled &&
      selectedCountry &&
      immersveCountries.includes(selectedCountry.key),
  );

  const lastTrackedSignUpView = useRef<string | null>(null);
  useEffect(() => {
    // Wait until country is known so Immersve (e.g. GB) is not stamped as Baanx.
    // Re-fire when provider changes (e.g. geo auto-select then user switches country).
    if (!selectedCountry) {
      return;
    }
    const provider = isImmersveCountry
      ? CardProviderIds.Immersve
      : CardProviderIds.Baanx;
    const viewKey = `${CardScreens.SIGN_UP}:${provider}`;
    if (lastTrackedSignUpView.current === viewKey) {
      return;
    }
    lastTrackedSignUpView.current = viewKey;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(provider, {
            screen: CardScreens.SIGN_UP,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder, selectedCountry, isImmersveCountry]);

  const {
    onboardingDocuments,
    isLoading: isLegalDocsLoading,
    error: legalDocsError,
    refetch: refetchLegalDocs,
  } = useImmersveSupportedRegions(
    isImmersveCountry ? selectedCountry?.key : undefined,
  );

  const isWaitlistMode = Boolean(
    selectedCountry && !selectedCountry.canSignUp && !isImmersveCountry,
  );

  const isPhoneValid = Boolean(
    phoneNumber && phoneRegion?.areaCode && /^\d{4,15}$/.test(phoneNumber),
  );

  const isDisabled = useMemo(() => {
    if (isWaitlistMode) {
      return false;
    }
    if (isImmersveCountry) {
      // Email + phone are collected; SIWE binds to the selected account.
      // Legal docs must be loaded before Continue (clickwrap agreement).
      return (
        !email ||
        !isPhoneValid ||
        !immersveAddress ||
        isImmersveSubmitting ||
        isLegalDocsLoading ||
        Boolean(legalDocsError) ||
        onboardingDocuments.length === 0
      );
    }
    return (
      !email ||
      !password ||
      !selectedCountry ||
      !isEmailValid ||
      !isPasswordValid ||
      emailVerificationIsError ||
      emailVerificationIsLoading
    );
  }, [
    isWaitlistMode,
    isImmersveCountry,
    immersveAddress,
    isImmersveSubmitting,
    isLegalDocsLoading,
    legalDocsError,
    onboardingDocuments.length,
    email,
    isPhoneValid,
    password,
    selectedCountry,
    isEmailValid,
    isPasswordValid,
    emailVerificationIsError,
    emailVerificationIsLoading,
  ]);

  const openAccountSelector = useCallback(() => {
    navigateWithDetails(
      navigation,
      createAccountSelectorNavDetails({
        isEvmOnly: true,
        isSelectOnly: true,
        disableAddAccountButton: true,
      }),
    );
  }, [navigation]);

  const handleImmersveContinue = useCallback(async () => {
    if (
      !immersveAddress ||
      !selectedCountry ||
      !email ||
      !phoneNumber ||
      !phoneRegion?.areaCode
    ) {
      return;
    }
    if (!/^\d{4,15}$/.test(phoneNumber)) {
      setIsPhoneNumberError(true);
      return;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.SIGN_UP_BUTTON,
          }),
        )
        .build(),
    );
    setImmersveError(null);
    setIsImmersveSubmitting(true);
    try {
      // Clear Baanx while it is still the active provider, then continue as
      // a new Immersve user (setSelectedCountry + SIWE happen in resume).
      if (fromMigration) {
        await Engine.context.CardController.logout();
      }
      await resumeImmersveOnboarding({
        country: selectedCountry.key,
        address: immersveAddress,
        email,
        phone: `+${phoneRegion.areaCode}${phoneNumber}`,
        entrypoint: CardEntryPoint.SIGN_UP,
      });
    } catch (e) {
      setImmersveError(getCardProviderErrorMessage(e));
    } finally {
      setIsImmersveSubmitting(false);
    }
  }, [
    immersveAddress,
    selectedCountry,
    email,
    phoneNumber,
    phoneRegion?.areaCode,
    fromMigration,
    resumeImmersveOnboarding,
    trackEvent,
    createEventBuilder,
  ]);

  const handleJoinWaitlist = useCallback(() => {
    if (!selectedCountry) return;
    navigation.navigate(Routes.CARD.MODALS.ID, {
      screen: Routes.CARD.MODALS.WAITLIST_FORM,
      params: {
        url: buildWaitlistUrl(selectedCountry.name, email || undefined),
      },
    });
  }, [selectedCountry, email, navigation]);

  const handleEmailChange = useCallback(
    (emailText: string) => {
      if (fromMigration) {
        hasUserEditedEmail.current = true;
      }
      resetEmailVerificationSend();
      setEmail(emailText);
    },
    [fromMigration, resetEmailVerificationSend],
  );

  const handlePasswordChange = useCallback(
    (passwordText: string) => {
      resetEmailVerificationSend();
      setPassword(passwordText);
    },
    [resetEmailVerificationSend],
  );

  const handleContinue = useCallback(async () => {
    // Use actual values, not debounced ones
    if (!email || !password || !selectedCountry) {
      return;
    }

    const isCurrentEmailValid = validateEmail(email);
    const isCurrentPasswordValid = validatePassword(password);

    if (!isCurrentEmailValid || !isCurrentPasswordValid) {
      // Set error states
      setIsEmailError(!isCurrentEmailValid);
      setIsPasswordError(!isCurrentPasswordValid);
      return;
    }

    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Baanx, {
              action: CardActions.SIGN_UP_BUTTON,
            }),
          )
          .build(),
      );
      const { contactVerificationId } = await sendEmailVerification(email);

      dispatch(setContactVerificationId(contactVerificationId));

      if (contactVerificationId) {
        navigation.navigate(Routes.CARD.ONBOARDING.CONFIRM_EMAIL, {
          email,
          password,
          countryKey: selectedCountry.key,
        });
      } else {
        // If no contactVerificationId, assume user is registered or email not valid
        setIsEmailError(true);
      }
    } catch {
      // Allow error message to display
    }
  }, [
    email,
    password,
    trackEvent,
    createEventBuilder,
    sendEmailVerification,
    dispatch,
    navigation,
    selectedCountry,
  ]);

  const handleCountrySelect = useCallback(() => {
    if (fromMigration || isLoadingRegistrationSettings) return;
    resetEmailVerificationSend();
    setOnValueChange((region) => {
      setSelectedCountry(region);
      setPhoneRegion(region);
      Engine.context.CardController.setUserLocation(
        mapCountryToLocation(region.key),
      );
      Engine.context.CardController.setSelectedCountry(region.key);
    });

    navigateWithDetails(
      navigation,
      createRegionSelectorModalNavigationDetails({
        regions: allRegions,
        selectedRegionKey: selectedCountry?.key ?? null,
      }),
    );
  }, [
    fromMigration,
    navigation,
    allRegions,
    selectedCountry?.key,
    resetEmailVerificationSend,
    isLoadingRegistrationSettings,
  ]);

  const handlePhoneRegionSelect = useCallback(() => {
    setOnValueChange((region) => {
      if (fromMigration) {
        hasUserEditedPhoneRegion.current = true;
      }
      setPhoneRegion(region);
    });

    navigateWithDetails(
      navigation,
      createRegionSelectorModalNavigationDetails({
        regions: allRegions,
        renderAreaCode: true,
        selectedRegionKey: phoneRegion?.key ?? selectedCountry?.key ?? null,
      }),
    );
  }, [
    fromMigration,
    navigation,
    allRegions,
    phoneRegion?.key,
    selectedCountry?.key,
  ]);

  const handlePhoneNumberChange = useCallback(
    (text: string) => {
      if (fromMigration) {
        hasUserEditedPhoneNumber.current = true;
      }
      setPhoneNumber(text.replace(/\D/g, ''));
    },
    [fromMigration],
  );

  useEffect(() => () => clearOnValueChange(), []);

  const renderFormFields = () => (
    <>
      <Box>
        <Label>{strings('card.card_onboarding.sign_up.country_label')}</Label>
        {isLoadingRegistrationSettings && !selectedCountry ? (
          <Box
            twClassName="flex-row items-center justify-center h-12 rounded-xl border border-solid border-border-muted bg-background-muted"
            testID="signup-country-loading"
          >
            <ActivityIndicator size="small" />
          </Box>
        ) : (
          <SelectField
            value={selectedCountry?.name}
            onPress={handleCountrySelect}
            isDisabled={fromMigration || isLoadingRegistrationSettings}
            testID="signup-country-select"
          />
        )}
        {isWaitlistMode && (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-text-alternative mt-1"
            testID="signup-country-not-available-text"
          >
            {strings('card.card_onboarding.sign_up.country_not_available')}
          </Text>
        )}
      </Box>

      <Box>
        <Label>{strings('card.card_onboarding.sign_up.email_label')}</Label>
        <TextField
          autoCapitalize={'none'}
          autoComplete="one-time-code"
          onChangeText={handleEmailChange}
          numberOfLines={1}
          value={email}
          keyboardType="email-address"
          maxLength={255}
          accessibilityLabel={strings(
            'card.card_onboarding.sign_up.email_label',
          )}
          isError={
            !isImmersveCountry && debouncedEmail.length > 0 && isEmailError
          }
          testID="signup-email-input"
        />
        {isImmersveCountry ? null : email.length > 0 &&
          emailVerificationIsError ? (
          <Text
            testID="signup-email-error-text"
            variant={TextVariant.BodySm}
            twClassName="text-error-default"
          >
            {emailVerificationError}
          </Text>
        ) : isEmailError ? (
          <Text
            testID="signup-email-error-text"
            variant={TextVariant.BodySm}
            twClassName="text-error-default"
          >
            {strings('card.card_onboarding.sign_up.invalid_email')}
          </Text>
        ) : null}
      </Box>

      {isImmersveCountry && (
        <>
          <Box>
            <Label>
              {strings(
                'card.card_onboarding.set_phone_number.phone_number_label',
              )}
            </Label>
            <Box twClassName="flex flex-row items-center justify-center gap-2">
              <Box twClassName="w-26">
                <SelectField
                  value={`${phoneRegion?.emoji ?? ''} +${phoneRegion?.areaCode ?? ''}`}
                  onPress={handlePhoneRegionSelect}
                  hideIcon
                  testID="signup-immersve-phone-area-code-select"
                />
              </Box>
              <Box twClassName="flex-1">
                <TextField
                  autoCapitalize={'none'}
                  onChangeText={handlePhoneNumberChange}
                  numberOfLines={1}
                  autoComplete="one-time-code"
                  value={phoneNumber}
                  keyboardType="phone-pad"
                  maxLength={255}
                  accessibilityLabel={strings(
                    'card.card_onboarding.set_phone_number.phone_number_label',
                  )}
                  testID="signup-immersve-phone-number-input"
                  onSubmitEditing={handleImmersveContinue}
                  returnKeyType="done"
                />
              </Box>
            </Box>
            {isPhoneNumberError ? (
              <Text
                variant={TextVariant.BodySm}
                testID="signup-immersve-phone-number-error"
                twClassName="text-error-default"
              >
                {strings(
                  'card.card_onboarding.set_phone_number.invalid_phone_number',
                )}
              </Text>
            ) : null}
          </Box>
          <Box>
            <Label>
              {strings('card.card_onboarding.sign_up.account_label_immersve')}
            </Label>
            <SelectField
              value={accountName ?? undefined}
              onPress={openAccountSelector}
              testID="signup-immersve-account-select"
            />
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-text-alternative mt-1"
            >
              {strings(
                'card.card_onboarding.sign_up.account_description_immersve',
              )}
            </Text>
            {immersveError ? (
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-error-default mt-1"
                testID="signup-immersve-error-text"
              >
                {immersveError}
              </Text>
            ) : null}
          </Box>
        </>
      )}

      {!isWaitlistMode && !isImmersveCountry && (
        <Box>
          <Label>
            {strings('card.card_onboarding.sign_up.password_label')}
          </Label>
          <TextField
            autoCapitalize={'none'}
            onChangeText={handlePasswordChange}
            numberOfLines={1}
            value={password}
            maxLength={255}
            secureTextEntry={!isPasswordVisible}
            autoComplete="one-time-code"
            accessibilityLabel={strings(
              'card.card_onboarding.sign_up.password_label',
            )}
            isError={debouncedPassword.length > 0 && isPasswordError}
            testID="signup-password-input"
            endAccessory={
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                testID="signup-password-visibility-toggle"
              >
                <Icon
                  name={isPasswordVisible ? IconName.EyeSlash : IconName.Eye}
                  size={IconSize.Md}
                />
              </TouchableOpacity>
            }
          />
          {debouncedPassword.length > 0 && isPasswordError ? (
            <Text
              testID="signup-password-error-text"
              variant={TextVariant.BodySm}
              twClassName="text-error-default"
            >
              {strings('card.card_onboarding.sign_up.invalid_password')}
            </Text>
          ) : (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-text-alternative"
            >
              {strings('card.card_onboarding.sign_up.password_description')}
            </Text>
          )}
        </Box>
      )}
    </>
  );

  const renderActions = () => (
    <>
      {isImmersveCountry ? (
        <Box twClassName="mb-6">
          <ImmersveLegalClickwrap
            documents={onboardingDocuments}
            isLoading={isLegalDocsLoading}
            error={legalDocsError}
            treatEmptyAsError
            suffix={
              fromMigration
                ? strings(
                    'card.card_onboarding.sign_up.clickwrap_suffix_migration',
                  )
                : undefined
            }
            onRetry={() => {
              refetchLegalDocs().catch(() => undefined);
            }}
          />
        </Box>
      ) : null}
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={
          isImmersveCountry
            ? handleImmersveContinue
            : isWaitlistMode
              ? handleJoinWaitlist
              : handleContinue
        }
        isFullWidth
        isDisabled={isDisabled}
        isLoading={
          isImmersveCountry
            ? isImmersveSubmitting
            : !isWaitlistMode && emailVerificationIsLoading
        }
        testID="signup-continue-button"
      >
        {isWaitlistMode
          ? strings('card.card_onboarding.sign_up.join_waitlist')
          : strings('card.card_onboarding.continue_button')}
      </Button>
      {!fromMigration ? (
        <TouchableOpacity onPress={handleAlreadyHaveAccountPress}>
          <Text
            testID="signup-i-already-have-an-account-text"
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-default text-center p-4"
          >
            {strings(
              isImmersveCountry
                ? 'card.card_onboarding.sign_up.i_already_have_an_account_immersve'
                : 'card.card_onboarding.sign_up.i_already_have_an_account',
            )}
          </Text>
        </TouchableOpacity>
      ) : null}
    </>
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.sign_up.title')}
      description={strings(
        isImmersveCountry
          ? 'card.card_onboarding.sign_up.description_immersve'
          : 'card.card_onboarding.sign_up.description',
      )}
      formFields={renderFormFields()}
      actions={renderActions()}
      headerMode="back"
    />
  );
};

export default SignUp;
