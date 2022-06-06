import React, { PureComponent } from 'react';
import {
  Text,
  View,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  InteractionManager,
  TextInput,
  KeyboardAvoidingView,
  Appearance,
} from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { fontStyles, baseStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import OnboardingProgress from '../../UI/OnboardingProgress';
import { strings } from '../../../../locales/i18n';
import FeatherIcons from 'react-native-vector-icons/Feather';
import { BlurView } from '@react-native-community/blur';
import ActionView from '../../UI/ActionView';
import Device from '../../../util/device';
import Engine from '../../../core/Engine';
import PreventScreenshot from '../../../core/PreventScreenshot';
import SecureKeychain from '../../../core/SecureKeychain';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  MANUAL_BACKUP_STEPS,
  SEED_PHRASE,
  CONFIRM_PASSWORD,
  WRONG_PASSWORD_ERROR,
} from '../../../constants/onboarding';

import { CONFIRM_CHANGE_PASSWORD_INPUT_BOX_ID } from '../../../constants/test-ids';

import AnalyticsV2 from '../../../util/analyticsV2';
import { ThemeContext, mockTheme } from '../../../util/theme';

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
    onBoardingWrapper: {
      paddingHorizontal: 20,
    },
    loader: {
      backgroundColor: colors.background.default,
      flex: 1,
      minHeight: 300,
      justifyContent: 'center',
      alignItems: 'center',
    },
    action: {
      fontSize: 18,
      marginVertical: 16,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'center',
      ...fontStyles.bold,
    },
    infoWrapper: {
      marginBottom: 16,
      justifyContent: 'center',
    },
    info: {
      fontSize: 14,
      color: colors.text.default,
      textAlign: 'center',
      ...fontStyles.normal,
      paddingHorizontal: 6,
    },
    seedPhraseConcealerContainer: {
      flex: 1,
      borderRadius: 8,
    },
    seedPhraseConcealer: {
      backgroundColor: colors.overlay.alternative,
      alignItems: 'center',
      borderRadius: 8,
      paddingHorizontal: 24,
      paddingVertical: 45,
    },
    blurView: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      borderRadius: 8,
    },
    icon: {
      width: 24,
      height: 24,
      color: colors.overlay.inverse,
      textAlign: 'center',
      marginBottom: 32,
    },
    reveal: {
      fontSize: Device.isMediumDevice() ? 13 : 16,
      ...fontStyles.bold,
      color: colors.overlay.inverse,
      lineHeight: 22,
      marginBottom: 8,
      textAlign: 'center',
    },
    watching: {
      fontSize: Device.isMediumDevice() ? 10 : 12,
      color: colors.overlay.inverse,
      lineHeight: 17,
      marginBottom: 32,
      textAlign: 'center',
    },
    viewButtonContainer: {
      width: 155,
      padding: 12,
    },
    seedPhraseWrapper: {
      backgroundColor: colors.background.default,
      borderRadius: 8,
      flexDirection: 'row',
      borderColor: colors.border.default,
      borderWidth: 1,
      marginBottom: 64,
      minHeight: 275,
    },
    wordColumn: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: Device.isMediumDevice() ? 18 : 24,
      paddingVertical: 18,
      justifyContent: 'space-between',
    },
    wordWrapper: {
      flexDirection: 'row',
    },
    word: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      fontSize: 14,
      color: colors.text.default,
      backgroundColor: colors.background.default,
      borderColor: colors.primary.default,
      borderWidth: 1,
      borderRadius: 13,
      textAlign: 'center',
      textAlignVertical: 'center',
      lineHeight: 14,
      flex: 1,
    },
    confirmPasswordWrapper: {
      flex: 1,
      padding: 30,
      paddingTop: 0,
    },
    passwordRequiredContent: {
      marginBottom: 20,
    },
    content: {
      alignItems: 'flex-start',
    },
    title: {
      fontSize: 32,
      marginTop: 20,
      marginBottom: 10,
      color: colors.text.default,
      justifyContent: 'center',
      textAlign: 'left',
      ...fontStyles.normal,
    },
    text: {
      marginBottom: 10,
      marginTop: 20,
      justifyContent: 'center',
    },
    label: {
      fontSize: 16,
      lineHeight: 23,
      color: colors.text.default,
      textAlign: 'left',
      ...fontStyles.normal,
    },
    buttonWrapper: {
      flex: 1,
      marginTop: 20,
      justifyContent: 'flex-end',
    },
    input: {
      borderWidth: 2,
      borderRadius: 5,
      width: '100%',
      borderColor: colors.border.default,
      padding: 10,
      height: 40,
      color: colors.text.default,
    },
    warningMessageText: {
      paddingVertical: 10,
      color: colors.error.default,
      ...fontStyles.normal,
    },
    keyboardAvoidingView: {
      flex: 1,
      flexDirection: 'row',
      alignSelf: 'center',
    },
  });

/**
 * View that's shown during the second step of
 * the backup seed phrase flow
 */
class ManualBackupStep1 extends PureComponent {
  static propTypes = {
    /**
    /* navigation object required to push and pop other views
    */
    navigation: PropTypes.object,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    /**
     * Theme that app is set to
     */
    appTheme: PropTypes.string,
  };

  steps = MANUAL_BACKUP_STEPS;

  state = {
    seedPhraseHidden: true,
    currentStep: 1,
    password: undefined,
    warningIncorrectPassword: undefined,
    ready: false,
    view: SEED_PHRASE,
  };

  updateNavBar = () => {
    const { route, navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(getOnboardingNavbarOptions(route, {}, colors));
  };

  async componentDidMount() {
    this.updateNavBar();
    this.words = this.props.route.params?.words ?? [];

    if (!this.words.length) {
      try {
        const credentials = await SecureKeychain.getGenericPassword();
        if (credentials) {
          this.words = await this.tryExportSeedPhrase(credentials.password);
        } else {
          this.setState({ view: CONFIRM_PASSWORD });
        }
      } catch (e) {
        this.setState({ view: CONFIRM_PASSWORD });
      }
    }
    this.setState({ ready: true });
    InteractionManager.runAfterInteractions(() => PreventScreenshot.forbid());
  }

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  onPasswordChange = (password) => {
    this.setState({ password });
  };

  goNext = () => {
    this.props.navigation.navigate('ManualBackupStep2', {
      words: this.words,
      steps: this.steps,
    });
  };

  revealSeedPhrase = () => {
    this.setState({ seedPhraseHidden: false });
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.WALLET_SECURITY_PHRASE_REVEALED,
      );
    });
  };

  tryExportSeedPhrase = async (password) => {
    const { KeyringController } = Engine.context;
    const mnemonic = await KeyringController.exportSeedPhrase(
      password,
    ).toString();
    const seed = JSON.stringify(mnemonic).replace(/"/g, '').split(' ');
    return seed;
  };

  tryUnlockWithPassword = async (password) => {
    this.setState({ ready: false });
    try {
      this.words = await this.tryExportSeedPhrase(password);
      this.setState({ view: SEED_PHRASE, ready: true });
    } catch (e) {
      let msg = strings('reveal_credential.warning_incorrect_password');
      if (e.toString().toLowerCase() !== WRONG_PASSWORD_ERROR.toLowerCase()) {
        msg = strings('reveal_credential.unknown_error');
      }
      this.setState({
        warningIncorrectPassword: msg,
        ready: true,
      });
    }
  };

  tryUnlock = () => {
    const { password } = this.state;
    this.tryUnlockWithPassword(password);
  };

  renderLoader = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" />
      </View>
    );
  };

  getBlurType = () => {
    const { appTheme } = this.props;
    let blurType = 'light';
    switch (appTheme) {
      case 'light':
        blurType = 'light';
        break;
      case 'dark':
        blurType = 'dark';
        break;
      case 'os':
        blurType = Appearance.getColorScheme();
        break;
      default:
        blurType = 'light';
    }
    return blurType;
  };

  renderSeedPhraseConcealer = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const blurType = this.getBlurType();

    return (
      <View style={styles.seedPhraseConcealerContainer}>
        <BlurView blurType={blurType} blurAmount={5} style={styles.blurView} />
        <View style={styles.seedPhraseConcealer}>
          <FeatherIcons name="eye-off" size={24} style={styles.icon} />
          <Text style={styles.reveal}>
            {strings('manual_backup_step_1.reveal')}
          </Text>
          <Text style={styles.watching}>
            {strings('manual_backup_step_1.watching')}
          </Text>
          <View style={styles.viewButtonWrapper}>
            <StyledButton
              type={'onOverlay'}
              testID={'view-button'}
              onPress={this.revealSeedPhrase}
              containerStyle={styles.viewButtonContainer}
            >
              {strings('manual_backup_step_1.view')}
            </StyledButton>
          </View>
        </View>
      </View>
    );
  };

  renderConfirmPassword() {
    const { warningIncorrectPassword } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={'padding'}
      >
        <KeyboardAwareScrollView style={baseStyles.flexGrow} enableOnAndroid>
          <View style={styles.confirmPasswordWrapper}>
            <View style={[styles.content, styles.passwordRequiredContent]}>
              <Text style={styles.title}>
                {strings('manual_backup_step_1.confirm_password')}
              </Text>
              <View style={styles.text}>
                <Text style={styles.label}>
                  {strings('manual_backup_step_1.before_continiuing')}
                </Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={'Password'}
                placeholderTextColor={colors.text.muted}
                onChangeText={this.onPasswordChange}
                secureTextEntry
                onSubmitEditing={this.tryUnlock}
                testID={CONFIRM_CHANGE_PASSWORD_INPUT_BOX_ID}
                keyboardAppearance={themeAppearance}
              />
              {warningIncorrectPassword && (
                <Text style={styles.warningMessageText}>
                  {warningIncorrectPassword}
                </Text>
              )}
            </View>
            <View style={styles.buttonWrapper}>
              <StyledButton
                containerStyle={styles.button}
                type={'confirm'}
                onPress={this.tryUnlock}
                testID={'submit-button'}
              >
                {strings('manual_backup_step_1.confirm')}
              </StyledButton>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    );
  }

  renderSeedphraseView = () => {
    const words = this.words || [];
    const wordLength = words.length;
    const half = wordLength / 2 || 6;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <ActionView
        confirmTestID={'manual-backup-step-1-continue-button'}
        confirmText={strings('manual_backup_step_1.continue')}
        onConfirmPress={this.goNext}
        confirmDisabled={this.state.seedPhraseHidden}
        showCancelButton={false}
        confirmButtonMode={'confirm'}
      >
        <View style={styles.wrapper} testID={'manual_backup_step_1-screen'}>
          <Text style={styles.action}>
            {strings('manual_backup_step_1.action')}
          </Text>
          <View style={styles.infoWrapper}>
            <Text style={styles.info}>
              {strings('manual_backup_step_1.info')}
            </Text>
          </View>
          <View style={styles.seedPhraseWrapper}>
            {this.state.seedPhraseHidden ? (
              this.renderSeedPhraseConcealer()
            ) : (
              <React.Fragment>
                <View style={styles.wordColumn}>
                  {this.words.slice(0, half).map((word, i) => (
                    <View key={`word_${i}`} style={styles.wordWrapper}>
                      <Text style={styles.word}>{`${i + 1}. ${word}`}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.wordColumn}>
                  {this.words.slice(-half).map((word, i) => (
                    <View key={`word_${i}`} style={styles.wordWrapper}>
                      <Text style={styles.word}>{`${
                        i + (half + 1)
                      }. ${word}`}</Text>
                    </View>
                  ))}
                </View>
              </React.Fragment>
            )}
          </View>
        </View>
      </ActionView>
    );
  };

  render() {
    const { ready, currentStep, view } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (!ready) return this.renderLoader();
    return (
      <SafeAreaView style={styles.mainWrapper}>
        <View style={styles.onBoardingWrapper}>
          <OnboardingProgress currentStep={currentStep} steps={this.steps} />
        </View>
        {view === SEED_PHRASE
          ? this.renderSeedphraseView()
          : this.renderConfirmPassword()}
      </SafeAreaView>
    );
  }
}

const mapStateToProps = (state) => ({
  appTheme: state.user.appTheme,
});

ManualBackupStep1.contextType = ThemeContext;

export default connect(mapStateToProps)(ManualBackupStep1);
