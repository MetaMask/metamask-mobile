import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Keyboard,
  View,
  SafeAreaView,
  Image,
  BackHandler,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import setOnboardingWizardStepUtil from '../../../actions/wizard';
import { setAllowLoginWithRememberMe as setAllowLoginWithRememberMeUtil } from '../../../actions/security';
import { useDispatch } from 'react-redux';
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../util/authentication';
import { BiometryButton } from '../../UI/BiometryButton';
import Logger from '../../../util/Logger';
import {
  BIOMETRY_CHOICE_DISABLED,
  ONBOARDING_WIZARD,
  TRUE,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import Routes from '../../../constants/navigation/Routes';
import { passwordRequirementsMet } from '../../../util/password';
import ErrorBoundary from '../ErrorBoundary';
import { toLowerCaseEquals } from '../../../util/general';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import { createRestoreWalletNavDetailsNested } from '../RestoreWallet/RestoreWallet';
import { parseVaultValue } from '../../../util/validators';
import { getVaultFromBackup } from '../../../core/BackupVault';
import { containsErrorMessage } from '../../../util/errorHandling';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { useMetrics } from '../../../components/hooks/useMetrics';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { downloadStateLogs } from '../../../util/logs';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import Label from '../../../component-library/components/Form/Label';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import { getTraceTags } from '../../../util/sentry/tags';
import { store } from '../../../store';
import { PASSCODE_NOT_SET_ERROR } from './constants';
import {
  DENY_PIN_ERROR_ANDROID,
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
} from './constants';
import { VAULT_ERROR } from './constants';
import {
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
} from './constants';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks/useStyles';
import stylesheet from './styles';
import ReduxService from '../../../core/redux';
import { StackNavigationProp } from '@react-navigation/stack';
import { BIOMETRY_TYPE } from 'react-native-keychain';

/**
 * View where returning users can authenticate
 */
const Login: React.FC = () => {
  const fieldRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [biometryType, setBiometryType] = useState<
    BIOMETRY_TYPE | AUTHENTICATION_TYPE | string | null
  >(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometryChoice, setBiometryChoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometryPreviouslyDisabled, setBiometryPreviouslyDisabled] =
    useState(false);
  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);

  const navigation = useNavigation<StackNavigationProp<any>>();
  const route =
    useRoute<RouteProp<{ params: { locked: boolean } }, 'params'>>();
  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(stylesheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const parentSpanRef = useRef(
    trace({
      name: TraceName.Login,
      op: TraceOperation.Login,
      tags: getTraceTags(store.getState()),
    }),
  );

  const dispatch = useDispatch();
  const setOnboardingWizardStep = (step: number) =>
    dispatch(setOnboardingWizardStepUtil(step));
  const setAllowLoginWithRememberMe = (enabled: boolean) =>
    setAllowLoginWithRememberMeUtil(enabled);

  useEffect(() => {
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
      parentContext: parentSpanRef.current,
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.LOGIN_SCREEN_VIEWED).build(),
    );

    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    const getUserAuthPreferences = async () => {
      const authData = await Authentication.getType();

      //Setup UI to handle Biometric
      const previouslyDisabled = await StorageWrapper.getItem(
        BIOMETRY_CHOICE_DISABLED,
      );
      const passcodePreviouslyDisabled = await StorageWrapper.getItem(
        PASSCODE_DISABLED,
      );

      if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE) {
        setBiometryType(passcodeType(authData.currentAuthType));
        setHasBiometricCredentials(!route?.params?.locked);
        setBiometryChoice(
          !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE),
        );
        setBiometryPreviouslyDisabled(!!passcodePreviouslyDisabled);
      } else if (authData.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME) {
        setHasBiometricCredentials(false);
        setRememberMe(true);
        setAllowLoginWithRememberMe(true);
      } else if (authData.availableBiometryType) {
        setBiometryType(authData.availableBiometryType);
        setHasBiometricCredentials(
          authData.currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC &&
            !route?.params?.locked,
        );
        setBiometryPreviouslyDisabled(!!previouslyDisabled);
        setBiometryChoice(!(previouslyDisabled && previouslyDisabled === TRUE));
      }
    };

    getUserAuthPreferences();

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, []);

  const handleBackPress = () => {
    Authentication.lockApp();
    return false;
  };

  const handleVaultCorruption = async () => {
    // This is so we can log vault corruption error in sentry
    const vaultCorruptionError = new Error('Vault Corruption Error');
    Logger.error(vaultCorruptionError, strings('login.clean_vault_error'));

    const LOGIN_VAULT_CORRUPTION_TAG = 'Login/ handleVaultCorruption:';

    if (!passwordRequirementsMet(password)) {
      setError(strings('login.invalid_password'));
      return;
    }
    try {
      setLoading(true);
      const backupResult = await getVaultFromBackup();
      if (backupResult.vault) {
        const vaultSeed = await parseVaultValue(password, backupResult.vault);
        if (vaultSeed) {
          // get authType
          const authData = await Authentication.componentAuthenticationType(
            biometryChoice,
            rememberMe,
          );
          try {
            await Authentication.storePassword(
              password,
              authData.currentAuthType,
            );
            navigation.replace(
              ...createRestoreWalletNavDetailsNested({
                previousScreen: Routes.ONBOARDING.LOGIN,
              }),
            );
            setLoading(false);
            setError(null);
            return;
          } catch (e) {
            throw new Error(`${LOGIN_VAULT_CORRUPTION_TAG} ${e}`);
          }
        } else {
          throw new Error(`${LOGIN_VAULT_CORRUPTION_TAG} Invalid Password`);
        }
      } else if (backupResult.error) {
        throw new Error(`${LOGIN_VAULT_CORRUPTION_TAG} ${backupResult.error}`);
      }
    } catch (e: unknown) {
      Logger.error(e as Error);
      setLoading(false);
      setError(strings('login.invalid_password'));
    }
  };

  const onLogin = async () => {
    endTrace({ name: TraceName.LoginUserInteraction });

    const locked = !passwordRequirementsMet(password);
    if (locked) setError(strings('login.invalid_password'));
    if (loading || locked) return;

    setLoading(true);
    setError(null);
    const authType = await Authentication.componentAuthenticationType(
      biometryChoice,
      rememberMe,
    );

    try {
      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
          parentContext: parentSpanRef.current,
        },
        async () => {
          await Authentication.userEntryAuth(password, authType);
        },
      );
      Keyboard.dismiss();

      // Get onboarding wizard state
      const onboardingWizard = await StorageWrapper.getItem(ONBOARDING_WIZARD);
      if (onboardingWizard) {
        navigation.replace(Routes.ONBOARDING.HOME_NAV);
      } else {
        setOnboardingWizardStep(1);
        navigation.replace(Routes.ONBOARDING.HOME_NAV);
      }
      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      setPassword('');
      setLoading(false);
      setHasBiometricCredentials(false);
      fieldRef.current?.clear();
    } catch (e: unknown) {
      const error = e as Error;
      const errorMessage = error.toString();

      if (
        toLowerCaseEquals(error, WRONG_PASSWORD_ERROR) ||
        toLowerCaseEquals(error, WRONG_PASSWORD_ERROR_ANDROID)
      ) {
        setLoading(false);
        setError(strings('login.invalid_password'));

        trackErrorAsAnalytics('Login: Invalid Password', errorMessage);

        return;
      } else if (errorMessage === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('login.security_alert_title'),
          strings('login.security_alert_desc'),
        );
        setLoading(false);
      } else if (
        containsErrorMessage(error, VAULT_ERROR) ||
        containsErrorMessage(error, JSON_PARSE_ERROR_UNEXPECTED_TOKEN)
      ) {
        try {
          await handleVaultCorruption();
        } catch (e: unknown) {
          const error = e as Error;
          // we only want to display this error to the user IF we fail to handle vault corruption
          Logger.error(error, 'Failed to handle vault corruption');
          setLoading(false);
          setError(strings('login.clean_vault_error'));
        }
      } else if (toLowerCaseEquals(error, DENY_PIN_ERROR_ANDROID)) {
        setLoading(false);
        updateBiometryChoice(false);
      } else {
        setLoading(false);
        setError(errorMessage);
      }
      Logger.error(error, 'Failed to unlock');
    }
    endTrace({ name: TraceName.Login });
  };

  const tryBiometric = async () => {
    endTrace({ name: TraceName.LoginUserInteraction });

    fieldRef.current?.blur();
    try {
      await trace(
        {
          name: TraceName.LoginBiometricAuthentication,
          op: TraceOperation.Login,
          parentContext: parentSpanRef.current,
        },
        async () => {
          await Authentication.appTriggeredAuth();
        },
      );
      const onboardingWizard = await StorageWrapper.getItem(ONBOARDING_WIZARD);
      if (!onboardingWizard) setOnboardingWizardStep(1);
      navigation.replace(Routes.ONBOARDING.HOME_NAV);
      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      setLoading(true);
      setPassword('');
      setHasBiometricCredentials(false);
      fieldRef.current?.clear();
    } catch (error) {
      setHasBiometricCredentials(true);
      Logger.log(error);
    }
    fieldRef.current?.blur();
  };

  const toggleWarningModal = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
    });
  };

  const updateBiometryChoice = async (biometryChoice: boolean) => {
    await updateAuthTypeStorageFlags(biometryChoice);
    setBiometryChoice(biometryChoice);
  };

  const renderSwitch = () => {
    const handleUpdateRememberMe = (rememberMe: boolean) => {
      setRememberMe(rememberMe);
    };

    const shouldRenderBiometricLogin =
      biometryType && !biometryPreviouslyDisabled ? biometryType : null;

    return (
      <LoginOptionsSwitch
        shouldRenderBiometricOption={shouldRenderBiometricLogin}
        biometryChoiceState={biometryChoice}
        onUpdateBiometryChoice={updateBiometryChoice}
        onUpdateRememberMe={handleUpdateRememberMe}
      />
    );
  };

  const handleDownloadStateLogs = () => {
    const fullState = ReduxService.store.getState();

    trackEvent(
      createEventBuilder(MetaMetricsEvents.LOGIN_DOWNLOAD_LOGS).build(),
    );
    downloadStateLogs(fullState, false);
  };

  const shouldHideBiometricAccessoryButton = !(
    biometryChoice &&
    biometryType &&
    hasBiometricCredentials
  );

  return (
    <ErrorBoundary navigation={navigation} view="Login">
      <SafeAreaView style={styles.mainWrapper}>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          resetScrollToCoords={{ x: 0, y: 0 }}
          style={styles.wrapper}
        >
          <View testID={LoginViewSelectors.CONTAINER}>
            <TouchableOpacity
              style={styles.foxWrapper}
              delayLongPress={10 * 1000} // 10 seconds
              onLongPress={handleDownloadStateLogs}
              activeOpacity={1}
            >
              <Image
                source={require('../../../images/branding/fox.png')}
                style={styles.image}
                resizeMethod={'auto'}
              />
            </TouchableOpacity>

            <Text style={styles.title} testID={LoginViewSelectors.TITLE_ID}>
              {strings('login.title')}
            </Text>
            <View style={styles.field}>
              <Label
                variant={TextVariant.HeadingSMRegular}
                style={styles.label}
              >
                {strings('login.password')}
              </Label>
              <TextField
                size={TextFieldSize.Lg}
                placeholder={strings('login.password')}
                placeholderTextColor={colors.text.muted}
                testID={LoginViewSelectors.PASSWORD_INPUT}
                returnKeyType={'done'}
                autoCapitalize="none"
                secureTextEntry
                ref={fieldRef}
                onChangeText={setPassword}
                value={password}
                onSubmitEditing={onLogin}
                endAccessory={
                  <BiometryButton
                    onPress={tryBiometric}
                    hidden={shouldHideBiometricAccessoryButton}
                    biometryType={biometryType}
                  />
                }
                keyboardAppearance={themeAppearance}
              />
            </View>

            {renderSwitch()}

            {!!error && (
              <HelpText
                severity={HelpTextSeverity.Error}
                variant={TextVariant.BodyMD}
                testID={LoginViewSelectors.PASSWORD_ERROR}
              >
                {error}
              </HelpText>
            )}
            <View
              style={styles.ctaWrapper}
              testID={LoginViewSelectors.LOGIN_BUTTON_ID}
            >
              <Button
                variant={ButtonVariants.Primary}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
                onPress={onLogin}
                label={
                  loading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary.inverse}
                    />
                  ) : (
                    strings('login.unlock_button')
                  )
                }
              />
            </View>

            <View style={styles.footer}>
              <Text variant={TextVariant.HeadingSMRegular} style={styles.cant}>
                {strings('login.go_back')}
              </Text>
              <Button
                style={styles.goBack}
                variant={ButtonVariants.Link}
                onPress={toggleWarningModal}
                testID={LoginViewSelectors.RESET_WALLET}
                label={strings('login.reset_wallet')}
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
        <FadeOutOverlay />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default Login;
