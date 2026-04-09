import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
} from 'react';
import {
  Alert,
  SafeAreaView,
  BackHandler,
  TouchableOpacity,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import METAMASK_NAME from '../../../images/branding/metamask-name.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextField,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { ThemeContext } from '../../../util/theme';
import { TextVariant as DSTextVariant } from '../../../component-library/components/Texts/Text';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  KeyboardController,
  AndroidSoftInputModes,
} from 'react-native-keyboard-controller';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import {
  OnboardingActionTypes,
  saveOnboardingEvent as saveEvent,
} from '../../../actions/onboarding';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { DeviceAuthenticationButton } from '../../UI/DeviceAuthenticationButton';
import Logger from '../../../util/Logger';
import Routes from '../../../constants/navigation/Routes';
import ErrorBoundary from '../ErrorBoundary';
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
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import {
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
  VAULT_ERROR,
  PASSCODE_NOT_SET_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
  WRONG_PASSWORD_ERROR_ANDROID_2,
} from './constants';
import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import ReduxService from '../../../core/redux';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import type { AnalyticsTrackingEvent } from '../../../util/analytics/AnalyticsEventBuilder';
import FoxAnimation from '../../UI/FoxAnimation/FoxAnimation';
import { isE2E } from '../../../util/test/utils';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import useAuthentication from '../../../core/Authentication/hooks/useAuthentication';
import { SeedlessOnboardingControllerError } from '../../../core/Engine/controllers/seedless-onboarding-controller/error';
import useAuthCapabilities from '../../../core/Authentication/hooks/useAuthCapabilities';
import { isBiometricUnlockCancelledByUser } from '../../../core/Authentication/utils';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';

interface LoginRouteParams {
  locked: boolean;
}

interface LoginProps {
  saveOnboardingEvent: (event: AnalyticsTrackingEvent) => void;
}

/**
 * View where returning users can authenticate
 */
const Login: React.FC<LoginProps> = ({ saveOnboardingEvent }) => {
  const fieldRef = useRef<React.ElementRef<typeof TextField> | null>(null);

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startFoxAnimation, setStartFoxAnimation] = useState<
    undefined | 'Start' | 'Loader'
  >(undefined);

  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: LoginRouteParams }, 'params'>>();
  const tw = useTailwind();
  const { colors, themeAppearance } = useContext(ThemeContext);

  const {
    unlockWallet,
    lockApp,
    getAuthType,
    checkIsSeedlessPasswordOutdated,
  } = useAuthentication();
  const { capabilities } = useAuthCapabilities();

  const handleBackPress = () => {
    lockApp({ reset: false });
    return false;
  };

  useEffect(() => {
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
    });
    trackOnboarding(MetaMetricsEvents.LOGIN_SCREEN_VIEWED, saveOnboardingEvent);
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
          navigation.dispatch(
            StackActions.replace(
              ...createRestoreWalletNavDetailsNested({
                previousScreen: Routes.ONBOARDING.LOGIN,
              }),
            ),
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
        isBiometricUnlockCancelledByUser(loginError);

      if (isBiometricCancellation) {
        setLoading(false);
        return;
      }

      const isVaultCorruption =
        containsErrorMessage(loginError, VAULT_ERROR) ||
        containsErrorMessage(loginError, JSON_PARSE_ERROR_UNEXPECTED_TOKEN);

      const isSeedlessOnboardingControllerError =
        loginError instanceof SeedlessOnboardingControllerError ||
        containsErrorMessage(loginError, 'SeedlessOnboardingController');

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
      } else if (isSeedlessOnboardingControllerError) {
        // Detected seedless onboarding error. Defer to OAuthRehydration screen to handle subsequent log in attempts.
        navigation.dispatch(
          StackActions.replace(Routes.ONBOARDING.REHYDRATE, {
            isSeedlessPasswordOutdated: true,
          }),
        );
      } else {
        setError(loginErrorMessage);
      }

      setLoading(false);
      Logger.error(loginError, 'Failed to unlock');
    },
    [handlePasswordError, handleVaultCorruption, navigation],
  );

  const unlockWithPassword = useCallback(async () => {
    if (loading) return;

    fieldRef.current?.clear();
    setPassword('');
    setLoading(true);
    setError(null);

    endTrace({ name: TraceName.LoginUserInteraction });

    try {
      await trace(
        {
          name: TraceName.AuthenticateUser,
          op: TraceOperation.Login,
        },
        async () => {
          const isSeedlessPasswordOutdated =
            await checkIsSeedlessPasswordOutdated({
              skipCache: false,
              captureSentryError: true,
            });
          await unlockWallet({ password });
          if (isSeedlessPasswordOutdated) {
            const authData = await getAuthType();
            if (
              authData.currentAuthType === AUTHENTICATION_TYPE.PASSWORD &&
              authData.availableBiometryType
            ) {
              Alert.alert(
                strings('login.biometric_authentication_cancelled_title'),
                strings('login.biometric_authentication_cancelled_description'),
                [
                  {
                    text: strings(
                      'login.biometric_authentication_cancelled_button',
                    ),
                  },
                ],
              );
            }
          }
        },
      );
    } catch (loginErr) {
      await handleLoginError(loginErr as Error);
    } finally {
      setLoading(false);
    }
  }, [
    password,
    loading,
    handleLoginError,
    unlockWallet,
    getAuthType,
    checkIsSeedlessPasswordOutdated,
  ]);

  const unlockWithDeviceAuthentication = useCallback(async () => {
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
    } catch (loginerror) {
      await handleLoginError(loginerror as Error);
    } finally {
      setLoading(false);
    }
  }, [unlockWallet, loading, handleLoginError]);

  const toggleWarningModal = () => {
    trackOnboarding(
      MetaMetricsEvents.FORGOT_PASSWORD_CLICKED,
      saveOnboardingEvent,
    );

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.DELETE_WALLET,
    });
  };

  const handleDownloadStateLogs = () => {
    const fullState = ReduxService.store.getState();

    trackOnboarding(MetaMetricsEvents.LOGIN_DOWNLOAD_LOGS, saveOnboardingEvent);
    downloadStateLogs(fullState, false);
  };

  const isDeviceAuthenticationAvailable =
    capabilities?.authType === AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION ||
    capabilities?.authType === AUTHENTICATION_TYPE.BIOMETRIC ||
    capabilities?.authType === AUTHENTICATION_TYPE.PASSCODE;
  const shouldHideDeviceAuthenticationButton =
    route?.params?.locked || !isDeviceAuthenticationAvailable;

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    setError(null);
  };

  return (
    <ErrorBoundary navigation={navigation} view="Login">
      <SafeAreaView
        style={[
          tw.style('flex-1'),
          Platform.OS === 'android' && {
            paddingTop: StatusBar.currentHeight ?? 0,
          },
        ]}
      >
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('flex-1')}
          extraScrollHeight={Platform.OS === 'android' ? 50 : 0}
          enableOnAndroid
          enableResetScrollToCoords={false}
        >
          <Box
            testID={LoginViewSelectors.CONTAINER}
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Start}
            paddingHorizontal={6}
            twClassName="flex-1 w-full pt-20"
          >
            <Image
              source={METAMASK_NAME}
              style={[
                tw.style('w-40 h-20 self-center mt-[60px] mb-[60px]'),
                { tintColor: colors.icon.default },
              ]}
              resizeMode="contain"
              resizeMethod={'auto'}
            />
            <Box
              flexDirection={BoxFlexDirection.Column}
              justifyContent={BoxJustifyContent.Start}
              gap={2}
              marginBottom={2}
              twClassName="w-full mt-[80px]"
            >
              <TextField
                placeholder={strings('login.password_placeholder')}
                testID={LoginViewSelectors.PASSWORD_INPUT}
                accessibilityLabel={LoginViewSelectors.PASSWORD_INPUT}
                returnKeyType={'done'}
                autoCapitalize="none"
                secureTextEntry
                ref={fieldRef}
                onChangeText={handlePasswordChange}
                value={password}
                onSubmitEditing={unlockWithPassword}
                endAccessory={
                  capabilities ? (
                    <DeviceAuthenticationButton
                      disabled={loading}
                      onPress={unlockWithDeviceAuthentication}
                      hidden={shouldHideDeviceAuthenticationButton}
                      iconName={capabilities.authIcon}
                    />
                  ) : null
                }
                keyboardAppearance={themeAppearance}
                isError={!!error}
                isDisabled={loading}
              />
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              justifyContent={BoxJustifyContent.Start}
              twClassName="self-start"
            >
              {!!error && (
                <HelpText
                  severity={HelpTextSeverity.Error}
                  variant={DSTextVariant.BodyMD}
                  testID={LoginViewSelectors.PASSWORD_ERROR}
                >
                  {error}
                </HelpText>
              )}
            </Box>

            <Box
              flexDirection={BoxFlexDirection.Column}
              alignItems={BoxAlignItems.Center}
              twClassName="w-full"
              pointerEvents="box-none"
            >
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                onPress={unlockWithPassword}
                isDisabled={password.length === 0 || loading}
                testID={LoginViewSelectors.LOGIN_BUTTON_ID}
                isLoading={loading}
                twClassName="mt-1"
                isFullWidth
              >
                {strings('login.unlock_button')}
              </Button>
              <Button
                variant={ButtonVariant.Tertiary}
                size={ButtonSize.Lg}
                onPress={toggleWarningModal}
                isDisabled={loading}
                testID={LoginViewSelectors.RESET_WALLET}
                isFullWidth
                twClassName="mt-4"
              >
                {strings('login.forgot_password')}
              </Button>
            </Box>
          </Box>
        </KeyboardAwareScrollView>
        <FadeOutOverlay />
        {!isE2E && (
          <TouchableOpacity
            style={tw.style('absolute bottom-0 left-0 right-0 h-[200px]')}
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
  saveOnboardingEvent: (event: AnalyticsTrackingEvent) =>
    dispatch(saveEvent([event])),
});

export default connect(null, mapDispatchToProps)(Login);
