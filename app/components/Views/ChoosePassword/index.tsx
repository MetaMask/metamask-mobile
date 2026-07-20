import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { TouchableOpacity, Platform, Keyboard, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { captureException } from '@sentry/react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  Button,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonVariant,
  ButtonSize,
  Label,
  TextField,
  Icon,
  IconName,
  IconSize,
  IconColor,
  Checkbox,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import StorageWrapper from '../../../store/storage-wrapper';
import { useDispatch, useSelector } from 'react-redux';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import {
  passwordSet as passwordSetAction,
  passwordUnset as passwordUnsetAction,
  seedphraseNotBackedUp,
} from '../../../actions/user';
import { setLockTime as setLockTimeAction } from '../../../actions/settings';
import Engine from '../../../core/Engine';
import OAuthLoginService from '../../../core/OAuthService/OAuthService';
import { passcodeType } from '../../../util/authentication';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import Logger from '../../../util/Logger';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../constants/navigation';
import {
  SEED_PHRASE_HINTS,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import {
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
} from '../../../util/password';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  AccountType,
  getSocialAccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../../constants/onboarding';
import type {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
} from '../../../core/Analytics/MetaMetrics.types';
import { Authentication } from '../../../core';
import type { AuthData } from '../../../core/Authentication/Authentication';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { ThemeContext } from '../../../util/theme';
import { ChoosePasswordSelectorsIDs } from './ChoosePassword.testIds';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import Routes from '../../../constants/navigation/Routes';
import { RESET_PASSWORD_GUIDE_URL } from '../../../constants/urls';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import FoxRiveLoaderAnimation, {
  type FoxRiveLoaderAnimationRef,
} from './FoxRiveLoaderAnimation/FoxRiveLoaderAnimation';
import {
  TraceName,
  endTrace,
  trace,
  TraceOperation,
  TraceContext,
} from '../../../util/trace';
import { uint8ArrayToMnemonic } from '../../../util/mnemonic';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { hasTestOverrides } from '../../../util/test/utils';
import { AccountImportStrategy } from '@metamask/keyring-controller';
import { setDataCollectionForMarketing } from '../../../actions/security';
import { getWalletSetupAttributionPropsFromStore } from '../../../util/analytics/walletSetupCompletedAttribution';
import { ChoosePasswordRouteParams } from './ChoosePassword.types';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import generateDeviceAnalyticsMetaData, {
  UserSettingsAnalyticsMetaData as generateUserSettingsAnalyticsMetaData,
} from '../../../util/metrics';
import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { selectGeolocationLocation } from '../../../selectors/geolocationController';
import { getDefaultMarketingOptInChecked } from '../../../util/onboarding/getDefaultMarketingOptInChecked';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { useOnboardingInterestQuestionnaireEligibility } from '../../../hooks/useOnboardingInterestQuestionnaireEligibility';

interface KeyringState {
  type: string;
  accounts: string[];
}

interface KeyringControllerState {
  keyrings: KeyringState[];
}

interface ExtendedKeyringController {
  state: KeyringControllerState;
  exportAccount: (
    credentials: { password: string },
    account: string,
  ) => Promise<string>;
  addNewAccount: () => Promise<void>;
  exportSeedPhrase: (credentials: { password: string }) => Promise<Uint8Array>;
  importAccountWithStrategy: (
    strategy: AccountImportStrategy,
    args: string[],
  ) => Promise<string>;
}

async function exportSimpleKeyPairAccounts(
  keyringController: ExtendedKeyringController,
  keychainPassword: string,
): Promise<string[]> {
  const simpleKeyrings = keyringController.state.keyrings.filter(
    (keyring) => keyring.type === 'Simple Key Pair',
  );
  const importedAccounts: string[] = [];
  for (const simpleKeyring of simpleKeyrings) {
    const simpleKeyringAccounts = await Promise.all(
      simpleKeyring.accounts.map((account) =>
        keyringController.exportAccount(
          { password: keychainPassword },
          account,
        ),
      ),
    );
    importedAccounts.push(...simpleKeyringAccounts);
  }
  return importedAccounts;
}

async function reimportPrivateKeyAccounts(
  keyringController: ExtendedKeyringController,
  importedAccounts: string[],
): Promise<void> {
  for (const importedAccount of importedAccounts) {
    await keyringController.importAccountWithStrategy(
      AccountImportStrategy.privateKey,
      [importedAccount],
    );
  }
}

const ChoosePassword = () => {
  const { themeAppearance } = useContext(ThemeContext);
  const tw = useTailwind();

  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: ChoosePasswordRouteParams }, 'params'>>();

  const dispatch = useDispatch();
  const metrics = useAnalytics();

  const isSocialLoginUser = route.params?.oauthLoginSuccess === true;
  const geoLocation = useSelector(selectGeolocationLocation);
  const hasKnownGeolocation =
    geoLocation != null && geoLocation !== UNKNOWN_LOCATION;
  const [isSelected, setIsSelected] = useState(false);
  const [marketingOptInTouched, setMarketingOptInTouched] = useState(false);
  const [resolvedGeolocationLocation, setResolvedGeolocationLocation] =
    useState<string | undefined>(hasKnownGeolocation ? geoLocation : undefined);
  const [isGeolocationResolved, setIsGeolocationResolved] = useState(
    !isSocialLoginUser || hasKnownGeolocation,
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordIndex, setShowPasswordIndex] = useState([0, 1]);
  const [biometryType, setBiometryType] = useState<string | null>(null);
  const [isPasswordFieldFocused, setIsPasswordFieldFocused] = useState(false);

  const passwordSetupAttemptTraceCtx = useRef<TraceContext | null>(null);
  const confirmPasswordInputRef = useRef<TextInput | null>(null);
  // Flag to know if password in keyring was set or not
  const keyringControllerPasswordSet = useRef(false);
  const foxRiveLoaderRef = useRef<FoxRiveLoaderAnimationRef>(null);

  const reduxAccountType = useSelector(selectOnboardingAccountType);
  const { shouldShowQuestionnaire } =
    useOnboardingInterestQuestionnaireEligibility();

  const getOauth2LoginSuccess = useCallback(
    () => route.params?.oauthLoginSuccess,
    [route.params?.oauthLoginSuccess],
  );

  useEffect(() => {
    if (!isSocialLoginUser) {
      return;
    }

    if (geoLocation && geoLocation !== UNKNOWN_LOCATION) {
      setResolvedGeolocationLocation(geoLocation);
      setIsGeolocationResolved(true);
      return;
    }

    let cancelled = false;
    setIsGeolocationResolved(false);

    Promise.resolve(
      Engine.context.GeolocationController?.refreshGeolocation?.(),
    )
      .then((location) => {
        if (!cancelled) {
          setResolvedGeolocationLocation(location);
          setIsGeolocationResolved(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedGeolocationLocation(undefined);
          setIsGeolocationResolved(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSocialLoginUser, geoLocation]);

  const marketingOptInChecked = useMemo(() => {
    if (isSocialLoginUser) {
      if (marketingOptInTouched) {
        return isSelected;
      }

      return getDefaultMarketingOptInChecked(true, resolvedGeolocationLocation);
    }

    return isSelected;
  }, [
    isSocialLoginUser,
    marketingOptInTouched,
    isSelected,
    resolvedGeolocationLocation,
  ]);

  const setSelection = useCallback(() => {
    setMarketingOptInTouched(true);
    setIsSelected((prev) => {
      if (!marketingOptInTouched) {
        const defaultChecked = isSocialLoginUser
          ? getDefaultMarketingOptInChecked(true, resolvedGeolocationLocation)
          : false;

        return !defaultChecked;
      }

      return !prev;
    });
  }, [marketingOptInTouched, isSocialLoginUser, resolvedGeolocationLocation]);

  const track = useCallback(
    (event: IMetaMetricsEvent | ITrackingEvent, properties?: JsonMap) => {
      const eventBuilder = AnalyticsEventBuilder.createEventBuilder(event);
      if (properties) {
        eventBuilder.addProperties(properties);
      }
      const builtEvent = eventBuilder.build();
      trackOnboarding(builtEvent, (arg: ITrackingEvent) =>
        dispatch(saveEvent([arg])),
      );
    },
    [dispatch],
  );

  const tryExportSeedPhrase = useCallback(async (pwd: string) => {
    const context = Engine.context;
    const uint8ArrayMnemonic = await context.KeyringController.exportSeedPhrase(
      { password: pwd },
    );
    return uint8ArrayToMnemonic(uint8ArrayMnemonic, wordlist).split(' ');
  }, []);

  const recreateVault = useCallback(
    async (pwd: string, authType?: AuthData) => {
      const context = Engine.context;
      const keyringController =
        context.KeyringController as unknown as ExtendedKeyringController;
      const keychainPassword = keyringControllerPasswordSet.current
        ? password
        : '';
      const seedPhraseUint8 = await context.KeyringController.exportSeedPhrase({
        password: keychainPassword,
      });
      const seedPhrase = uint8ArrayToMnemonic(seedPhraseUint8, wordlist);

      let importedAccounts: string[] = [];
      try {
        importedAccounts = await exportSimpleKeyPairAccounts(
          keyringController,
          keychainPassword,
        );
      } catch (e) {
        Logger.error(
          e as Error,
          'error while trying to get imported accounts on recreate vault',
        );
      }

      // Recreate keyring with password given to this method
      await Authentication.newWalletAndRestore(
        pwd,
        authType as AuthData,
        seedPhrase,
        true,
      );
      // Keyring is set with empty password or not
      keyringControllerPasswordSet.current = pwd !== '';

      // Get props to restore vault
      const hdKeyring = keyringController.state.keyrings[0];
      const existingAccountCount = hdKeyring.accounts.length;

      // Create previous accounts again
      for (let i = 0; i < existingAccountCount - 1; i++) {
        await keyringController.addNewAccount();
      }

      // Import imported accounts again
      try {
        await reimportPrivateKeyAccounts(keyringController, importedAccounts);
      } catch (e) {
        Logger.error(
          e as Error,
          'error while trying to import accounts on recreate vault',
        );
      }
    },
    [password],
  );

  const validatePasswordSubmission = useCallback(() => {
    const passwordsMatch = password !== '' && password === confirmPassword;
    const canSubmit = getOauth2LoginSuccess()
      ? passwordsMatch
      : passwordsMatch && isSelected;
    const oauthProvider = route.params?.provider;
    const socialAccountType = oauthProvider
      ? getSocialAccountType(oauthProvider, false)
      : undefined;

    if (loading) return { valid: false, shouldTrack: false };

    if (!canSubmit) {
      const shouldTrackMismatch =
        password !== '' &&
        confirmPassword !== '' &&
        password !== confirmPassword;

      if (shouldTrackMismatch) {
        track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
          wallet_setup_type: 'import',
          error_type: strings('choose_password.password_dont_match'),
          ...(socialAccountType && { account_type: socialAccountType }),
        });
      }
      return { valid: false, shouldTrack: false };
    }

    if (!passwordRequirementsMet(password)) {
      track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
        wallet_setup_type: 'import',
        error_type: strings('choose_password.password_length_error'),
        ...(socialAccountType && { account_type: socialAccountType }),
      });
      return { valid: false, shouldTrack: false };
    }

    return { valid: true, shouldTrack: true };
  }, [
    password,
    confirmPassword,
    loading,
    isSelected,
    getOauth2LoginSuccess,
    route.params?.provider,
    track,
  ]);

  const handleWalletCreation = useCallback(
    async (authType: AuthData, previous_screen: string | undefined) => {
      // Ask user to allow biometrics access control
      authType.currentAuthType =
        await Authentication.requestBiometricsAccessControlForIOS(
          authType.currentAuthType,
        );

      if (previous_screen?.toLowerCase() === ONBOARDING.toLowerCase()) {
        await Authentication.newWalletAndKeychain(password, authType);
        keyringControllerPasswordSet.current = true;
        dispatch(seedphraseNotBackedUp());
      } else {
        await recreateVault(password, authType);
      }
    },
    [password, recreateVault, dispatch],
  );

  const onContinueNavigation = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: Routes.ONBOARDING.SUCCESS_FLOW,
          params: {
            screen: Routes.ONBOARDING.SUCCESS,
            params: {
              successFlow: ONBOARDING_SUCCESS_FLOW.SEEDLESS_ONBOARDING,
            },
          },
        },
      ],
    });
  }, [navigation]);

  const handlePostWalletCreation = useCallback(
    async (authType: AuthData, isMarketingOptedIn: boolean) => {
      dispatch(passwordSetAction());
      dispatch(setLockTimeAction(AppConstants.DEFAULT_LOCK_TIMEOUT));

      if (!authType.oauth2Login) {
        const seedPhrase = await tryExportSeedPhrase(password);
        (
          navigation as unknown as {
            replace: (screen: string, params?: object) => void;
          }
        ).replace('ManualBackupStep1', {
          seedPhrase,
          backupFlow: false,
          settingsBackup: false,
        });
        return;
      }

      endTrace({ name: TraceName.OnboardingNewSocialCreateWallet });
      endTrace({ name: TraceName.OnboardingJourneyOverall });

      dispatch(setDataCollectionForMarketing(isMarketingOptedIn));
      OAuthLoginService.updateMarketingOptInStatus(isMarketingOptedIn).catch(
        (err) => {
          Logger.error(err);
        },
      );

      const oauthProvider = route.params?.provider;
      const socialAccountType =
        oauthProvider !== undefined
          ? getSocialAccountType(oauthProvider, false)
          : undefined;

      const analyticsProperties = {
        [UserProfileProperty.HAS_MARKETING_CONSENT]:
          Boolean(isMarketingOptedIn),
        is_metrics_opted_in: true,
        location: 'onboarding_choosePassword',
        updated_after_onboarding: false,
        ...(socialAccountType && { account_type: socialAccountType }),
      };
      const identifyTraits = {
        ...generateDeviceAnalyticsMetaData(),
        ...generateUserSettingsAnalyticsMetaData(),
      };

      try {
        metrics.trackEvent(
          metrics
            .createEventBuilder(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED)
            .addProperties(analyticsProperties)
            .build(),
        );

        await metrics.identify(identifyTraits);
      } catch (analyticsError) {
        Logger.error(analyticsError as Error);
      }

      const accountType = reduxAccountType;
      if (shouldShowQuestionnaire) {
        navigation.navigate(Routes.ONBOARDING.INTEREST_QUESTIONNAIRE, {
          onComplete: onContinueNavigation,
          ...(accountType && { accountType }),
        });
      } else {
        onContinueNavigation();
      }
    },
    [
      dispatch,
      route.params?.provider,
      metrics,
      reduxAccountType,
      shouldShowQuestionnaire,
      navigation,
      onContinueNavigation,
      tryExportSeedPhrase,
      password,
    ],
  );

  const handleWalletCreationError = useCallback(
    async (caughtError: Error, metricsEnabled: boolean) => {
      try {
        await recreateVault('');
      } catch (e) {
        Logger.error(e as Error);
      }

      // Reset state - don't set existing user since wallet creation failed
      await StorageWrapper.removeItem(SEED_PHRASE_HINTS);
      dispatch(passwordUnsetAction());
      dispatch(setLockTimeAction(-1));
      setLoading(false);

      const oauthProvider = route.params?.provider;
      const socialAccountType = oauthProvider
        ? getSocialAccountType(oauthProvider, false)
        : undefined;

      track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
        wallet_setup_type: 'new',
        error_type: caughtError.toString(),
        ...(socialAccountType && { account_type: socialAccountType }),
      });

      const onboardingTraceCtx = route.params?.onboardingTraceCtx;
      if (onboardingTraceCtx) {
        trace({
          name: TraceName.OnboardingPasswordSetupError,
          op: TraceOperation.OnboardingUserJourney,
          parentContext: onboardingTraceCtx,
          tags: { errorMessage: caughtError.toString() },
        });
        endTrace({ name: TraceName.OnboardingPasswordSetupError });
      }

      if (metricsEnabled) {
        captureException(caughtError, {
          tags: {
            view: 'ChoosePassword',
            context: 'Wallet creation failed - auto reported',
          },
        });
      }

      // Navigate to error screen
      navigation.reset({
        routes: [
          {
            name: Routes.ONBOARDING.WALLET_CREATION_ERROR,
            params: {
              metricsEnabled,
              error: caughtError,
              ...(socialAccountType && { accountType: socialAccountType }),
            },
          },
        ],
      });
    },
    [recreateVault, dispatch, track, route.params, navigation],
  );

  const runWalletCreation = useCallback(
    async (
      accountType: AccountType,
      isSocialLogin: boolean | undefined,
      provider: ChoosePasswordRouteParams['provider'],
    ) => {
      setLoading(true);
      const previous_screen = route.params?.[PREVIOUS_SCREEN];

      const authType = await Authentication.componentAuthenticationType(
        true,
        false,
      );
      authType.oauth2Login = isSocialLogin;

      const onboardingTraceCtx = route.params?.onboardingTraceCtx;
      if (onboardingTraceCtx) {
        trace({
          name: TraceName.OnboardingSRPAccountCreationTime,
          op: TraceOperation.OnboardingUserJourney,
          parentContext: onboardingTraceCtx,
          tags: {
            is_social_login: Boolean(provider),
            account_type: accountType,
            biometrics_enabled: Boolean(biometryType),
          },
        });
      }

      Logger.log('previous_screen', previous_screen);

      await handleWalletCreation(authType, previous_screen);

      foxRiveLoaderRef.current?.stop();

      await handlePostWalletCreation(authType, marketingOptInChecked);

      track(MetaMetricsEvents.WALLET_CREATED, {
        biometrics_enabled: Boolean(biometryType),
        account_type: accountType,
      });

      let walletSetupAttributionProps = {};
      if (isSocialLogin) {
        walletSetupAttributionProps = getWalletSetupAttributionPropsFromStore(
          marketingOptInChecked,
        );
      }

      track(MetaMetricsEvents.WALLET_SETUP_COMPLETED, {
        wallet_setup_type: 'new',
        new_wallet: true,
        account_type: accountType,
        ...walletSetupAttributionProps,
      });

      endTrace({ name: TraceName.OnboardingSRPAccountCreationTime });
    },
    [
      route.params,
      biometryType,
      handleWalletCreation,
      handlePostWalletCreation,
      track,
      marketingOptInChecked,
    ],
  );

  const onPressCreate = useCallback(async () => {
    const validation = validatePasswordSubmission();
    if (!validation.valid) return;

    const provider = route.params?.provider;
    const accountType = provider
      ? getSocialAccountType(provider, false)
      : AccountType.Metamask;
    const isSocialLogin = getOauth2LoginSuccess();

    track(MetaMetricsEvents.WALLET_CREATION_ATTEMPTED, {
      account_type: accountType,
    });

    try {
      await runWalletCreation(accountType, isSocialLogin, provider);
    } catch (err) {
      const metricsEnabled = metrics.isEnabled();
      await handleWalletCreationError(err as Error, metricsEnabled);
    }
  }, [
    validatePasswordSubmission,
    route.params?.provider,
    track,
    getOauth2LoginSuccess,
    runWalletCreation,
    handleWalletCreationError,
    metrics,
  ]);

  const onPasswordChange = useCallback(
    (val: string) => {
      setPassword(val);
      setConfirmPassword(val === '' ? '' : confirmPassword);
    },
    [confirmPassword],
  );

  const learnMore = useCallback(() => {
    track(MetaMetricsEvents.EXTERNAL_LINK_CLICKED, {
      text: 'Learn More',
      location: 'choose_password',
      url_domain: RESET_PASSWORD_GUIDE_URL,
    });

    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: RESET_PASSWORD_GUIDE_URL,
        title: 'support.metamask.io',
      },
    });
  }, [navigation, track]);

  const toggleShowPassword = useCallback((index: number) => {
    setShowPasswordIndex((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return [...prev, index];
    });
  }, []);

  const jumpToConfirmPassword = useCallback(() => {
    const input = confirmPasswordInputRef.current;
    if (input) input.focus();
  }, []);

  const setConfirmPasswordValue = useCallback((val: string) => {
    setConfirmPassword(val);
  }, []);

  const checkError = useCallback(
    () =>
      password !== '' && confirmPassword !== '' && password !== confirmPassword,
    [password, confirmPassword],
  );

  useEffect(() => {
    const initBiometrics = async () => {
      const onboardingTraceCtx = route.params?.onboardingTraceCtx;
      if (onboardingTraceCtx) {
        passwordSetupAttemptTraceCtx.current = trace({
          name: TraceName.OnboardingPasswordSetupAttempt,
          op: TraceOperation.OnboardingUserJourney,
          parentContext: onboardingTraceCtx,
        });
      }

      const authData = await Authentication.getType();
      await StorageWrapper.getItem(BIOMETRY_CHOICE_DISABLED);
      await StorageWrapper.getItem(PASSCODE_DISABLED);

      const isDevicePasscodeAuth =
        authData.currentAuthType ===
          AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION ||
        authData.currentAuthType === ('device_passcode' as AUTHENTICATION_TYPE);

      if (isDevicePasscodeAuth) {
        setBiometryType(passcodeType(authData.currentAuthType));
      } else if (authData.availableBiometryType) {
        setBiometryType(authData.availableBiometryType);
      }
    };

    initBiometrics();
  }, [route.params?.onboardingTraceCtx]);

  // End password-setup trace on unmount
  useEffect(
    () => () => {
      if (passwordSetupAttemptTraceCtx.current) {
        endTrace({ name: TraceName.OnboardingPasswordSetupAttempt });
        passwordSetupAttemptTraceCtx.current = null;
      }
    },
    [],
  );

  const renderContent = () => {
    const passwordsMatch = password !== '' && password === confirmPassword;
    const isPasswordTooShort =
      !isPasswordFieldFocused &&
      password !== '' &&
      password.length < MIN_PASSWORD_LENGTH;
    let canSubmit;
    if (getOauth2LoginSuccess()) {
      canSubmit =
        passwordsMatch &&
        password.length >= MIN_PASSWORD_LENGTH &&
        isGeolocationResolved;
    } else {
      canSubmit =
        passwordsMatch && isSelected && password.length >= MIN_PASSWORD_LENGTH;
    }

    return (
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-background-default')}
      >
        <HeaderStandard
          includesTopInset
          onBack={loading ? undefined : () => navigation.goBack()}
          backButtonProps={
            loading
              ? undefined
              : { testID: ChoosePasswordSelectorsIDs.BACK_BUTTON_ID }
          }
        />
        {loading ? (
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Start}
            twClassName="flex-1 px-4"
            gap={6}
          >
            {!hasTestOverrides && (
              <FoxRiveLoaderAnimation ref={foxRiveLoaderRef} />
            )}
          </Box>
        ) : (
          <KeyboardAwareScrollView
            contentContainerStyle={tw.style('flex-1 px-4')}
            keyboardShouldPersistTaps="handled"
          >
            <Box
              flexDirection={BoxFlexDirection.Column}
              twClassName="flex-1"
              gap={4}
              testID={ChoosePasswordSelectorsIDs.CONTAINER_ID}
            >
              <Box flexDirection={BoxFlexDirection.Column} gap={1}>
                <Text
                  variant={TextVariant.DisplayMd}
                  color={TextColor.TextDefault}
                >
                  {strings('choose_password.title')}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {getOauth2LoginSuccess() ? (
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {Platform.OS === 'ios' && getOauth2LoginSuccess()
                        ? strings(
                            'choose_password.description_social_login_update_ios',
                          )
                        : strings(
                            'choose_password.description_social_login_update',
                          )}
                      {Platform.OS === 'android' && (
                        <Text
                          variant={TextVariant.BodyMd}
                          color={TextColor.WarningDefault}
                        >
                          {' '}
                          {strings(
                            'choose_password.description_social_login_update_bold',
                          )}
                        </Text>
                      )}
                    </Text>
                  ) : (
                    strings('choose_password.description')
                  )}
                </Text>
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="relative"
                gap={2}
              >
                <Label
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  twClassName="-mb-1"
                >
                  {strings('choose_password.password')}
                </Label>
                <TextField
                  autoFocus
                  value={password}
                  onChangeText={onPasswordChange}
                  onFocus={() => setIsPasswordFieldFocused(true)}
                  onBlur={() => setIsPasswordFieldFocused(false)}
                  isError={isPasswordTooShort}
                  endAccessory={
                    <TouchableOpacity
                      testID={
                        ChoosePasswordSelectorsIDs.NEW_PASSWORD_SHOW_ICON_ID
                      }
                      onPress={() => toggleShowPassword(0)}
                    >
                      <Icon
                        name={
                          showPasswordIndex.includes(0)
                            ? IconName.Eye
                            : IconName.EyeSlash
                        }
                        size={IconSize.Lg}
                        color={IconColor.IconAlternative}
                      />
                    </TouchableOpacity>
                  }
                  inputProps={{
                    secureTextEntry: showPasswordIndex.includes(0),
                    testID: ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
                    accessibilityLabel:
                      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
                    onSubmitEditing: jumpToConfirmPassword,
                    autoComplete: 'password-new',
                    returnKeyType: 'next',
                    autoCapitalize: 'none',
                    keyboardAppearance: themeAppearance,
                  }}
                />
                <Text
                  variant={TextVariant.BodySm}
                  color={
                    isPasswordTooShort
                      ? TextColor.ErrorDefault
                      : TextColor.TextAlternative
                  }
                >
                  {strings('choose_password.must_be_at_least', {
                    number: MIN_PASSWORD_LENGTH,
                  })}
                </Text>
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="relative"
                gap={2}
              >
                <Label
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  twClassName="-mb-1"
                >
                  {strings('choose_password.confirm_password')}
                </Label>
                <TextField
                  inputRef={confirmPasswordInputRef}
                  value={confirmPassword}
                  onChangeText={setConfirmPasswordValue}
                  endAccessory={
                    <TouchableOpacity
                      testID={
                        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_SHOW_ICON_ID
                      }
                      disabled={password === ''}
                      onPress={() => toggleShowPassword(1)}
                    >
                      <Icon
                        name={
                          showPasswordIndex.includes(1)
                            ? IconName.Eye
                            : IconName.EyeSlash
                        }
                        size={IconSize.Lg}
                        color={IconColor.IconAlternative}
                      />
                    </TouchableOpacity>
                  }
                  isDisabled={password === ''}
                  isError={checkError()}
                  inputProps={{
                    secureTextEntry: showPasswordIndex.includes(1),
                    testID:
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
                    accessibilityLabel:
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
                    autoComplete: 'password-new',
                    onSubmitEditing: Keyboard.dismiss,
                    returnKeyType: 'done',
                    autoCapitalize: 'none',
                    keyboardAppearance: themeAppearance,
                  }}
                />
                {checkError() && (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.ErrorDefault}
                  >
                    {strings('choose_password.password_error')}
                  </Text>
                )}
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Start}
                justifyContent={BoxJustifyContent.Start}
                gap={2}
                twClassName="mt-2 bg-section rounded-lg p-4"
              >
                <Checkbox
                  onChange={setSelection}
                  isSelected={marketingOptInChecked}
                  testID={ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID}
                  accessibilityLabel={
                    ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID
                  }
                />
                <TouchableOpacity
                  onPress={setSelection}
                  testID={ChoosePasswordSelectorsIDs.CHECKBOX_TEXT_ID}
                  style={tw.style(
                    'flex-row items-start justify-start flex-wrap w-[90%] -mt-1.5',
                  )}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextDefault}
                  >
                    {getOauth2LoginSuccess() ? (
                      strings('choose_password.marketing_opt_in_description')
                    ) : (
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {strings('choose_password.loose_password_description')}
                        <Text
                          variant={TextVariant.BodySm}
                          color={TextColor.PrimaryDefault}
                          onPress={learnMore}
                          testID={ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID}
                        >
                          {' '}
                          {strings('reset_password.learn_more')}
                        </Text>
                      </Text>
                    )}
                  </Text>
                </TouchableOpacity>
              </Box>

              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="w-full mt-auto"
                gap={4}
                style={tw.style(Platform.OS === 'android' ? 'mb-6' : 'mb-4')}
              >
                <Button
                  variant={ButtonVariant.Primary}
                  onPress={onPressCreate}
                  isDisabled={!canSubmit}
                  isFullWidth
                  size={ButtonSize.Lg}
                  testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
                >
                  {strings('choose_password.create_password_cta')}
                </Button>
              </Box>
            </Box>
          </KeyboardAwareScrollView>
        )}
      </SafeAreaView>
    );
  };

  return renderContent();
};

export default ChoosePassword;
