import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  View,
  SafeAreaView,
  BackHandler,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import METAMASK_NAME from '../../../images/branding/metamask-name.png';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  KeyboardController,
  AndroidSoftInputModes,
} from 'react-native-keyboard-controller';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import {
  OnboardingActionTypes,
  saveOnboardingEvent as saveEvent,
} from '../../../actions/onboarding';
import { setAllowLoginWithRememberMe as setAllowLoginWithRememberMeUtil } from '../../../actions/security';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { passcodeType } from '../../../util/authentication';
import { BiometryButton } from '../../UI/BiometryButton';
import Logger from '../../../util/Logger';
import {
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import Routes from '../../../constants/navigation/Routes';
import ErrorBoundary from '../ErrorBoundary';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';

import { createRestoreWalletNavDetailsNested } from '../RestoreWallet/RestoreWallet';
import { parseVaultValue } from '../../../util/validators';
import { getVaultFromBackup } from '../../../core/BackupVault';
import { containsErrorMessage } from '../../../util/errorHandling';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { LoginViewSelectors } from './LoginView.testIds';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { trackVaultCorruption } from '../../../util/analytics/vaultCorruptionTracking';
import { downloadStateLogs } from '../../../util/logs';
import {
  trace,
  TraceName,
  TraceOperation,
  endTrace,
} from '../../../util/trace';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import {
  DENY_PIN_ERROR_ANDROID,
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
  VAULT_ERROR,
  PASSCODE_NOT_SET_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
} from './constants';
import { UNLOCK_WALLET_ERROR_MESSAGES } from '../../../core/Authentication/constants';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks/useStyles';
import stylesheet from './styles';
import ReduxService from '../../../core/redux';
import { StackNavigationProp } from '@react-navigation/stack';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import FoxAnimation from '../../UI/FoxAnimation/FoxAnimation';
import { isE2E } from '../../../util/test/utils';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import useAuthentication from '../../../core/Authentication/hooks/useAuthentication';
import { SeedlessOnboardingControllerErrorMessage } from '@metamask/seedless-onboarding-controller';

// In android, having {} will cause the styles to update state
// using a constant will prevent this
const EmptyRecordConstant = {};

interface LoginRouteParams {
  locked: boolean;
}

interface LoginProps {
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

/**
 * View where returning users can authenticate
 */
const Login: React.FC<LoginProps> = ({ saveOnboardingEvent }) => {
  const fieldRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [biometryType, setBiometryType] = useState<
    BIOMETRY_TYPE | AUTHENTICATION_TYPE | string | null
  >(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometryChoice, setBiometryChoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);
  const [startFoxAnimation, setStartFoxAnimation] = useState<
    undefined | 'Start' | 'Loader'
  >(undefined);

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: LoginRouteParams }, 'params'>>();
  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(stylesheet, EmptyRecordConstant);
  const setAllowLoginWithRememberMe = (enabled: boolean) =>
    setAllowLoginWithRememberMeUtil(enabled);

  const { unlockWallet, lockApp, getAuthType, componentAuthenticationType } =
    useAuthentication();

  const track = (
    event: IMetaMetricsEvent,
    properties: Record<string, string | boolean | number>,
  ) => {
    trackOnboarding(
      MetricsEventBuilder.createEventBuilder(event)
        .addProperties(properties)
        .build(),
      saveOnboardingEvent,
    );
  };

  const handleBackPress = () => {
    lockApp({ reset: false });
    return false;
  };

  const updateBiometryChoice = useCallback(
    async (newBiometryChoice: boolean) => {
      setBiometryChoice(newBiometryChoice);
    },
    [setBiometryChoice],
  );

  useEffect(() => {
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
    });
    track(MetaMetricsEvents.LOGIN_SCREEN_VIEWED, {});
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    setStartFoxAnimation('Start');

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && !isE2E) {
      KeyboardController.setInputMode(
        AndroidSoftInputModes.SOFT_INPUT_ADJUST_PAN,
      );

      return () => {
        KeyboardController.setDefaultMode();
      };
    }
  }, []);

  useEffect(() => {
    const getUserAuthPreferences = async () => {
      const authData = await getAuthType();

      //Setup UI to handle Biometric
      const previouslyDisabled = await StorageWrapper.getItem(
        BIOMETRY_CHOICE_DISABLED,
      );
      const passcodePreviouslyDisabled =
        await StorageWrapper.getItem(PASSCODE_DISABLED);

      if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE) {
        setBiometryType(passcodeType(authData.currentAuthType));
        setHasBiometricCredentials(!route?.params?.locked);
        setBiometryChoice(
          !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE),
        );
      } else if (authData.currentAuthType === AUTHENTICATION_TYPE.REMEMBER_ME) {
        setHasBiometricCredentials(false);
        setRememberMe(true);
        setAllowLoginWithRememberMe(true);
      } else if (authData.availableBiometryType) {
        Logger.log('authData', authData);
        setBiometryType(authData.availableBiometryType);
        setHasBiometricCredentials(
          authData.currentAuthType === AUTHENTICATION_TYPE.BIOMETRIC,
        );
        setBiometryChoice(!(previouslyDisabled && previouslyDisabled === TRUE));
      }
    };

    getUserAuthPreferences();
  }, [route?.params?.locked, getAuthType]);

  const handleVaultCorruption = useCallback(async () => {
    const LOGIN_VAULT_CORRUPTION_TAG = 'Login/ handleVaultCorruption:';

    // Track vault corruption handling attempt
    trackVaultCorruption(VAULT_ERROR, {
      error_type: 'vault_corruption_handling',
      context: 'vault_corruption_recovery_attempt',
      oauth_login: false,
    });

    // No need to check password requirements here, it will be checked in onLogin
    try {
      setLoading(true);
      const backupResult = await getVaultFromBackup();
      if (backupResult.vault) {
        const vaultSeed = await parseVaultValue(password, backupResult.vault);
        if (vaultSeed) {
          navigation.replace(
            ...createRestoreWalletNavDetailsNested({
              previousScreen: Routes.ONBOARDING.LOGIN,
            }),
          );
          setLoading(false);
          setError(null);
          return;
        }
        throw new Error(`${LOGIN_VAULT_CORRUPTION_TAG} Invalid Password`);
      } else if (backupResult.error) {
        throw new Error(`${LOGIN_VAULT_CORRUPTION_TAG} ${backupResult.error}`);
      }
    } catch (e: unknown) {
      // Track vault corruption handling failure
      trackVaultCorruption((e as Error).message, {
        error_type: 'vault_corruption_handling_failed',
        context: 'vault_corruption_recovery_failed',
        oauth_login: false,
      });

      Logger.error(e as Error);
      setLoading(false);

      setError(strings('login.invalid_password'));
    }
  }, [password, navigation]);

  const handlePasswordError = useCallback((loginErrorMessage: string) => {
    setLoading(false);
    setError(strings('login.invalid_password'));
    trackErrorAsAnalytics('Login: Invalid Password', loginErrorMessage);
  }, []);

  const handleLoginError = useCallback(
    async (loginError: Error) => {
      // Prioritize message property over toString for error handling
      const loginErrorMessage = loginError.message || loginError.toString();

      const isWrongPasswordError =
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR) ||
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID) ||
        containsErrorMessage(loginError, WRONG_PASSWORD_ERROR_ANDROID_2);

      if (isWrongPasswordError) {
        handlePasswordError(loginErrorMessage);
        return;
      }

      const isBiometricCancellation =
        containsErrorMessage(loginError, DENY_PIN_ERROR_ANDROID) ||
        containsErrorMessage(
          loginError,
          UNLOCK_WALLET_ERROR_MESSAGES.IOS_USER_CANCELLED_BIOMETRICS,
        );

      if (isBiometricCancellation) {
        updateBiometryChoice(false);
        setLoading(false);
        return;
      }

      const isVaultCorruption =
        containsErrorMessage(loginError, VAULT_ERROR) ||
        containsErrorMessage(loginError, JSON_PARSE_ERROR_UNEXPECTED_TOKEN);

      const isSeedlessPasswordOutdated = containsErrorMessage(
        loginError,
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword,
      );

      if (containsErrorMessage(loginError, PASSCODE_NOT_SET_ERROR)) {
        Alert.alert(
          strings('login.security_alert_title'),
          strings('login.security_alert_desc'),
        );
      } else if (isVaultCorruption) {
        trackVaultCorruption(loginErrorMessage, {
          error_type: containsErrorMessage(loginError, VAULT_ERROR)
            ? 'vault_error'
            : 'json_parse_error',
          context: 'login_authentication',
          oauth_login: false,
        });
        await handleVaultCorruption();
      } else if (isSeedlessPasswordOutdated) {
        navigation.replace(Routes.ONBOARDING.REHYDRATE, {
          isSeedlessPasswordOutdated: true,
        });
      } else {
        setError(loginErrorMessage);
      }

      setLoading(false);
      Logger.error(loginError, 'Failed to unlock');
    },
    [
      handlePasswordError,
      handleVaultCorruption,
      updateBiometryChoice,
      navigation,
    ],
  );

  const unlockWithPassword = useCallback(async () => {
    if (loading) return;

    fieldRef.current?.clear();
    setPassword('');
    setLoading(true);
    setError(null);

    endTrace({ name: TraceName.LoginUserInteraction });

    try {
      const authPreference = await componentAuthenticationType(
        biometryChoice,
        rememberMe,
      );

      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
        },
        async () => {
          await unlockWallet({ password, authPreference });
        },
      );
    } catch (loginErr) {
      await handleLoginError(loginErr as Error);
    } finally {
      setLoading(false);
    }
  }, [
    password,
    biometryChoice,
    rememberMe,
    loading,
    handleLoginError,
    componentAuthenticationType,
    unlockWallet,
  ]);

  const unlockWithBiometrics = useCallback(async () => {
    if (loading) return;

    fieldRef.current?.blur();
    fieldRef.current?.clear();
    setPassword('');
    setLoading(true);
    setError(null);

    try {
      await trace(
        {
          name: TraceName.LoginBiometricAuthentication,
          op: TraceOperation.Login,
        },
        async () => {
          await unlockWallet();
        },
      );
    } catch (error) {
      setHasBiometricCredentials(true);
      await handleLoginError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [unlockWallet, loading, handleLoginError]);

  // show biometric switch to true even if biometric is disabled
  const shouldRenderBiometricLogin = biometryType;

  const toggleWarningModal = () => {
    track(MetaMetricsEvents.FORGOT_PASSWORD_CLICKED, {});

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
    });
  };

  const handleDownloadStateLogs = () => {
    const fullState = ReduxService.store.getState();

    track(MetaMetricsEvents.LOGIN_DOWNLOAD_LOGS, {});
    downloadStateLogs(fullState, false);
  };

  const shouldHideBiometricAccessoryButton = !(
    biometryChoice &&
    biometryType &&
    hasBiometricCredentials &&
    !route?.params?.locked
  );

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    setError(null);
  };

  return (
    <ErrorBoundary navigation={navigation} view="Login">
      <SafeAreaView style={styles.mainWrapper}>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          style={styles.wrapper}
          contentContainerStyle={styles.scrollContentContainer}
          extraScrollHeight={Platform.OS === 'android' ? 50 : 0}
          enableOnAndroid
          enableResetScrollToCoords={false}
        >
          <View testID={LoginViewSelectors.CONTAINER} style={styles.container}>
            <Image
              source={METAMASK_NAME}
              style={styles.metamaskName}
              resizeMode="contain"
              resizeMethod={'auto'}
            />

            <View style={styles.field}>
              <TextField
                size={TextFieldSize.Lg}
                placeholder={strings('login.password_placeholder')}
                placeholderTextColor={colors.text.alternative}
                testID={LoginViewSelectors.PASSWORD_INPUT}
                returnKeyType={'done'}
                autoCapitalize="none"
                secureTextEntry
                ref={fieldRef}
                onChangeText={handlePasswordChange}
                value={password}
                onSubmitEditing={unlockWithPassword}
                endAccessory={
                  <BiometryButton
                    disabled={loading}
                    onPress={unlockWithBiometrics}
                    hidden={shouldHideBiometricAccessoryButton}
                    biometryType={biometryType as BIOMETRY_TYPE}
                  />
                }
                keyboardAppearance={themeAppearance}
                isError={!!error}
                isDisabled={loading}
              />
            </View>

            <View style={styles.helperTextContainer}>
              {!!error && (
                <HelpText
                  severity={HelpTextSeverity.Error}
                  variant={TextVariant.BodyMD}
                  testID={LoginViewSelectors.PASSWORD_ERROR}
                >
                  {error}
                </HelpText>
              )}
            </View>

            <View style={styles.ctaWrapper} pointerEvents="box-none">
              <LoginOptionsSwitch
                shouldRenderBiometricOption={shouldRenderBiometricLogin}
                biometryChoiceState={biometryChoice}
                onUpdateBiometryChoice={updateBiometryChoice}
                onUpdateRememberMe={setRememberMe}
              />
              <Button
                variant={ButtonVariants.Primary}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
                onPress={unlockWithPassword}
                label={strings('login.unlock_button')}
                isDisabled={password.length === 0 || loading}
                testID={LoginViewSelectors.LOGIN_BUTTON_ID}
                loading={loading}
                style={styles.unlockButton}
              />

              <Button
                style={styles.goBack}
                variant={ButtonVariants.Link}
                onPress={toggleWarningModal}
                testID={LoginViewSelectors.RESET_WALLET}
                label={strings('login.forgot_password')}
                isDisabled={loading}
                size={ButtonSize.Lg}
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
        <FadeOutOverlay />
        {!isE2E && (
          <TouchableOpacity
            style={styles.foxAnimationWrapper}
            delayLongPress={10 * 1000} // 10 seconds
            onLongPress={handleDownloadStateLogs}
            activeOpacity={1}
          >
            <FoxAnimation hasFooter={false} trigger={startFoxAnimation} />
          </TouchableOpacity>
        )}
        <ScreenshotDeterrent enabled isSRP={false} />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(Login);
