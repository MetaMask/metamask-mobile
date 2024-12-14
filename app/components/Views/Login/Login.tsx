import { useEffect, useRef, useState } from 'react';
import {
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectUserLoggedIn } from '../../../reducers/user';
import { useStyles } from '../../../component-library/hooks/useStyles';
import styleSheet from './styles';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
// import {
//   trace,
//   TraceName,
//   TraceOperation,
//   endTrace,
// } from '../../../util/trace';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';
import ErrorBoundary from '../ErrorBoundary';
import { useNavigation } from '@react-navigation/native';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Text from '../../../component-library/components/Texts/Text';
import Label from '../../../component-library/components/Form/Label';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { Authentication } from '../../../core/Authentication/Authentication';
import { toLowerCaseEquals } from '../../../util/general';
import {
  DENY_PIN_ERROR_ANDROID,
  JSON_PARSE_ERROR_UNEXPECTED_TOKEN,
  PASSCODE_NOT_SET_ERROR,
  VAULT_ERROR,
  WRONG_PASSWORD_ERROR,
  WRONG_PASSWORD_ERROR_ANDROID,
} from './constants';
import { containsErrorMessage } from '../../../util/errorHandling';
import Routes from '../../../constants/navigation/Routes';
import Logger from '../../../util/Logger';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
// import storageWrapper from '../../../store/storage-wrapper';
// import { ONBOARDING_WIZARD } from '../../../constants/storage';
import { passwordRequirementsMet } from '../../../util/password';
import setOnboardingWizardStep from '../../../actions/wizard';

const Login: React.FC = () => {
  const [password, setPassword] = useState('');
  //   const [biometryType, setBiometryType] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometryChoice, setBiometryChoice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  //   const [biometryPreviouslyDisabled, setBiometryPreviouslyDisabled] =
  //     useState(false);
  //   const [warningModalVisible, setWarningModalVisible] = useState(false);
  //   const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  //   const [disableDelete, setDisableDelete] = useState(true);
  //   const [deleteText, setDeleteText] = useState('');
  //   const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  //   const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);
  const fieldRef = useRef<TextInput | null>(null);

  const userLoggedIn = useSelector(selectUserLoggedIn);
  const dispatch = useDispatch();
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();

  // Component did mount lifecycle
  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.LOGIN_SCREEN_VIEWED).build(),
    );
    // TODO: Add biometry setup logic
  }, [trackEvent, createEventBuilder]);

  const onLogin = async () => {
    // endTrace({ name: TraceName.LoginUserInteraction });
    const locked = !passwordRequirementsMet(password);
    if (locked) setError(strings('login.invalid_password'));
    if (loading || locked) return;

    setLoading(true);
    setError('');
    const authType = await Authentication.componentAuthenticationType(
      biometryChoice,
      rememberMe,
    );

    try {
      await Authentication.userEntryAuth(password, authType);
      //   await trace(
      //     {
      //       name: TraceName.AuthenticateUser,
      //       op: TraceOperation.Login,
      //       parentContext: this.parentSpan,
      //     },
      //     async () => {
      //       await Authentication.userEntryAuth(password, authType);
      //     },
      //   );
      Keyboard.dismiss();

      // Get onboarding wizard state
      //   const onboardingWizard = await storageWrapper.getItem(ONBOARDING_WIZARD);
      //   if (onboardingWizard) {
      //     navigation.replace(Routes.ONBOARDING.HOME_NAV);
      //   } else {
      dispatch(setOnboardingWizardStep(1));
      navigation.replace(Routes.ONBOARDING.HOME_NAV);
      //   }
      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      //   setLoading(false);
      //   setPassword('');
      //   setHasBiometricCredentials(false);
      //   fieldRef.current?.clear();
    } catch (e) {
      const errorString = (e as Error).toString();
      if (
        toLowerCaseEquals(errorString, WRONG_PASSWORD_ERROR) ||
        toLowerCaseEquals(errorString, WRONG_PASSWORD_ERROR_ANDROID)
      ) {
        setLoading(false);
        setError(strings('login.invalid_password'));

        trackErrorAsAnalytics('Login: Invalid Password', errorString);

        return;
      } else if (errorString === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('login.security_alert_title'),
          strings('login.security_alert_desc'),
        );
        setLoading(false);
      } else if (
        containsErrorMessage(e as Error, VAULT_ERROR) ||
        containsErrorMessage(e as Error, JSON_PARSE_ERROR_UNEXPECTED_TOKEN)
      ) {
        try {
          //   await this.handleVaultCorruption();
        } catch (error) {
          // we only want to display this error to the user IF we fail to handle vault corruption
          Logger.error(e as Error, 'Failed to handle vault corruption');
          setError(strings('login.clean_vault_error'));
          setLoading(false);
        }
      } else if (toLowerCaseEquals(errorString, DENY_PIN_ERROR_ANDROID)) {
        setLoading(false);
        // this.updateBiometryChoice(false);
      } else {
        setLoading(false);
        setError(errorString);
      }
      Logger.error(e as Error, 'Failed to unlock');
    }
    // endTrace({ name: TraceName.Login });
  };

  const onChangeText = (val: string) => setPassword(val);

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
              //   onLongPress={this.handleDownloadStateLogs}
              activeOpacity={1}
            >
              {/* {Device.isAndroid() ? (
                <Image
                  source={require('../../../images/fox.png')}
                  style={styles.image}
                  resizeMethod={'auto'}
                />
              ) : (
                <AnimatedFox bgColor={colors.background.default} />
              )} */}
              <Image
                source={require('../../../images/fox.png')}
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
                onChangeText={onChangeText}
                value={password}
                // baseColor={colors.border.default}
                // tintColor={colors.primary.default}
                onSubmitEditing={onLogin}
                // endAccessory={
                //   <BiometryButton
                //     onPress={this.tryBiometric}
                //     hidden={shouldHideBiometricAccessoryButton}
                //     biometryType={this.state.biometryType}
                //   />
                // }
                // keyboardAppearance={themeAppearance}
              />
            </View>

            {/* {this.renderSwitch()}

            {!!this.state.error && (
              <HelpText
                severity={HelpTextSeverity.Error}
                variant={TextVariant.BodyMD}
                testID={LoginViewSelectors.PASSWORD_ERROR}
              >
                {this.state.error}
              </HelpText>
            )} */}
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

            {/* <View style={styles.footer}>
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
            </View> */}
          </View>
        </KeyboardAwareScrollView>
        {/* <FadeOutOverlay /> */}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default Login;
