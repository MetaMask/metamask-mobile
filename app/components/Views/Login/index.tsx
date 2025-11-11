import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  SafeAreaView,
  BackHandler,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { colors as importedColors } from '../../../styles/common';
import StorageWrapper from '../../../store/storage-wrapper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { BiometryButton } from '../../UI/BiometryButton';
import { OPTIN_META_METRICS_UI_SEEN } from '../../../constants/storage';
import Routes from '../../../constants/navigation/Routes';
import ErrorBoundary from '../ErrorBoundary';
import { Authentication } from '../../../core';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { downloadStateLogs } from '../../../util/logs';
import {
  trace,
  TraceName,
  TraceOperation,
  TraceContext,
} from '../../../util/trace';
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
import { useMetrics } from '../../hooks/useMetrics';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import FoxAnimation from '../../UI/FoxAnimation';
import OnboardingAnimation from '../../UI/OnboardingAnimation';
import { useUnlockLogic } from './hooks/useUnlockLogic';
import { useUserAuthPreferences } from '../../hooks/useUserAuthPreferences';
import { usePasswordOutdated } from './hooks/usePasswordOutdated';
import { LoginPasswordField } from './components/LoginPasswordField';
import { LoginErrorMessage } from './components/LoginErrorMessage';

const EmptyRecordConstant = {};

interface LoginRouteParams {
  locked: boolean;
  onboardingTraceCtx?: TraceContext;
}

interface LoginProps {
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

/**
 * View where returning users can authenticate
 */
const Login: React.FC<LoginProps> = ({ saveOnboardingEvent }) => {
  const { isEnabled: isMetricsEnabled } = useMetrics();

  const fieldRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [startOnboardingAnimation, setStartOnboardingAnimation] =
    useState(false);
  const [startFoxAnimation, setStartFoxAnimation] = useState<
    false | 'Start' | 'Loader'
  >(false);

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: LoginRouteParams }, 'params'>>();
  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(stylesheet, EmptyRecordConstant);

  const passwordLoginAttemptTraceCtxRef = useRef<TraceContext | null>(null);

  const setStartFoxAnimationCallback = () => {
    setStartFoxAnimation('Start');
  };

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

  const {
    biometryType,
    rememberMe,
    setRememberMe,
    biometryChoice,
    setBiometryChoice,
    hasBiometricCredentials,
    setHasBiometricCredentials,
    updateBiometryChoice,
  } = useUserAuthPreferences({
    locked: route?.params?.locked,
  });

  const navigateToHome = async () => {
    navigation.replace(Routes.ONBOARDING.HOME_NAV);
  };

  const checkMetricsUISeen = async (): Promise<void> => {
    const isOptinMetaMetricsUISeen = await StorageWrapper.getItem(
      OPTIN_META_METRICS_UI_SEEN,
    );

    if (!isOptinMetaMetricsUISeen && !isMetricsEnabled()) {
      navigation.reset({
        routes: [
          {
            name: Routes.ONBOARDING.ROOT_NAV,
            params: {
              screen: Routes.ONBOARDING.NAV,
              params: {
                screen: Routes.ONBOARDING.OPTIN_METRICS,
              },
            },
          },
        ],
      });
    } else {
      navigateToHome();
    }
  };

  const {
    onLogin,
    tryBiometric,
    finalLoading,
    error,
    setError,
    disabledInput,
    isSeedlessPasswordOutdated,
  } = useUnlockLogic({
    password,
    biometryChoice,
    rememberMe,
    onLoginSuccess: checkMetricsUISeen,
    passwordLoginAttemptTraceCtxRef,
    onboardingTraceCtx: route.params?.onboardingTraceCtx,
    setBiometryChoice,
  });

  usePasswordOutdated(setError);

  const handleBackPress = () => {
    Authentication.lockApp();
    return false;
  };

  useEffect(() => {
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
    });
    track(MetaMetricsEvents.LOGIN_SCREEN_VIEWED, {});
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    setTimeout(() => {
      setStartOnboardingAnimation(true);
    }, 100);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onboardingTraceCtxFromRoute = route.params?.onboardingTraceCtx;
    if (onboardingTraceCtxFromRoute) {
      passwordLoginAttemptTraceCtxRef.current = trace({
        name: TraceName.OnboardingPasswordLoginAttempt,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: onboardingTraceCtxFromRoute,
      });
    }
  }, [route.params?.onboardingTraceCtx]);

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
    !isSeedlessPasswordOutdated &&
    biometryChoice &&
    biometryType &&
    hasBiometricCredentials &&
    !route?.params?.locked
  );

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    setError(null);
  };

  const handleUpdateRememberMe = (rememberMeChoice: boolean) => {
    setRememberMe(rememberMeChoice);
  };

  const handleTryBiometric = async () => {
    fieldRef.current?.blur();
    await tryBiometric();
    setPassword('');
    setHasBiometricCredentials(false);
    fieldRef.current?.clear();
  };

  const handleLogin = async () => {
    await onLogin();
    setPassword('');
    setHasBiometricCredentials(false);
    fieldRef.current?.clear();
  };

  const shouldRenderBiometricLogin = biometryType;

  return (
    <ErrorBoundary navigation={navigation} view="Login">
      <SafeAreaView
        style={[
          styles.mainWrapper,
          {
            backgroundColor:
              themeAppearance === 'dark'
                ? importedColors.gettingStartedTextColor
                : importedColors.gettingStartedPageBackgroundColorLightMode,
          },
        ]}
      >
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          resetScrollToCoords={{ x: 0, y: 0 }}
          style={styles.wrapper}
          contentContainerStyle={styles.scrollContentContainer}
          extraScrollHeight={Platform.OS === 'android' ? 50 : 0}
          enableResetScrollToCoords={false}
        >
          <View testID={LoginViewSelectors.CONTAINER} style={styles.container}>
            <OnboardingAnimation
              startOnboardingAnimation={startOnboardingAnimation}
              setStartFoxAnimation={setStartFoxAnimationCallback}
            >
              <View style={styles.field}>
                <LoginPasswordField
                  password={password}
                  onPasswordChange={handlePasswordChange}
                  onSubmit={handleLogin}
                  error={error}
                  disabled={disabledInput}
                  fieldRef={fieldRef}
                  biometryButton={
                    <BiometryButton
                      onPress={handleTryBiometric}
                      hidden={shouldHideBiometricAccessoryButton}
                      biometryType={biometryType as BIOMETRY_TYPE}
                    />
                  }
                  themeAppearance={themeAppearance}
                  colors={colors}
                  testID={LoginViewSelectors.PASSWORD_INPUT}
                  style={styles.textField}
                />
              </View>

              <LoginErrorMessage
                error={error}
                testID={LoginViewSelectors.PASSWORD_ERROR}
                style={styles.helperTextContainer}
              />

              <View style={styles.ctaWrapper} pointerEvents="box-none">
                <LoginOptionsSwitch
                  shouldRenderBiometricOption={shouldRenderBiometricLogin}
                  biometryChoiceState={biometryChoice}
                  onUpdateBiometryChoice={updateBiometryChoice}
                  onUpdateRememberMe={handleUpdateRememberMe}
                />
                <Button
                  variant={ButtonVariants.Primary}
                  width={ButtonWidthTypes.Full}
                  size={ButtonSize.Lg}
                  onPress={handleLogin}
                  label={strings('login.unlock_button')}
                  isDisabled={
                    password.length === 0 || disabledInput || finalLoading
                  }
                  testID={LoginViewSelectors.LOGIN_BUTTON_ID}
                  loading={finalLoading}
                />

                <Button
                  style={styles.goBack}
                  variant={ButtonVariants.Link}
                  onPress={toggleWarningModal}
                  testID={LoginViewSelectors.RESET_WALLET}
                  label={strings('login.forgot_password')}
                  isDisabled={finalLoading}
                  size={ButtonSize.Lg}
                />
              </View>
            </OnboardingAnimation>
          </View>
        </KeyboardAwareScrollView>
        <FadeOutOverlay />
        <TouchableOpacity
          style={styles.foxAnimationWrapper}
          delayLongPress={10 * 1000} // 10 seconds
          onLongPress={handleDownloadStateLogs}
          activeOpacity={1}
        >
          <FoxAnimation
            hasFooter={false}
            trigger={startFoxAnimation || undefined}
          />
        </TouchableOpacity>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(Login);
