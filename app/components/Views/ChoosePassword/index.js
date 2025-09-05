import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  Alert,
  View,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { captureException } from '@sentry/react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import StorageWrapper from '../../../store/storage-wrapper';
import { connect } from 'react-redux';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import {
  passwordSet,
  passwordUnset,
  seedphraseNotBackedUp,
  setExistingUser,
} from '../../../actions/user';
import { setLockTime } from '../../../actions/settings';
import Engine from '../../../core/Engine';
import Device from '../../../util/device';
import {
  passcodeType,
  updateAuthTypeStorageFlags,
} from '../../../util/authentication';
import { strings } from '../../../../locales/i18n';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import AppConstants from '../../../core/AppConstants';
import zxcvbn from 'zxcvbn';
import Logger from '../../../util/Logger';
import { ONBOARDING, PREVIOUS_SCREEN } from '../../../constants/navigation';
import {
  TRUE,
  SEED_PHRASE_HINTS,
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
} from '../../../constants/storage';
import {
  getPasswordStrengthWord,
  passwordRequirementsMet,
  MIN_PASSWORD_LENGTH,
} from '../../../util/password';

import { MetaMetricsEvents } from '../../../core/Analytics';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import { ThemeContext, mockTheme } from '../../../util/theme';
import navigateTermsOfUse from '../../../util/termsOfUse/termsOfUse';
import { ChoosePasswordSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ChoosePassword.selectors';
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
import { withMetricsAwareness } from '../../hooks/useMetrics';
import fox from '../../../animations/Searching_Fox.json';
import LottieView from 'lottie-react-native';
import ErrorBoundary from '../ErrorBoundary';
import {
  TraceName,
  endTrace,
  trace,
  TraceOperation,
} from '../../../util/trace';
import { uint8ArrayToMnemonic } from '../../../util/mnemonic';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';

const createStyles = (colors) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
      paddingHorizontal: 16,
    },
    container: {
      flex: 1,
      flexDirection: 'column',
    },
    loadingWrapper: {
      paddingHorizontal: 16,
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'flex-start',
      alignContent: 'center',
      flex: 1,
      rowGap: 24,
    },
    foxWrapper: {
      width: Device.isMediumDevice() ? 180 : 220,
      height: Device.isMediumDevice() ? 180 : 220,
    },
    image: {
      alignSelf: 'center',
      width: Device.isMediumDevice() ? 180 : 220,
      height: Device.isMediumDevice() ? 180 : 220,
    },
    loadingTextContainer: {
      display: 'flex',
      flexDirection: 'column',
      rowGap: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    field: {
      position: 'relative',
      flexDirection: 'column',
      gap: 8,
    },
    ctaWrapper: {
      width: '100%',
      flexDirection: 'column',
      rowGap: 18,
      marginTop: 'auto',
      marginBottom: Platform.select({
        ios: 16,
        android: 24,
        default: 16,
      }),
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_weak: {
      color: colors.error.default,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_good: {
      color: colors.primary.default,
    },
    // eslint-disable-next-line react-native/no-unused-styles
    strength_strong: {
      color: colors.success.default,
    },
    learnMoreContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      gap: 8,
      marginTop: 8,
      marginBottom: 16,
    },
    learnMoreTextContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      gap: 1,
      flexWrap: 'wrap',
      width: '90%',
    },
    headerLeft: {
      marginLeft: 16,
    },
    headerRight: {
      marginRight: 16,
    },
    passwordContainer: {
      flexDirection: 'column',
      rowGap: 16,
      flexGrow: 1,
    },
    label: {
      marginBottom: -4,
    },
    checkbox: {
      alignItems: 'flex-start',
    },
    passwordContainerTitle: {
      flexDirection: 'column',
      rowGap: 4,
    },
  });

const PASSCODE_NOT_SET_ERROR = 'Error: Passcode not set.';

/**
 * View where users can set their password for the first time
 */
class ChoosePassword extends PureComponent {
  static propTypes = {
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * The action to update the password set flag
     * in the redux store
     */
    passwordSet: PropTypes.func,
    /**
     * The action to update the password set flag
     * in the redux store to false
     */
    passwordUnset: PropTypes.func,
    /**
     * The action to update the lock time
     * in the redux store
     */
    setLockTime: PropTypes.func,
    /**
     * Action to reset the flag seedphraseBackedUp in redux
     */
    seedphraseNotBackedUp: PropTypes.func,
    /**
     * Action to set existing user flag
     */
    setExistingUser: PropTypes.func,
    /**
     * Action to save onboarding event
     */
    saveOnboardingEvent: PropTypes.func,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
  };

  state = {
    isSelected: false,
    password: '',
    confirmPassword: '',
    secureTextEntry: true,
    biometryChoice: false,
    loading: false,
    error: null,
    errorToThrow: null,
    inputWidth: { width: '99%' },
    showPasswordIndex: [0, 1],
    passwordInputContainerFocusedIndex: -1,
  };

  mounted = true;
  passwordSetupAttemptTraceCtx = null;

  confirmPasswordInput = React.createRef();
  // Flag to know if password in keyring was set or not
  keyringControllerPasswordSet = false;

  track = (event, properties) => {
    const eventBuilder = MetricsEventBuilder.createEventBuilder(event);
    eventBuilder.addProperties(properties);
    trackOnboarding(eventBuilder.build(), this.props.saveOnboardingEvent);
  };

  getOauth2LoginSuccess = () => this.props.route.params?.oauthLoginSuccess;

  headerLeft = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const marginLeft = 16;
    return (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        disabled={this.state.loading}
      >
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Lg}
          color={colors.icon.default}
          style={{ marginLeft }}
        />
      </TouchableOpacity>
    );
  };

  updateNavBar = () => {
    const { route, navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getOnboardingNavbarOptions(
        route,
        {
          headerLeft: this.state.loading ? () => <View /> : this.headerLeft,
        },
        colors,
        false,
      ),
    );
  };

  termsOfUse = async () => {
    if (this.props.navigation) {
      await navigateTermsOfUse(this.props.navigation.navigate);
    }
  };

  async componentDidMount() {
    const { route } = this.props;
    const onboardingTraceCtx = route.params?.onboardingTraceCtx;
    if (onboardingTraceCtx) {
      this.passwordSetupAttemptTraceCtx = trace({
        name: TraceName.OnboardingPasswordSetupAttempt,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: onboardingTraceCtx,
      });
    }

    const authData = await Authentication.getType();
    const previouslyDisabled = await StorageWrapper.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodePreviouslyDisabled = await StorageWrapper.getItem(
      PASSCODE_DISABLED,
    );
    if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSCODE) {
      this.setState({
        biometryType: passcodeType(authData.currentAuthType),
        biometryChoice: !(
          passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE
        ),
      });
    } else if (authData.availableBiometryType) {
      this.setState({
        biometryType: authData.availableBiometryType,
        biometryChoice: !(previouslyDisabled && previouslyDisabled === TRUE),
      });
    }
    this.updateNavBar();
    setTimeout(() => {
      this.setState({
        inputWidth: { width: '100%' },
      });
    }, 100);
    this.termsOfUse();
  }

  componentDidUpdate(prevProps, prevState) {
    this.updateNavBar();
    const prevLoading = prevState.loading;
    const { loading } = this.state;
    const { navigation } = this.props;
    if (!prevLoading && loading) {
      // update navigationOptions
      navigation.setParams({
        headerLeft: () => <View />,
      });
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.passwordSetupAttemptTraceCtx) {
      endTrace({ name: TraceName.OnboardingPasswordSetupAttempt });
      this.passwordSetupAttemptTraceCtx = null;
    }
  }

  isOAuthPasswordCreationError = (error, authType) =>
    authType.oauth2Login &&
    error.message &&
    error.message.includes('SeedlessOnboardingController');

  handleOAuthPasswordCreationError = (error, authType) => {
    // If user has already consented to analytics, report error using regular Sentry
    if (this.props.metrics.isEnabled()) {
      authType.oauth2Login &&
        captureException(error, {
          tags: {
            view: 'ChoosePassword',
            context:
              'OAuth password creation failed - user consented to analytics',
          },
        });
    } else {
      // User hasn't consented to analytics yet, use ErrorBoundary onboarding flow
      authType.oauth2Login &&
        this.setState({
          loading: false,
          errorToThrow: new Error(
            `OAuth password creation failed: ${error.message}`,
          ),
        });
    }
  };

  setSelection = () => {
    const { isSelected } = this.state;
    this.setState(() => ({ isSelected: !isSelected }));
  };

  tryExportSeedPhrase = async (password) => {
    const { KeyringController } = Engine.context;
    const uint8ArrayMnemonic = await KeyringController.exportSeedPhrase(
      password,
    );
    return uint8ArrayToMnemonic(uint8ArrayMnemonic, wordlist).split(' ');
  };

  onPressCreate = async () => {
    const { loading, isSelected, password, confirmPassword } = this.state;
    const passwordsMatch = password !== '' && password === confirmPassword;
    const canSubmit = passwordsMatch && isSelected;
    if (loading) return;
    if (!canSubmit) {
      if (
        password !== '' &&
        confirmPassword !== '' &&
        password !== confirmPassword
      ) {
        this.track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
          wallet_setup_type: 'import',
          error_type: strings('choose_password.password_dont_match'),
        });
      }
      return;
    }
    if (!passwordRequirementsMet(password)) {
      this.track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
        wallet_setup_type: 'import',
        error_type: strings('choose_password.password_length_error'),
      });
      return;
    }

    const provider = this.props.route.params?.provider;
    const accountType = provider ? `metamask_${provider}` : 'metamask';

    this.track(MetaMetricsEvents.WALLET_CREATION_ATTEMPTED, {
      account_type: accountType,
    });

    try {
      this.setState({ loading: true });
      const previous_screen = this.props.route.params?.[PREVIOUS_SCREEN];

      const authType = await Authentication.componentAuthenticationType(
        true,
        true,
      );

      authType.oauth2Login = this.getOauth2LoginSuccess();

      const onboardingTraceCtx = this.props.route.params?.onboardingTraceCtx;
      trace({
        name: TraceName.OnboardingSRPAccountCreationTime,
        op: TraceOperation.OnboardingUserJourney,
        parentContext: onboardingTraceCtx,
        tags: {
          is_social_login: Boolean(provider),
          account_type: accountType,
          biometrics_enabled: Boolean(this.state.biometryType),
        },
      });

      Logger.log('previous_screen', previous_screen);
      if (previous_screen.toLowerCase() === ONBOARDING.toLowerCase()) {
        try {
          await Authentication.newWalletAndKeychain(password, authType);
        } catch (error) {
          if (this.isOAuthPasswordCreationError(error, authType)) {
            this.handleOAuthPasswordCreationError(error, authType);
            return;
          }
          if (Device.isIos) {
            await this.handleRejectedOsBiometricPrompt();
          }
        }
        this.keyringControllerPasswordSet = true;
        this.props.seedphraseNotBackedUp();
      } else {
        await this.recreateVault(password, authType);
      }

      this.props.passwordSet();
      this.props.setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);

      if (authType.oauth2Login) {
        endTrace({ name: TraceName.OnboardingNewSocialCreateWallet });
        endTrace({ name: TraceName.OnboardingJourneyOverall });

        if (this.props.metrics.isEnabled()) {
          this.props.navigation.reset({
            index: 0,
            routes: [
              {
                name: Routes.ONBOARDING.SUCCESS,
                params: { showPasswordHint: true },
              },
            ],
          });
        } else {
          this.props.navigation.navigate('OptinMetrics', {
            onContinue: () => {
              this.props.navigation.reset({
                index: 0,
                routes: [
                  {
                    name: Routes.ONBOARDING.SUCCESS,
                    params: { showPasswordHint: true },
                  },
                ],
              });
            },
          });
        }
      } else {
        const seedPhrase = await this.tryExportSeedPhrase(password);
        this.props.navigation.replace('AccountBackupStep1', {
          seedPhrase,
        });
      }
      this.track(MetaMetricsEvents.WALLET_CREATED, {
        biometrics_enabled: Boolean(this.state.biometryType),
        account_type: accountType,
      });
      this.track(MetaMetricsEvents.WALLET_SETUP_COMPLETED, {
        wallet_setup_type: 'new',
        new_wallet: true,
        account_type: accountType,
      });
      endTrace({ name: TraceName.OnboardingSRPAccountCreationTime });
    } catch (error) {
      try {
        await this.recreateVault('');
      } catch (e) {
        Logger.error(e);
      }
      // Set state in app as it was with no password
      this.props.setExistingUser(true);
      await StorageWrapper.removeItem(SEED_PHRASE_HINTS);
      this.props.passwordUnset();
      this.props.setLockTime(-1);
      // Should we force people to enable passcode / biometrics?
      if (error.toString() === PASSCODE_NOT_SET_ERROR) {
        Alert.alert(
          strings('choose_password.security_alert_title'),
          strings('choose_password.security_alert_message'),
        );
        this.setState({ loading: false });
      } else {
        this.setState({ loading: false, error: error.toString() });
      }
      this.track(MetaMetricsEvents.WALLET_SETUP_FAILURE, {
        wallet_setup_type: 'new',
        error_type: error.toString(),
      });

      const onboardingTraceCtx = this.props.route.params?.onboardingTraceCtx;
      if (onboardingTraceCtx) {
        trace({
          name: TraceName.OnboardingPasswordSetupError,
          op: TraceOperation.OnboardingUserJourney,
          parentContext: onboardingTraceCtx,
          tags: { errorMessage: error.toString() },
        });
        endTrace({ name: TraceName.OnboardingPasswordSetupError });
      }
    }
  };

  /**
   * This function handles the case when the user rejects the OS prompt for allowing use of biometrics.
   * If this occurs we will create the wallet automatically with password as the login method
   */
  handleRejectedOsBiometricPrompt = async () => {
    const newAuthData = await Authentication.componentAuthenticationType(
      false,
      false,
    );

    const oauth2LoginSuccess = this.getOauth2LoginSuccess();
    newAuthData.oauth2Login = oauth2LoginSuccess;
    try {
      await Authentication.newWalletAndKeychain(
        this.state.password,
        newAuthData,
      );
    } catch (err) {
      if (this.isOAuthPasswordCreationError(err, newAuthData)) {
        this.handleOAuthPasswordCreationError(err, newAuthData);
        return;
      }
      throw Error(strings('choose_password.disable_biometric_error'));
    }
    this.setState({
      biometryType: newAuthData.availableBiometryType,
      biometryChoice: false,
    });
  };

  /**
   * Recreates a vault
   *
   * @param password - Password to recreate and set the vault with
   */
  recreateVault = async (password, authType) => {
    const { KeyringController } = Engine.context;
    const seedPhrase = await this.getSeedPhrase();
    let importedAccounts = [];
    try {
      const keychainPassword = this.keyringControllerPasswordSet
        ? this.state.password
        : '';
      // Get imported accounts
      const simpleKeyrings = KeyringController.state.keyrings.filter(
        (keyring) => keyring.type === 'Simple Key Pair',
      );
      for (let i = 0; i < simpleKeyrings.length; i++) {
        const simpleKeyring = simpleKeyrings[i];
        const simpleKeyringAccounts = await Promise.all(
          simpleKeyring.accounts.map((account) =>
            KeyringController.exportAccount(keychainPassword, account),
          ),
        );
        importedAccounts = [...importedAccounts, ...simpleKeyringAccounts];
      }
    } catch (e) {
      Logger.error(
        e,
        'error while trying to get imported accounts on recreate vault',
      );
    }

    // Recreate keyring with password given to this method
    await Authentication.newWalletAndRestore(
      password,
      authType,
      seedPhrase,
      true,
    );
    // Keyring is set with empty password or not
    this.keyringControllerPasswordSet = password !== '';

    // Get props to restore vault
    const hdKeyring = KeyringController.state.keyrings[0];
    const existingAccountCount = hdKeyring.accounts.length;

    // Create previous accounts again
    for (let i = 0; i < existingAccountCount - 1; i++) {
      await KeyringController.addNewAccount();
    }

    try {
      // Import imported accounts again
      for (let i = 0; i < importedAccounts.length; i++) {
        await KeyringController.importAccountWithStrategy('privateKey', [
          importedAccounts[i],
        ]);
      }
    } catch (e) {
      Logger.error(
        e,
        'error while trying to import accounts on recreate vault',
      );
    }
  };

  /**
   * Returns current vault seed phrase
   * It does it using an empty password or a password set by the user
   * depending on the state the app is currently in
   */
  getSeedPhrase = async () => {
    const { KeyringController } = Engine.context;
    const { password } = this.state;
    const keychainPassword = this.keyringControllerPasswordSet ? password : '';
    return await KeyringController.exportSeedPhrase(keychainPassword);
  };

  jumpToConfirmPassword = () => {
    const { current } = this.confirmPasswordInput;
    current && current.focus();
  };

  onPasswordChange = (val) => {
    const passInfo = zxcvbn(val);
    this.setState((prevState) => ({
      password: val,
      passwordStrength: passInfo.score,
      confirmPassword: val === '' ? '' : prevState.confirmPassword,
    }));
  };

  learnMore = () => {
    let learnMoreUrl =
      'https://support.metamask.io/managing-my-wallet/resetting-deleting-and-restoring/how-can-i-reset-my-password/';

    if (this.getOauth2LoginSuccess()) {
      learnMoreUrl =
        'https://support.metamask.io/configure/wallet/passwords-and-metamask/';
    }

    this.track(MetaMetricsEvents.EXTERNAL_LINK_CLICKED, {
      text: 'Learn More',
      location: 'choose_password',
      url: learnMoreUrl,
    });

    this.props.navigation.push('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: learnMoreUrl,
        title: 'support.metamask.io',
      },
    });
  };

  toggleShowPassword = (index) => {
    this.setState((prevState) => {
      const newShowPasswordIndex = prevState.showPasswordIndex.includes(index)
        ? prevState.showPasswordIndex.filter((i) => i !== index)
        : [...prevState.showPasswordIndex, index];
      return { showPasswordIndex: newShowPasswordIndex };
    });
  };

  setConfirmPassword = (val) => this.setState({ confirmPassword: val });

  checkError = () => {
    const { password, confirmPassword } = this.state;
    return (
      password !== '' && confirmPassword !== '' && password !== confirmPassword
    );
  };

  renderContent = () => {
    const { isSelected, password, passwordStrength, confirmPassword, loading } =
      this.state;
    const passwordsMatch = password !== '' && password === confirmPassword;
    const canSubmit =
      passwordsMatch && isSelected && password.length >= MIN_PASSWORD_LENGTH;
    const previousScreen = this.props.route.params?.[PREVIOUS_SCREEN];
    const passwordStrengthWord = getPasswordStrengthWord(passwordStrength);
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    return (
      <SafeAreaView style={styles.mainWrapper}>
        {loading ? (
          <View style={styles.loadingWrapper}>
            <View style={styles.foxWrapper}>
              <LottieView
                style={styles.image}
                autoPlay
                loop
                source={fox}
                resizeMode="contain"
              />
            </View>
            <ActivityIndicator size="large" color={colors.text.default} />
            <View style={styles.loadingTextContainer}>
              <Text
                variant={TextVariant.HeadingLG}
                color={colors.text.default}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {strings(
                  previousScreen === ONBOARDING
                    ? 'create_wallet.title'
                    : 'secure_your_wallet.creating_password',
                )}
              </Text>
              <Text
                variant={TextVariant.BodyMD}
                color={colors.text.alternative}
              >
                {strings('create_wallet.subtitle')}
              </Text>
            </View>
          </View>
        ) : (
          <KeyboardAwareScrollView
            contentContainerStyle={styles.wrapper}
            resetScrollToCoords={{ x: 0, y: 0 }}
          >
            <View style={styles.container}>
              {!this.getOauth2LoginSuccess() && (
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {strings('choose_password.steps', {
                    currentStep: 1,
                    totalSteps: 3,
                  })}
                </Text>
              )}

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
                    {this.getOauth2LoginSuccess()
                      ? strings('choose_password.description_social_login')
                      : strings('choose_password.description')}
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
                    placeholder={strings(
                      'import_from_seed.enter_strong_password',
                    )}
                    secureTextEntry={this.state.showPasswordIndex.includes(0)}
                    value={password}
                    onChangeText={this.onPasswordChange}
                    placeholderTextColor={colors.text.muted}
                    testID={ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}
                    onSubmitEditing={this.jumpToConfirmPassword}
                    submitBehavior="submit"
                    autoComplete="new-password"
                    returnKeyType="next"
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                    size={TextFieldSize.Lg}
                    endAccessory={
                      <Icon
                        name={
                          this.state.showPasswordIndex.includes(0)
                            ? IconName.Eye
                            : IconName.EyeSlash
                        }
                        size={IconSize.Lg}
                        color={colors.icon.alternative}
                        onPress={() => this.toggleShowPassword(0)}
                      />
                    }
                  />
                  {Boolean(password) &&
                    password.length < MIN_PASSWORD_LENGTH && (
                      <Text
                        variant={TextVariant.BodySM}
                        color={TextColor.Alternative}
                      >
                        {strings('choose_password.must_be_at_least', {
                          number: MIN_PASSWORD_LENGTH,
                        })}
                      </Text>
                    )}
                  {Boolean(password) &&
                    password.length >= MIN_PASSWORD_LENGTH && (
                      <Text
                        variant={TextVariant.BodySM}
                        color={TextColor.Alternative}
                        testID={ChoosePasswordSelectorsIDs.PASSWORD_STRENGTH_ID}
                      >
                        {strings('choose_password.password_strength')}
                        <Text
                          variant={TextVariant.BodySM}
                          color={TextColor.Alternative}
                          style={styles[`strength_${passwordStrengthWord}`]}
                        >
                          {' '}
                          {strings(
                            `choose_password.strength_${passwordStrengthWord}`,
                          )}
                        </Text>
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
                    ref={this.confirmPasswordInput}
                    placeholder={strings('import_from_seed.re_enter_password')}
                    value={confirmPassword}
                    onChangeText={this.setConfirmPassword}
                    secureTextEntry={this.state.showPasswordIndex.includes(1)}
                    placeholderTextColor={colors.text.muted}
                    testID={
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID
                    }
                    accessibilityLabel={
                      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID
                    }
                    autoComplete="new-password"
                    onSubmitEditing={this.onPressCreate}
                    returnKeyType={'done'}
                    autoCapitalize="none"
                    keyboardAppearance={themeAppearance}
                    size={TextFieldSize.Lg}
                    endAccessory={
                      <Icon
                        name={
                          this.state.showPasswordIndex.includes(1)
                            ? IconName.Eye
                            : IconName.EyeSlash
                        }
                        size={IconSize.Lg}
                        color={colors.icon.alternative}
                        onPress={() => this.toggleShowPassword(1)}
                      />
                    }
                    isDisabled={password === ''}
                  />
                  {this.checkError() && (
                    <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                      {strings('choose_password.password_error')}
                    </Text>
                  )}
                </View>

                <View style={styles.learnMoreContainer}>
                  <Checkbox
                    onPress={this.setSelection}
                    isChecked={isSelected}
                    testID={ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID}
                    accessibilityLabel={
                      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID
                    }
                    style={styles.checkbox}
                  />
                  <Button
                    variant={ButtonVariants.Link}
                    onPress={this.setSelection}
                    style={styles.learnMoreTextContainer}
                    testID={ChoosePasswordSelectorsIDs.CHECKBOX_TEXT_ID}
                    label={
                      <Text
                        variant={TextVariant.BodyMD}
                        color={TextColor.Default}
                      >
                        {this.getOauth2LoginSuccess()
                          ? strings('import_from_seed.learn_more_social_login')
                          : strings('import_from_seed.learn_more')}
                        <Text
                          variant={TextVariant.BodyMD}
                          color={TextColor.Primary}
                          onPress={this.learnMore}
                          testID={ChoosePasswordSelectorsIDs.LEARN_MORE_LINK_ID}
                        >
                          {' ' + strings('reset_password.learn_more')}
                        </Text>
                      </Text>
                    }
                  />
                </View>

                <View style={styles.ctaWrapper}>
                  <Button
                    variant={ButtonVariants.Primary}
                    onPress={this.onPressCreate}
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

  render() {
    const { errorToThrow } = this.state;

    // Component that throws error if needed (to be caught by ErrorBoundary)
    const ThrowErrorIfNeeded = () => {
      if (errorToThrow) {
        throw errorToThrow;
      }
      return null;
    };

    return (
      <ErrorBoundary
        navigation={this.props.navigation}
        view="ChoosePassword"
        useOnboardingErrorHandling={
          !!errorToThrow && !this.props.metrics.isEnabled()
        }
      >
        <ThrowErrorIfNeeded />
        {this.renderContent()}
      </ErrorBoundary>
    );
  }
}

ChoosePassword.contextType = ThemeContext;

const mapDispatchToProps = (dispatch) => ({
  passwordSet: () => dispatch(passwordSet()),
  passwordUnset: () => dispatch(passwordUnset()),
  setLockTime: (time) => dispatch(setLockTime(time)),
  seedphraseNotBackedUp: () => dispatch(seedphraseNotBackedUp()),
  saveOnboardingEvent: (...eventArgs) => dispatch(saveEvent(eventArgs)),
  setExistingUser: (value) => dispatch(setExistingUser(value)),
});

const mapStateToProps = (state) => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(ChoosePassword));
