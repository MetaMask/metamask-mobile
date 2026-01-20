import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from 'react';
import {
  Alert,
  View,
  TouchableOpacity,
  Platform,
  Keyboard,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { captureException } from '@sentry/react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
import { useDispatch } from 'react-redux';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import {
  passwordSet as passwordSetAction,
  passwordUnset as passwordUnsetAction,
  seedphraseNotBackedUp,
  setExistingUser,
} from '../../../actions/user';
import { setLockTime as setLockTimeAction } from '../../../actions/settings';
import Engine from '../../../core/Engine';
import OAuthLoginService from '../../../core/OAuthService/OAuthService';
import Device from '../../../util/device';
import { passcodeType } from '../../../util/authentication';
import { strings } from '../../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
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
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Checkbox from '../../../component-library/components/Checkbox';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import Label from '../../../component-library/components/Form/Label';
import { TextFieldSize } from '../../../component-library/components/Form/TextField';
import Routes from '../../../constants/navigation/Routes';
import { useMetrics } from '../../hooks/useMetrics';
import FoxRiveLoaderAnimation from './FoxRiveLoaderAnimation/FoxRiveLoaderAnimation';
import ErrorBoundary from '../ErrorBoundary';
import {
  TraceName,
  endTrace,
  trace,
  TraceOperation,
  TraceContext,
} from '../../../util/trace';
import { uint8ArrayToMnemonic } from '../../../util/mnemonic';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { isE2E } from '../../../util/test/utils';
import { AccountImportStrategy } from '@metamask/keyring-controller';
import { setDataCollectionForMarketing } from '../../../actions/security';
import createStyles from './ChoosePassword.styles';
import { ChoosePasswordRouteParams } from './ChoosePassword.types';
import {
  useNavigation,
  useRoute,
  RouteProp,
  ParamListBase,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

interface ErrorWithMessage {
  message?: string;
}

interface KeyringState {
  type: string;
  accounts: string[];
}

interface KeyringControllerState {
  keyrings: KeyringState[];
}

interface ExtendedKeyringController {
  state: KeyringControllerState;
  exportAccount: (password: string, account: string) => Promise<string>;
  addNewAccount: () => Promise<void>;
  exportSeedPhrase: (password: string) => Promise<Uint8Array>;
  importAccountWithStrategy: (
    strategy: AccountImportStrategy,
    args: string[],
  ) => Promise<string>;
}

// Component that throws error if needed (to be caught by ErrorBoundary)
const ThrowErrorIfNeeded = ({
  errorToThrow,
}: {
  errorToThrow: Error | null;
}) => {
  if (errorToThrow) {
    throw errorToThrow;
  }
  return null;
};

const ChoosePassword = () => {
  const { colors, themeAppearance } = useContext(ThemeContext);
  const styles = createStyles(colors);

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<{ params: ChoosePasswordRouteParams }, 'params'>>();

  const dispatch = useDispatch();
  const metrics = useMetrics();

  const [isSelected, setIsSelected] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorToThrow, setErrorToThrow] = useState<Error | null>(null);
  const [showPasswordIndex, setShowPasswordIndex] = useState([0, 1]);
  const [biometryType, setBiometryType] = useState<string | null>(null);

  const mounted = useRef(true);
  const passwordSetupAttemptTraceCtx = useRef<TraceContext | null>(null);
  const confirmPasswordInputRef = useRef<TextInput | null>(null);
  // Flag to know if password in keyring was set or not
  const keyringControllerPasswordSet = useRef(false);

  const getOauth2LoginSuccess = useCallback(
    () => route.params?.oauthLoginSuccess,
    [route.params?.oauthLoginSuccess],
  );

  const track = useCallback(
    (event: IMetaMetricsEvent | ITrackingEvent, properties?: JsonMap) => {
      const eventBuilder = MetricsEventBuilder.createEventBuilder(event);
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

  const isOAuthPasswordCreationError = useCallback(
    (err: unknown, authType: AuthData): boolean => {
      const errorWithMessage = err as ErrorWithMessage;
      return Boolean(
        authType.oauth2Login &&
          errorWithMessage.message?.includes('SeedlessOnboardingController'),
      );
    },
    [],
  );

  const handleOAuthPasswordCreationError = useCallback(
    (err: Error, authType: AuthData) => {
      // If user has already consented to analytics, report error using regular Sentry
      if (metrics.isEnabled()) {
        authType.oauth2Login &&
          captureException(err, {
            tags: {
              view: 'ChoosePassword',
              context:
                'OAuth password creation failed - user consented to analytics',
            },
          });
      } else {
        // User hasn't consented to analytics yet, use ErrorBoundary onboarding flow
        authType.oauth2Login &&
          setErrorToThrow(
            new Error(`OAuth password creation failed: ${err.message}`),
          );
        setLoading(false);
      }
    },
    [metrics],
  );

  const setSelection = useCallback(() => {
    setIsSelected((prev) => !prev);
  }, []);

  const tryExportSeedPhrase = useCallback(async (pwd: string) => {
    const context = Engine.context;
    const uint8ArrayMnemonic =
      await context.KeyringController.exportSeedPhrase(pwd);
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
      const seedPhraseUint8 =
        await context.KeyringController.exportSeedPhrase(keychainPassword);
      const seedPhrase = uint8ArrayToMnemonic(seedPhraseUint8, wordlist);
      let importedAccounts: string[] = [];
      // Get imported accounts
      try {
        const simpleKeyrings = keyringController.state.keyrings.filter(
          (keyring) => keyring.type === 'Simple Key Pair',
        );
        for (const simpleKeyring of simpleKeyrings) {
          const simpleKeyringAccounts = await Promise.all(
            simpleKeyring.accounts.map((account) =>
              keyringController.exportAccount(keychainPassword, account),
            ),
          );
          importedAccounts = [...importedAccounts, ...simpleKeyringAccounts];
        }
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
        for (const importedAccount of importedAccounts) {
          await context.KeyringController.importAccountWithStrategy(
            AccountImportStrategy.privateKey,
            [importedAccount],
          );
        }
      } catch (e) {
        Logger.error(
          e as Error,
          'error while trying to import accounts on recreate vault',
        );
      }
    },
    [password],
  );

  const handleRejectedOsBiometricPrompt = useCallback(async () => {
    const newAuthData = await Authentication.componentAuthenticationType(
      false,
      false,
    );
    const oauth2LoginSuccess = getOauth2LoginSuccess();
    newAuthData.oauth2Login = oauth2LoginSuccess;
    try {
      await Authentication.newWalletAndKeychain(password, newAuthData);
    } catch (err) {
      if (isOAuthPasswordCreationError(err, newAuthData)) {
        handleOAuthPasswordCreationError(err as Error, newAuthData);
        return;
      }
      throw Error(strings('choose_password.disable_biometric_error'));
    }
    setBiometryType(newAuthData.availableBiometryType || null);
  }, [
    password,
    getOauth2LoginSuccess,
    isOAuthPasswordCreationError,
    handleOAuthPasswordCreationError,
  ]);

  const validatePasswordSubmission = useCallback(() => {
    const passwordsMatch = password !== '' && password === confirmPassword;
    const canSubmit = getOauth2LoginSuccess()
      ? passwordsMatch
      : passwordsMatch && isSelected;

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
        });
      }
      return { valid: false, shouldTrack: false };
    }

    if (!passwordRequirementsMet(password)) {
      track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
        wallet_setup_type: 'import',
        error_type: strings('choose_password.password_length_error'),
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
    track,
  ]);

  const handleWalletCreation = useCallback(
    async (authType: AuthData, previous_screen: string | undefined) => {
      if (previous_screen?.toLowerCase() === ONBOARDING.toLowerCase()) {
        try {
          await Authentication.newWalletAndKeychain(password, authType);
        } catch (err) {
          if (isOAuthPasswordCreationError(err, authType)) {
            handleOAuthPasswordCreationError(err as Error, authType);
            throw err;
          }
          if (Device.isIos()) {
            await handleRejectedOsBiometricPrompt();
          }
        }
        keyringControllerPasswordSet.current = true;
        dispatch(seedphraseNotBackedUp());
      } else {
        await recreateVault(password, authType);
      }
    },
    [
      password,
      isOAuthPasswordCreationError,
      handleOAuthPasswordCreationError,
      handleRejectedOsBiometricPrompt,
      recreateVault,
      dispatch,
    ],
  );

  const handlePostWalletCreation = useCallback(
    async (authType: AuthData) => {
      dispatch(passwordSetAction());
      dispatch(setLockTimeAction(AppConstants.DEFAULT_LOCK_TIMEOUT));

      if (authType.oauth2Login) {
        endTrace({ name: TraceName.OnboardingNewSocialCreateWallet });
        endTrace({ name: TraceName.OnboardingJourneyOverall });

        dispatch(setDataCollectionForMarketing(isSelected));
        OAuthLoginService.updateMarketingOptInStatus(isSelected).catch(
          (err) => {
            Logger.error(err);
          },
        );

        navigation.reset({
          index: 0,
          routes: [
            {
              name: Routes.ONBOARDING.SUCCESS,
              params: { showPasswordHint: true },
            },
          ],
        });
      } else {
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
      }
    },
    [dispatch, isSelected, navigation, tryExportSeedPhrase, password],
  );

  const handleWalletCreationError = useCallback(
    async (caughtError: Error) => {
      try {
        await recreateVault('');
      } catch (e) {
        Logger.error(e as Error);
      }

      dispatch(setExistingUser(true));
      await StorageWrapper.removeItem(SEED_PHRASE_HINTS);
      dispatch(passwordUnsetAction());
      dispatch(setLockTimeAction(-1));

      if (caughtError.toString() === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('choose_password.security_alert_title'),
          strings('choose_password.security_alert_message'),
        );
      }
      setLoading(false);

      track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
        wallet_setup_type: 'new',
        error_type: caughtError.toString(),
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
    },
    [recreateVault, dispatch, track, route.params],
  );

  const onPressCreate = useCallback(async () => {
    const validation = validatePasswordSubmission();
    if (!validation.valid) return;

    const provider = route.params?.provider;
    const accountType = provider ? `metamask_${provider}` : 'metamask';

    track(MetaMetricsEvents.WALLET_CREATION_ATTEMPTED, {
      account_type: accountType,
    });

    try {
      setLoading(true);
      const previous_screen = route.params?.[PREVIOUS_SCREEN];

      const authType = await Authentication.componentAuthenticationType(
        true,
        false,
      );
      authType.oauth2Login = getOauth2LoginSuccess();

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

      try {
        await handleWalletCreation(authType, previous_screen);
      } catch (err) {
        if (isOAuthPasswordCreationError(err, authType)) {
          return;
        }
        throw err;
      }

      await handlePostWalletCreation(authType);

      track(MetaMetricsEvents.WALLET_CREATED, {
        biometrics_enabled: Boolean(biometryType),
        account_type: accountType,
      });
      track(MetaMetricsEvents.WALLET_SETUP_COMPLETED, {
        wallet_setup_type: 'new',
        new_wallet: true,
        account_type: accountType,
      });
      endTrace({ name: TraceName.OnboardingSRPAccountCreationTime });
    } catch (err) {
      await handleWalletCreationError(err as Error);
    }
  }, [
    validatePasswordSubmission,
    route.params,
    track,
    getOauth2LoginSuccess,
    biometryType,
    handleWalletCreation,
    handlePostWalletCreation,
    handleWalletCreationError,
    isOAuthPasswordCreationError,
  ]);

  const onPasswordChange = useCallback(
    (val: string) => {
      setPassword(val);
      setConfirmPassword(val === '' ? '' : confirmPassword);
    },
    [confirmPassword],
  );

  const learnMore = useCallback(() => {
    const learnMoreUrl =
      'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/';

    track(MetaMetricsEvents.EXTERNAL_LINK_CLICKED, {
      text: 'Learn More',
      location: 'choose_password',
      url: learnMoreUrl,
    });

    navigation.push('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: learnMoreUrl,
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

  const HeaderLeft = useCallback(() => {
    const marginLeft = 16;
    return (
      <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Lg}
          color={colors.icon.default}
          style={{ marginLeft }}
        />
      </TouchableOpacity>
    );
  }, [navigation, loading, colors]);

  const EmptyHeaderLeft = useCallback(() => <View />, []);

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getOnboardingNavbarOptions(
        route,
        {
          headerLeft: loading ? EmptyHeaderLeft : HeaderLeft,
          headerRight: () => null,
        },
        colors,
        false,
      ),
    );
  }, [navigation, loading, colors, route, HeaderLeft, EmptyHeaderLeft]);

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

      if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE) {
        setBiometryType(passcodeType(authData.currentAuthType));
      } else if (authData.availableBiometryType) {
        setBiometryType(authData.availableBiometryType);
      }
    };

    initBiometrics();
  }, [route.params?.onboardingTraceCtx]);

  //Reset mounted flag and end trace on unmount
  useEffect(
    () => () => {
      mounted.current = false;
      if (passwordSetupAttemptTraceCtx.current) {
        endTrace({ name: TraceName.OnboardingPasswordSetupAttempt });
        passwordSetupAttemptTraceCtx.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  useEffect(() => {
    if (loading) {
      // update navigationOptions
      navigation.setParams({
        headerLeft: EmptyHeaderLeft,
      });
    }
  }, [loading, navigation, EmptyHeaderLeft]);

  const renderContent = () => {
    const passwordsMatch = password !== '' && password === confirmPassword;
    let canSubmit;
    if (getOauth2LoginSuccess()) {
      canSubmit = passwordsMatch && password.length >= MIN_PASSWORD_LENGTH;
    } else {
      canSubmit =
        passwordsMatch && isSelected && password.length >= MIN_PASSWORD_LENGTH;
    }

    return (
      <SafeAreaView edges={{ bottom: 'additive' }} style={styles.mainWrapper}>
        {loading ? (
          <View style={styles.loadingWrapper}>
            {!isE2E && <FoxRiveLoaderAnimation />}
          </View>
        ) : (
          <KeyboardAwareScrollView
            contentContainerStyle={styles.wrapper}
            resetScrollToCoords={{ x: 0, y: 0 }}
          >
            <View style={styles.container}>
              <View
                style={styles.passwordContainer}
                testID={ChoosePasswordSelectorsIDs.CONTAINER_ID}
              >
                <View style={styles.passwordContainerTitle}>
                  <Text
                    variant={TextVariant.DisplayMD}
                    color={TextColor.Default}
                  >
                    {strings('choose_password.title')}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {getOauth2LoginSuccess() ? (
                      <Text
                        variant={TextVariant.BodyMD}
                        color={TextColor.Alternative}
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
                            variant={TextVariant.BodyMD}
                            color={TextColor.Warning}
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
                </View>

                <View style={styles.field}>
                  <Label
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Default}
                    style={styles.label}
                  >
                    {strings('choose_password.password')}
                  </Label>
                  <TextField
                    autoFocus
                    secureTextEntry={showPasswordIndex.includes(0)}
                    value={password}
                    onChangeText={onPasswordChange}
                    placeholderTextColor={colors.text.muted}
                    testID={ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}
                    onSubmitEditing={jumpToConfirmPassword}
                    submitBehavior="submit"
                    autoComplete="new-password"
                    returnKeyType="next"
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                    size={TextFieldSize.Lg}
                    endAccessory={
                      <TouchableOpacity onPress={() => toggleShowPassword(0)}>
                        <Icon
                          name={
                            showPasswordIndex.includes(0)
                              ? IconName.Eye
                              : IconName.EyeSlash
                          }
                          size={IconSize.Lg}
                          color={colors.icon.alternative}
                        />
                      </TouchableOpacity>
                    }
                  />
                  {(!password || password.length < MIN_PASSWORD_LENGTH) && (
                    <Text
                      variant={TextVariant.BodySM}
                      color={TextColor.Alternative}
                    >
                      {strings('choose_password.must_be_at_least', {
                        number: MIN_PASSWORD_LENGTH,
                      })}
                    </Text>
                  )}
                </View>

                <View style={styles.field}>
                  <Label
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Default}
                    style={styles.label}
                  >
                    {strings('choose_password.confirm_password')}
                  </Label>
                  <TextField
                    ref={confirmPasswordInputRef}
                    value={confirmPassword}
                    onChangeText={setConfirmPasswordValue}
                    secureTextEntry={showPasswordIndex.includes(1)}
                    placeholderTextColor={colors.text.muted}
                    testID={
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID
                    }
                    accessibilityLabel={
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID
                    }
                    autoComplete="new-password"
                    onSubmitEditing={Keyboard.dismiss}
                    returnKeyType={'done'}
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                    size={TextFieldSize.Lg}
                    endAccessory={
                      <TouchableOpacity onPress={() => toggleShowPassword(1)}>
                        <Icon
                          name={
                            showPasswordIndex.includes(1)
                              ? IconName.Eye
                              : IconName.EyeSlash
                          }
                          size={IconSize.Lg}
                          color={colors.icon.alternative}
                        />
                      </TouchableOpacity>
                    }
                    isDisabled={password === ''}
                    isError={checkError()}
                  />
                  {checkError() && (
                    <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                      {strings('choose_password.password_error')}
                    </Text>
                  )}
                </View>

                <View style={styles.learnMoreContainer}>
                  <Checkbox
                    onPress={setSelection}
                    isChecked={isSelected}
                    testID={ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID}
                    accessibilityLabel={
                      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID
                    }
                    style={styles.checkbox}
                  />
                  <Button
                    variant={ButtonVariants.Link}
                    onPress={setSelection}
                    style={styles.learnMoreTextContainer}
                    testID={ChoosePasswordSelectorsIDs.CHECKBOX_TEXT_ID}
                    label={
                      <Text
                        variant={TextVariant.BodySM}
                        color={TextColor.Default}
                      >
                        {getOauth2LoginSuccess() ? (
                          strings(
                            'choose_password.marketing_opt_in_description',
                          )
                        ) : (
                          <Text
                            variant={TextVariant.BodySM}
                            color={TextColor.Alternative}
                          >
                            {strings(
                              'choose_password.loose_password_description',
                            )}
                            <Text
                              variant={TextVariant.BodySM}
                              color={TextColor.Primary}
                              onPress={learnMore}
                              testID={
                                ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID
                              }
                            >
                              {' '}
                              {strings('reset_password.learn_more')}
                            </Text>
                          </Text>
                        )}
                      </Text>
                    }
                  />
                </View>

                <View style={styles.ctaWrapper}>
                  <Button
                    variant={ButtonVariants.Primary}
                    onPress={onPressCreate}
                    label={strings('choose_password.create_password_cta')}
                    disabled={!canSubmit}
                    width={ButtonWidthTypes.Full}
                    size={ButtonSize.Lg}
                    isDisabled={!canSubmit}
                    testID={ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID}
                  />
                </View>
              </View>
            </View>
          </KeyboardAwareScrollView>
        )}
      </SafeAreaView>
    );
  };

  return (
    <ErrorBoundary
      navigation={navigation}
      view="ChoosePassword"
      metrics={metrics}
      useOnboardingErrorHandling={!!errorToThrow && !metrics.isEnabled()}
    >
      <ThrowErrorIfNeeded errorToThrow={errorToThrow} />
      {renderContent()}
    </ErrorBoundary>
  );
};

export default ChoosePassword;
