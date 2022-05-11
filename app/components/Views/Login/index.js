import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  Switch,
  Alert,
  ActivityIndicator,
  Text,
  View,
  SafeAreaView,
  StyleSheet,
  Image,
  InteractionManager,
  TouchableWithoutFeedback,
  Keyboard,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Button from 'react-native-button';
import StyledButton from '../../UI/StyledButton';
import { fontStyles, colors as importedColors } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import setOnboardingWizardStep from '../../../actions/wizard';
import { connect } from 'react-redux';
import Device from '../../../util/device';
import { passcodeType } from '../../../util/auth';
import { OutlinedTextField } from 'react-native-material-textfield';
import BiometryButton from '../../UI/BiometryButton';
import Logger from '../../../util/Logger';
import {
  BIOMETRY_CHOICE_DISABLED,
  ONBOARDING_WIZARD,
  TRUE,
  EXISTING_USER,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import { passwordRequirementsMet } from '../../../util/password';
import ErrorBoundary from '../ErrorBoundary';
import WarningExistingUserModal from '../../UI/WarningExistingUserModal';
import Icon from 'react-native-vector-icons/FontAwesome';
import { trackErrorAsAnalytics } from '../../../util/analyticsV2';
import { tlc, toLowerCaseEquals } from '../../../util/general';
import DefaultPreference from 'react-native-default-preference';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { ThemeContext, mockTheme } from '../../../util/theme';
import AnimatedFox from 'react-native-animated-fox';
import {
  DELETE_WALLET_CONTAINER_ID,
  DELETE_WALLET_INPUT_BOX_ID,
  LOGIN_PASSWORD_ERROR,
  RESET_WALLET_ID,
} from '../../../constants/test-ids';

const deviceHeight = Device.getDeviceHeight();
const breakPoint = deviceHeight < 700;

const createStyles = (colors) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
      paddingHorizontal: 32,
    },
    foxWrapper: {
      justifyContent: 'center',
      alignSelf: 'center',
      width: Device.isIos() ? 130 : 100,
      height: Device.isIos() ? 130 : 100,
      marginTop: 100,
    },
    image: {
      alignSelf: 'center',
      width: Device.isIos() ? 130 : 100,
      height: Device.isIos() ? 130 : 100,
    },
    title: {
      fontSize: Device.isAndroid() ? 30 : 35,
      marginTop: 20,
      marginBottom: 20,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.bold,
    },
    field: {
      flex: 1,
      marginBottom: Device.isAndroid() ? 0 : 10,
      flexDirection: 'column',
    },
    label: {
      color: colors.text.default,
      fontSize: 16,
      marginBottom: 12,
      ...fontStyles.normal,
    },
    ctaWrapper: {
      marginTop: 20,
    },
    footer: {
      marginVertical: 40,
    },
    errorMsg: {
      color: colors.error.default,
      ...fontStyles.normal,
      lineHeight: 20,
    },
    goBack: {
      marginVertical: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    biometrics: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 30,
    },
    biometryLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    biometrySwitch: {
      flex: 0,
    },
    input: {
      ...fontStyles.normal,
      fontSize: 16,
      paddingTop: 2,
      color: colors.text.default,
    },
    cant: {
      width: 280,
      alignSelf: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.normal,
      fontSize: 16,
      lineHeight: 24,
      color: colors.text.default,
    },
    areYouSure: {
      width: '100%',
      padding: breakPoint ? 16 : 24,
      justifyContent: 'center',
      alignSelf: 'center',
    },
    heading: {
      marginHorizontal: 6,
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 20,
      textAlign: 'center',
      lineHeight: breakPoint ? 24 : 26,
    },
    red: {
      marginHorizontal: 24,
      color: colors.error.default,
    },
    warningText: {
      ...fontStyles.normal,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: breakPoint ? 18 : 22,
      color: colors.text.default,
      marginTop: 20,
    },
    warningIcon: {
      alignSelf: 'center',
      color: colors.error.default,
      marginVertical: 10,
    },
    bold: {
      ...fontStyles.bold,
    },
    delete: {
      marginBottom: 20,
    },
    deleteWarningMsg: {
      ...fontStyles.normal,
      fontSize: 16,
      lineHeight: 20,
      marginTop: 10,
      color: colors.error.default,
    },
  });

const DELETE = 'delete';
const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';
const WRONG_PASSWORD_ERROR = 'Error: Decrypt failed';
const WRONG_PASSWORD_ERROR_ANDROID =
  'Error: Error: error:1e000065:Cipher functions:OPENSSL_internal:BAD_DECRYPT';
const VAULT_ERROR = 'Error: Cannot unlock without a previous vault.';
const isTextDelete = (text) => tlc(text) === DELETE;

/**
 * View where returning users can authenticate
 */
class Login extends PureComponent {
  static propTypes = {
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * Action to set onboarding wizard step
     */
    setOnboardingWizardStep: PropTypes.func,
    /**
     * Route passed in props from navigation
     */
    route: PropTypes.object,
    /**
     * Users current address
     */
    selectedAddress: PropTypes.string,
  };

  state = {
    password: '',
    biometryType: null,
    rememberMe: false,
    biometryChoice: false,
    loading: false,
    error: null,
    biometryPreviouslyDisabled: false,
    warningModalVisible: false,
    deleteModalVisible: false,
    disableDelete: true,
    deleteText: '',
    showDeleteWarning: false,
    hasBiometricCredentials: false,
  };

  fieldRef = React.createRef();

  async componentDidMount() {
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);

    //Setup UI to handle Biometric
    const { type } = await Authentication.getType();
    const previouslyDisabled = await AsyncStorage.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodePreviouslyDisabled = await AsyncStorage.getItem(
      PASSCODE_DISABLED,
    );
    if (type === AUTHENTICATION_TYPE.BIOMETRIC)
      this.setState({
        biometryType: type,
        biometryChoice: !(previouslyDisabled && previouslyDisabled === TRUE),
        biometryPreviouslyDisabled: !!previouslyDisabled,
        hasBiometricCredentials: !this.props.route?.params?.params?.logout,
      });
    else if (type === AUTHENTICATION_TYPE.PASSCODE)
      this.setState({
        biometryType: passcodeType(type),
        biometryChoice: !(
          passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE
        ),
        biometryPreviouslyDisabled: !!passcodePreviouslyDisabled,
        hasBiometricCredentials: !this.props.route?.params?.params?.logout,
      });
    else if (type === AUTHENTICATION_TYPE.REMEMBER_ME)
      this.setState({
        hasBiometricCredentials: false,
        rememberMe: true,
      });
  }

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
  }

  handleBackPress = async () => {
    await Authentication.logout();
    return false;
  };

  onLogin = async () => {
    const { password } = this.state;
    const { current: field } = this.fieldRef;
    const locked = !passwordRequirementsMet(password);
    if (locked) this.setState({ error: strings('login.invalid_password') });
    if (this.state.loading || locked) return;

    const authType = await Authentication.componentAuthenticationType(
      this.state.biometryChoice,
      this.state.rememberMe,
    );

    try {
      await Authentication.userEntryAuth(
        password,
        authType,
        this.props.selectedAddress,
      );
      const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
      if (!onboardingWizard) this.props.setOnboardingWizardStep(1);
      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      this.setState({
        loading: false,
        password: '',
        hasBiometricCredentials: false,
      });
      field.setValue('');
    } catch (e) {
      const error = e.toString();
      if (
        toLowerCaseEquals(error, WRONG_PASSWORD_ERROR) ||
        toLowerCaseEquals(error, WRONG_PASSWORD_ERROR_ANDROID)
      ) {
        this.setState({
          loading: false,
          error: strings('login.invalid_password'),
        });

        trackErrorAsAnalytics('Login: Invalid Password', error);

        return;
      } else if (error === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          'Security Alert',
          'In order to proceed, you need to turn Passcode on or any biometrics authentication method supported in your device (FaceID, TouchID or Fingerprint)',
        );
        this.setState({ loading: false });
      } else if (toLowerCaseEquals(error, VAULT_ERROR)) {
        this.setState({
          loading: false,
          error: strings('login.clean_vault_error'),
        });
      } else {
        this.setState({ loading: false, error });
      }
    }
  };

  tryBiometric = async (e) => {
    if (e) e.preventDefault();
    const { current: field } = this.fieldRef;
    field?.blur();
    try {
      await Authentication.appTriggeredAuth(this.props.selectedAddress);
      const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
      if (!onboardingWizard) this.props.setOnboardingWizardStep(1);
      // Only way to land back on Login is to log out, which clears credentials (meaning we should not show biometric button)
      this.setState({
        loading: false,
        password: '',
        hasBiometricCredentials: false,
      });
      field.setValue('');
    } catch (error) {
      this.setState({ hasBiometricCredentials: true });
      Logger.log(error);
    }
    field?.blur();
  };

  triggerLogIn = () => {
    this.onLogin();
  };

  delete = async () => {
    try {
      await Authentication.newWalletAndKeyChain(`${Date.now()}`);
      this.deleteExistingUser();
      await Authentication.logout();
    } catch (error) {
      Logger.log(error, `Failed to createNewVaultAndKeychain: ${error}`);
    }
  };

  deleteExistingUser = async () => {
    try {
      await AsyncStorage.removeItem(EXISTING_USER);
      // We need to reset instead of navigate here otherwise, OnboardingRootNav remembers the last screen that it was on, which is most likely not OnboardingNav.
      this.props.navigation?.reset({
        routes: [
          {
            name: 'OnboardingRootNav',
            state: {
              routes: [
                {
                  name: 'OnboardingNav',
                  params: { screen: 'Onboarding', params: { delete: true } },
                },
              ],
            },
          },
        ],
      });
    } catch (error) {
      Logger.log(
        error,
        `Failed to remove key: ${EXISTING_USER} from AsyncStorage`,
      );
    }
  };

  toggleWarningModal = () =>
    this.setState((state) => ({
      warningModalVisible: !state.warningModalVisible,
    }));

  toggleDeleteModal = () =>
    this.setState((state) => ({
      deleteModalVisible: !state.deleteModalVisible,
    }));

  checkDelete = (text) => {
    this.setState({
      deleteText: text,
      showDeleteWarning: false,
      disableDelete: !isTextDelete(text),
    });
  };

  submitDelete = () => {
    const { deleteText } = this.state;
    this.setState({ showDeleteWarning: !isTextDelete(deleteText) });
    if (isTextDelete(deleteText)) this.delete();
  };

  updateBiometryChoice = async (biometryChoice) => {
    if (!biometryChoice) {
      await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
      await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
    } else {
      await AsyncStorage.removeItem(BIOMETRY_CHOICE_DISABLED);
      await AsyncStorage.removeItem(PASSCODE_DISABLED);
    }
    this.setState({ biometryChoice });
  };

  renderSwitch = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (this.state.biometryType && !this.state.biometryPreviouslyDisabled) {
      return (
        <View style={styles.biometrics}>
          <Text style={styles.biometryLabel}>
            {strings(
              `biometrics.enable_${this.state.biometryType.toLowerCase()}`,
            )}
          </Text>
          <Switch
            onValueChange={(biometryChoice) =>
              this.updateBiometryChoice(biometryChoice)
            } // eslint-disable-line react/jsx-no-bind
            value={this.state.biometryChoice}
            style={styles.biometrySwitch}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={importedColors.white}
            ios_backgroundColor={colors.border.muted}
          />
        </View>
      );
    }

    return (
      <View style={styles.biometrics}>
        <Text style={styles.biometryLabel}>
          {strings(`choose_password.remember_me`)}
        </Text>
        <Switch
          onValueChange={(rememberMe) => this.setState({ rememberMe })} // eslint-disable-line react/jsx-no-bind
          value={this.state.rememberMe}
          style={styles.biometrySwitch}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={importedColors.white}
          ios_backgroundColor={colors.border.muted}
        />
      </View>
    );
  };

  setPassword = (val) => this.setState({ password: val });

  onCancelPress = () => {
    this.toggleWarningModal();
    InteractionManager.runAfterInteractions(this.toggleDeleteModal);
  };

  render = () => {
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    return (
      <ErrorBoundary view="Login">
        <WarningExistingUserModal
          warningModalVisible={this.state.warningModalVisible}
          cancelText={strings('login.i_understand')}
          onCancelPress={this.onCancelPress}
          onRequestClose={this.toggleWarningModal}
          onConfirmPress={this.toggleWarningModal}
        >
          <View style={styles.areYouSure} testID={DELETE_WALLET_CONTAINER_ID}>
            <Icon
              style={styles.warningIcon}
              size={46}
              color={colors.error.default}
              name="exclamation-triangle"
            />
            <Text style={[styles.heading, styles.red]}>
              {strings('login.are_you_sure')}
            </Text>
            <Text style={styles.warningText}>
              <Text>{strings('login.your_current_wallet')}</Text>
              <Text style={styles.bold}>{strings('login.removed_from')}</Text>
              <Text>{strings('login.this_action')}</Text>
            </Text>
            <Text style={[styles.warningText, styles.noMarginBottom]}>
              <Text>{strings('login.you_can_only')}</Text>
              <Text style={styles.bold}>
                {strings('login.recovery_phrase')}
              </Text>
              <Text>{strings('login.metamask_does_not')}</Text>
            </Text>
          </View>
        </WarningExistingUserModal>

        <WarningExistingUserModal
          warningModalVisible={this.state.deleteModalVisible}
          cancelText={strings('login.delete_my')}
          cancelButtonDisabled={this.state.disableDelete}
          onCancelPress={this.submitDelete}
          onRequestClose={this.toggleDeleteModal}
          onConfirmPress={this.toggleDeleteModal}
          onSubmitEditing={this.submitDelete}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.areYouSure}>
              <Text style={[styles.heading, styles.delete]}>
                {strings('login.type_delete', { [DELETE]: DELETE })}
              </Text>
              <OutlinedTextField
                style={styles.input}
                testID={DELETE_WALLET_INPUT_BOX_ID}
                autoFocus
                returnKeyType={'done'}
                onChangeText={this.checkDelete}
                autoCapitalize="none"
                value={this.state.deleteText}
                baseColor={colors.border.default}
                tintColor={colors.primary.default}
                placeholderTextColor={colors.text.muted}
                onSubmitEditing={this.submitDelete}
                keyboardAppearance={themeAppearance}
              />
              {this.state.showDeleteWarning && (
                <Text style={styles.deleteWarningMsg}>
                  {strings('login.cant_proceed')}
                </Text>
              )}
            </View>
          </TouchableWithoutFeedback>
        </WarningExistingUserModal>

        <SafeAreaView style={styles.mainWrapper}>
          <KeyboardAwareScrollView
            style={styles.wrapper}
            resetScrollToCoords={{ x: 0, y: 0 }}
          >
            <View testID={'login'}>
              <View style={styles.foxWrapper}>
                {Device.isAndroid() ? (
                  <Image
                    source={require('../../../images/fox.png')}
                    style={styles.image}
                    resizeMethod={'auto'}
                  />
                ) : (
                  <AnimatedFox bgColor={colors.background.default} />
                )}
              </View>
              <Text style={styles.title}>{strings('login.title')}</Text>
              <View style={styles.field}>
                <Text style={styles.label}>{strings('login.password')}</Text>
                <OutlinedTextField
                  style={styles.input}
                  placeholder={strings('login.password')}
                  placeholderTextColor={colors.text.muted}
                  testID={'login-password-input'}
                  returnKeyType={'done'}
                  autoCapitalize="none"
                  secureTextEntry
                  ref={this.fieldRef}
                  onChangeText={this.setPassword}
                  value={this.state.password}
                  baseColor={colors.border.default}
                  tintColor={colors.primary.default}
                  onSubmitEditing={this.triggerLogIn}
                  renderRightAccessory={() => (
                    <BiometryButton
                      onPress={this.tryBiometric}
                      hidden={
                        !(
                          this.state.biometryChoice &&
                          this.state.biometryType &&
                          this.state.hasBiometricCredentials
                        )
                      }
                      type={this.state.biometryType}
                    />
                  )}
                  keyboardAppearance={themeAppearance}
                />
              </View>

              {this.renderSwitch()}

              {!!this.state.error && (
                <Text style={styles.errorMsg} testID={LOGIN_PASSWORD_ERROR}>
                  {this.state.error}
                </Text>
              )}
              <View style={styles.ctaWrapper} testID={'log-in-button'}>
                <StyledButton type={'confirm'} onPress={this.triggerLogIn}>
                  {this.state.loading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary.inverse}
                    />
                  ) : (
                    strings('login.unlock_button')
                  )}
                </StyledButton>
              </View>

              <View style={styles.footer}>
                <Text style={styles.cant}>{strings('login.go_back')}</Text>
                <Button
                  style={styles.goBack}
                  onPress={this.toggleWarningModal}
                  testID={RESET_WALLET_ID}
                >
                  {strings('login.reset_wallet')}
                </Button>
              </View>
            </View>
          </KeyboardAwareScrollView>
          <FadeOutOverlay />
        </SafeAreaView>
      </ErrorBoundary>
    );
  };
}

Login.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  userLoggedIn: state.user.userLoggedIn,
});

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Login);
