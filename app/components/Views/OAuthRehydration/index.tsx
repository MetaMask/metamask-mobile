import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  SafeAreaView,
  Image,
  BackHandler,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
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
import Routes from '../../../constants/navigation/Routes';
import ErrorBoundary from '../ErrorBoundary';
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
import OAuthService from '../../../core/OAuthService/OAuthService';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { useMetrics } from '../../hooks/useMetrics';
import { LoginOptionsSwitch } from '../../UI/LoginOptionsSwitch';
import FOX_LOGO from '../../../images/branding/fox.png';
import METAMASK_NAME from '../../../images/branding/metamask-name.png';
import { useLoginLogic } from '../Login/hooks/useLoginLogic';
import { useAuthPreferences } from '../Login/hooks/useAuthPreferences';
import { usePasswordOutdated } from '../Login/hooks/usePasswordOutdated';
import { LoginPasswordField } from '../Login/components/LoginPasswordField';
import { LoginErrorMessage } from '../Login/components/LoginErrorMessage';
import Label from '../../../component-library/components/Form/Label';

const EmptyRecordConstant = {};

interface OAuthRehydrationRouteParams {
  locked: boolean;
  oauthLoginSuccess: boolean;
  onboardingTraceCtx?: TraceContext;
}

interface OAuthRehydrationProps {
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) => void;
}

const OAuthRehydration: React.FC<OAuthRehydrationProps> = ({
  saveOnboardingEvent,
}) => {
  const { isEnabled: isMetricsEnabled } = useMetrics();

  const fieldRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [errorToThrow, setErrorToThrow] = useState<Error | null>(null);
  const [rehydrationFailedAttempts, setRehydrationFailedAttempts] = useState(0);

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<{ params: OAuthRehydrationRouteParams }, 'params'>>();
  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(stylesheet, EmptyRecordConstant);

  const passwordLoginAttemptTraceCtxRef = useRef<TraceContext | null>(null);

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
  } = useAuthPreferences({
    locked: route?.params?.locked,
  });

  const navigateToHome = async () => {
    navigation.replace(Routes.ONBOARDING.HOME_NAV);
  };

  const {
    onLogin,
    tryBiometric,
    finalLoading,
    error,
    setError,
    disabledInput,
    isSeedlessPasswordOutdated,
  } = useLoginLogic({
    isOAuthRehydration: true,
    password,
    biometryChoice,
    rememberMe,
    rehydrationFailedAttempts,
    setRehydrationFailedAttempts,
    saveOnboardingEvent,
    onLoginSuccess: navigateToHome,
    passwordLoginAttemptTraceCtxRef,
    onboardingTraceCtx: route.params?.onboardingTraceCtx,
    setBiometryChoice,
    setErrorToThrow,
  });

  usePasswordOutdated(setError);

  const handleBackPress = () => {
    navigation.goBack();
    return false;
  };

  useEffect(() => {
    trace({
      name: TraceName.LoginUserInteraction,
      op: TraceOperation.Login,
    });
    track(MetaMetricsEvents.LOGIN_SCREEN_VIEWED, {});
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);

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

  const handleUseOtherMethod = () => {
    track(MetaMetricsEvents.USE_DIFFERENT_LOGIN_METHOD_CLICKED, {
      account_type: 'social',
    });
    navigation.goBack();
    OAuthService.resetOauthState();
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

  const ThrowErrorIfNeeded = () => {
    if (errorToThrow) {
      throw errorToThrow;
    }
    return null;
  };

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
    <ErrorBoundary
      navigation={navigation}
      view="OAuthRehydration"
      useOnboardingErrorHandling={!!errorToThrow && !isMetricsEnabled()}
    >
      <ThrowErrorIfNeeded />
      <SafeAreaView style={styles.mainWrapper}>
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          resetScrollToCoords={{ x: 0, y: 0 }}
          style={styles.wrapper}
          contentContainerStyle={styles.scrollContentContainer}
          extraScrollHeight={Platform.OS === 'android' ? -200 : 0}
          enableResetScrollToCoords={false}
        >
          <View testID={LoginViewSelectors.CONTAINER} style={styles.container}>
            <View style={styles.oauthContentWrapper}>
              <Image
                source={METAMASK_NAME}
                style={styles.metamaskName}
                resizeMode="contain"
                resizeMethod={'auto'}
              />

              <TouchableOpacity
                style={styles.foxWrapper}
                delayLongPress={10 * 1000}
                onLongPress={handleDownloadStateLogs}
                activeOpacity={1}
              >
                <Image
                  source={FOX_LOGO}
                  style={styles.image}
                  resizeMethod={'auto'}
                />
              </TouchableOpacity>

              <Text
                variant={TextVariant.DisplayMD}
                color={TextColor.Default}
                style={styles.title}
                testID={LoginViewSelectors.TITLE_ID}
              >
                {strings('login.title')}
              </Text>

              <View style={styles.field}>
                <Label
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                  style={styles.label}
                >
                  {strings('login.password')}
                </Label>
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
                />
              </View>

              <LoginErrorMessage
                error={error}
                testID={LoginViewSelectors.PASSWORD_ERROR}
                style={styles.helperTextContainer}
              />

              <View style={styles.ctaWrapperRehydration}>
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
              </View>

              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={handleUseOtherMethod}
                  disabled={finalLoading}
                  testID={LoginViewSelectors.OTHER_METHODS_BUTTON}
                >
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Primary}
                  >
                    {strings('login.other_methods')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAwareScrollView>
        <FadeOutOverlay />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const mapDispatchToProps = (dispatch: Dispatch<OnboardingActionTypes>) => ({
  saveOnboardingEvent: (...eventArgs: [ITrackingEvent]) =>
    dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(OAuthRehydration);
