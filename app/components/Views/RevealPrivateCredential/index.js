/* eslint-disable no-mixed-spaces-and-tabs */
import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  InteractionManager,
  Linking,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PropTypes from 'prop-types';
import QRCode from 'react-native-qrcode-svg';
import ScrollableTabView, {
  DefaultTabBar,
} from 'react-native-scrollable-tab-view';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { connect } from 'react-redux';
import ActionView from '../../UI/ActionView';
import ButtonReveal from '../../UI/ButtonReveal';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import InfoModal from '../../UI/Swaps/components/InfoModal';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { showAlert } from '../../../actions/alert';
import { recordSRPRevealTimestamp } from '../../../actions/privacy';
import { WRONG_PASSWORD_ERROR } from '../../../constants/error';
import {
  SRP_GUIDE_URL,
  NON_CUSTODIAL_WALLET_URL,
  KEEP_SRP_SAFE_URL,
} from '../../../constants/urls';
import ClipboardManager from '../../../core/ClipboardManager';
import { useTheme } from '../../../util/theme';
import Engine from '../../../core/Engine';
import PreventScreenshot from '../../../core/PreventScreenshot';
import SecureKeychain from '../../../core/SecureKeychain';
import { BIOMETRY_CHOICE } from '../../../constants/storage';
import AnalyticsV2 from '../../../util/analyticsV2';
import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import { isQRHardwareAccount } from '../../../util/address';
import AppConstants from '../../../core/AppConstants';
import { createStyles } from './styles';

const PRIVATE_KEY = 'private_key';
// const SEED_PHRASE = 'seed_phrase';

/**
 * View that displays private account information as private key or seed phrase
 */
const RevealPrivateCredential = ({
  navigation,
  showAlert,
  recordSRPRevealTimestamp,
  selectedAddress,
  passwordSet,
  credentialName,
  cancel,
  route,
  navBarDisabled,
}) => {
  const [clipboardPrivateCredential, setClipboardPrivateCredential] =
    useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [isUserUnlocked, setIsUserUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [warningIncorrectPassword, setWarningIncorrectPassword] = useState('');
  const [isAndroidSupportedVersion, setIsAndroidSupportedVersion] =
    useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const privateCredentialName =
    credentialName || route.params.privateCredentialName;

  const updateNavBar = () => {
    if (navBarDisabled) {
      return;
    }
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings(
          `reveal_credential.${
            route.params?.privateCredentialName ?? ''
          }_title`,
        ),
        navigation,
        false,
        colors,
        AnalyticsV2.ANALYTICS_EVENTS.GO_BACK_SRP_SCREEN,
      ),
    );
  };

  const isPrivateKey = () => {
    const credential = credentialName || route.params.privateCredentialName;
    return credential === PRIVATE_KEY;
  };

  const tryUnlockWithPassword = async (password, privateCredentialName) => {
    const { KeyringController } = Engine.context;
    const isPrivateKeyReveal = privateCredentialName === PRIVATE_KEY;

    try {
      let privateCredential;
      if (!isPrivateKeyReveal) {
        const mnemonic = await KeyringController.exportSeedPhrase(
          password,
        ).toString();
        privateCredential = JSON.stringify(mnemonic).replace(/"/g, '');
      } else {
        privateCredential = await KeyringController.exportAccount(
          password,
          selectedAddress,
        );
      }

      if (privateCredential && (isUserUnlocked || isPrivateKeyReveal)) {
        setClipboardPrivateCredential(privateCredential);
        setUnlocked(true);
      }
    } catch (e) {
      let msg = strings('reveal_credential.warning_incorrect_password');
      if (isQRHardwareAccount(selectedAddress)) {
        msg = strings('reveal_credential.hardware_error');
      } else if (
        e.toString().toLowerCase() !== WRONG_PASSWORD_ERROR.toLowerCase()
      ) {
        msg = strings('reveal_credential.unknown_error');
      }

      setIsModalVisible(false);
      setUnlocked(false);
      setWarningIncorrectPassword(msg);
    }
  };

  useEffect(() => {
    updateNavBar();
    // Track SRP Reveal screen rendered
    if (!isPrivateKey()) {
      AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.REVEAL_SRP_SCREEN);
    }

    const unlockWithBiometrics = async () => {
      const biometryType = await SecureKeychain.getSupportedBiometryType();
      if (!passwordSet) {
        tryUnlockWithPassword('');
      } else if (biometryType) {
        const biometryChoice = await AsyncStorage.getItem(BIOMETRY_CHOICE);
        if (biometryChoice !== '' && biometryChoice === biometryType) {
          const credentials = await SecureKeychain.getGenericPassword();
          if (credentials) {
            tryUnlockWithPassword(credentials.password);
          }
        }
      }
    };

    unlockWithBiometrics();
    InteractionManager.runAfterInteractions(() => {
      PreventScreenshot.forbid();
    });

    return () => {
      InteractionManager.runAfterInteractions(() => {
        PreventScreenshot.allow();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateBack = () => {
    navigation.pop();
  };

  const cancelReveal = () => {
    if (!unlocked)
      AnalyticsV2.trackEvent(
        isPrivateKey()
          ? AnalyticsV2.ANALYTICS_EVENTS.REVEAL_PRIVATE_KEY_CANCELLED
          : AnalyticsV2.ANALYTICS_EVENTS.REVEAL_SRP_CANCELLED,
        { view: 'Enter password' },
      );

    if (!isPrivateKey())
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.CANCEL_REVEAL_SRP_CTA,
      );
    if (cancel) return cancel();
    navigateBack();
  };

  const tryUnlock = () => {
    const { KeyringController } = Engine.context;
    if (KeyringController.validatePassword(password)) {
      if (!isPrivateKey()) {
        const currentDate = new Date();
        recordSRPRevealTimestamp(currentDate.toString());
        AnalyticsV2.trackEvent(
          AnalyticsV2.ANALYTICS_EVENTS.NEXT_REVEAL_SRP_CTA,
        );
      }
      setIsModalVisible(true);
      setWarningIncorrectPassword('');
    } else {
      const msg = strings('reveal_credential.warning_incorrect_password');
      setWarningIncorrectPassword(msg);
    }
  };

  const onPasswordChange = (password) => {
    setPassword(password);
  };

  const done = () => {
    if (!isPrivateKey())
      AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.SRP_DONE_CTA);
    navigateBack();
  };

  const copyPrivateCredentialToClipboard = async (privateCredentialName) => {
    AnalyticsV2.trackEvent(
      privateCredentialName === PRIVATE_KEY
        ? AnalyticsV2.ANALYTICS_EVENTS.REVEAL_PRIVATE_KEY_COMPLETED
        : AnalyticsV2.ANALYTICS_EVENTS.REVEAL_SRP_COMPLETED,
      { action: 'copied to clipboard' },
    );

    if (!isPrivateKey())
      AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.COPY_SRP);

    await ClipboardManager.setStringExpire(clipboardPrivateCredential);

    const msg = `${strings(
      `reveal_credential.${privateCredentialName}_copied_${Platform.OS}`,
    )}${
      Device.isIos()
        ? strings(`reveal_credential.${privateCredentialName}_copied_time`)
        : ''
    }`;

    showAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: {
        msg,
        width: '70%',
      },
    });
  };

  const revealCredential = (privateCredentialName) => {
    tryUnlockWithPassword(password, privateCredentialName);
    setIsUserUnlocked(true);
    setIsModalVisible(false);
  };

  const renderTabBar = () => (
    <DefaultTabBar
      underlineStyle={styles.tabUnderlineStyle}
      activeTextColor={colors.primary.default}
      inactiveTextColor={colors.text.alternative}
      backgroundColor={colors.background.default}
      tabStyle={styles.tabStyle}
      textStyle={styles.textStyle}
      style={styles.tabBar}
    />
  );

  const onTabBarChange = (event) => {
    if (event.i === 0) {
      AnalyticsV2.trackEvent(
        isPrivateKey()
          ? AnalyticsV2.ANALYTICS_EVENTS.REVEAL_PRIVATE_KEY_COMPLETED
          : AnalyticsV2.ANALYTICS_EVENTS.REVEAL_SRP_COMPLETED,
        { action: 'viewed SRP' },
      );

      if (!isPrivateKey())
        AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.VIEW_SRP);
    } else if (event.i === 1) {
      AnalyticsV2.trackEvent(
        isPrivateKey()
          ? AnalyticsV2.ANALYTICS_EVENTS.REVEAL_PRIVATE_KEY_COMPLETED
          : AnalyticsV2.ANALYTICS_EVENTS.REVEAL_SRP_COMPLETED,
        { action: 'viewed QR code' },
      );

      if (!isPrivateKey())
        AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.VIEW_SRP_QR);
    }
  };

  const renderTabView = (privateCredentialName) => {
    Device.isAndroid() &&
      Device.getDeviceAPILevel().then((apiLevel) => {
        if (apiLevel < AppConstants.LEAST_SUPPORTED_ANDROID_API_LEVEL) {
          setIsAndroidSupportedVersion(false);
        }
      });

    return (
      <ScrollableTabView
        renderTabBar={() => renderTabBar()}
        onChangeTab={(event) => onTabBarChange(event)}
      >
        <View
          tabLabel={strings(`reveal_credential.text`)}
          style={styles.tabContent}
        >
          <Text style={styles.boldText}>
            {strings(`reveal_credential.${privateCredentialName}`)}
          </Text>
          <View style={styles.seedPhraseView}>
            <TextInput
              value={clipboardPrivateCredential}
              numberOfLines={3}
              multiline
              selectTextOnFocus
              style={styles.seedPhrase}
              editable={false}
              testID={'private-credential-text'}
              placeholderTextColor={colors.text.muted}
              keyboardAppearance={themeAppearance}
            />
            {isAndroidSupportedVersion && (
              <TouchableOpacity
                style={styles.privateCredentialAction}
                onPress={() =>
                  copyPrivateCredentialToClipboard(privateCredentialName)
                }
                testID={'private-credential-touchable'}
              >
                <Text style={styles.blueText}>
                  {strings('reveal_credential.copy_to_clipboard')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View
          tabLabel={strings(`reveal_credential.qr_code`)}
          style={styles.tabContent}
        >
          <View style={styles.qrCodeWrapper}>
            <View style={styles.qrCode}>
              <QRCode
                value={clipboardPrivateCredential}
                size={Dimensions.get('window').width - 176}
              />
            </View>
          </View>
        </View>
      </ScrollableTabView>
    );
  };

  const renderPasswordEntry = () => (
    <>
      <Text style={styles.enterPassword}>
        {strings('reveal_credential.enter_password')}
      </Text>
      <TextInput
        style={styles.input}
        testID={'private-credential-password-text-input'}
        placeholder={'Password'}
        placeholderTextColor={colors.text.muted}
        onChangeText={onPasswordChange}
        secureTextEntry
        onSubmitEditing={tryUnlock}
        keyboardAppearance={themeAppearance}
      />
      <Text style={styles.warningText} testID={'password-warning'}>
        {warningIncorrectPassword}
      </Text>
    </>
  );

  const closeModal = () => {
    AnalyticsV2.trackEvent(
      isPrivateKey()
        ? AnalyticsV2.ANALYTICS_EVENTS.REVEAL_PRIVATE_KEY_CANCELLED
        : AnalyticsV2.ANALYTICS_EVENTS.REVEAL_SRP_CANCELLED,
      { view: 'Hold to reveal' },
    );

    AnalyticsV2.trackEvent(
      AnalyticsV2.ANALYTICS_EVENTS.SRP_DISMISS_HOLD_TO_REVEAL_DIALOG,
    );

    setIsModalVisible(false);
  };

  const enableNextButton = () => {
    const { KeyringController } = Engine.context;
    return KeyringController.validatePassword(password);
  };

  const renderModal = (isPrivateKeyReveal, privateCredentialName) => (
    <InfoModal
      isVisible={isModalVisible}
      toggleModal={closeModal}
      title={strings('reveal_credential.keep_credential_safe', {
        credentialName: isPrivateKeyReveal
          ? strings('reveal_credential.private_key_text')
          : strings('reveal_credential.srp_abbreviation_text'),
      })}
      body={
        <>
          <Text style={[styles.normalText, styles.revealModalText]}>
            {
              strings('reveal_credential.reveal_credential_modal', {
                credentialName: isPrivateKeyReveal
                  ? strings('reveal_credential.private_key_text')
                  : strings('reveal_credential.srp_text'),
              })[0]
            }
            <Text style={styles.boldText}>
              {isPrivateKeyReveal
                ? strings('reveal_credential.reveal_credential_modal')[1]
                : strings('reveal_credential.reveal_credential_modal')[2]}
            </Text>
            {strings('reveal_credential.reveal_credential_modal')[3]}
            <TouchableOpacity
              onPress={() => Linking.openURL(KEEP_SRP_SAFE_URL)}
            >
              <Text style={[styles.blueText, styles.link]}>
                {strings('reveal_credential.reveal_credential_modal')[4]}
              </Text>
            </TouchableOpacity>
          </Text>

          <ButtonReveal
            label={strings('reveal_credential.hold_to_reveal_credential', {
              credentialName: isPrivateKeyReveal
                ? strings('reveal_credential.private_key_text')
                : strings('reveal_credential.srp_abbreviation_text'),
            })}
            onLongPress={() => revealCredential(privateCredentialName)}
          />
        </>
      }
    />
  );

  const renderSRPExplanation = () => (
    <Text style={styles.normalText}>
      {strings('reveal_credential.seed_phrase_explanation')[0]}{' '}
      <Text
        style={[styles.blueText, styles.link]}
        onPress={() => Linking.openURL(SRP_GUIDE_URL)}
      >
        {strings('reveal_credential.seed_phrase_explanation')[1]}
      </Text>{' '}
      {strings('reveal_credential.seed_phrase_explanation')[2]}{' '}
      <Text style={styles.boldText}>
        {strings('reveal_credential.seed_phrase_explanation')[3]}
      </Text>
      {strings('reveal_credential.seed_phrase_explanation')[4]}{' '}
      <Text
        style={[styles.blueText, styles.link]}
        onPress={() => Linking.openURL(NON_CUSTODIAL_WALLET_URL)}
      >
        {strings('reveal_credential.seed_phrase_explanation')[5]}{' '}
      </Text>
      {strings('reveal_credential.seed_phrase_explanation')[6]}{' '}
      <Text style={styles.boldText}>
        {strings('reveal_credential.seed_phrase_explanation')[7]}
      </Text>
    </Text>
  );

  const renderWarning = (privateCredentialName) => (
    <View style={styles.warningWrapper}>
      <View style={[styles.rowWrapper, styles.warningRowWrapper]}>
        <Icon style={styles.icon} name="eye-slash" size={20} solid />
        {privateCredentialName === PRIVATE_KEY ? (
          <Text style={styles.warningMessageText}>
            {strings(
              `reveal_credential.${privateCredentialName}_warning_explanation`,
            )}
          </Text>
        ) : (
          <Text style={styles.warningMessageText}>
            {strings('reveal_credential.seed_phrase_warning_explanation')[0]}
            <Text style={styles.boldText}>
              {strings('reveal_credential.seed_phrase_warning_explanation')[1]}
            </Text>
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={styles.wrapper}
      testID={'reveal-private-credential-screen'}
    >
      <ActionView
        cancelText={
          unlocked
            ? strings('reveal_credential.done')
            : strings('reveal_credential.cancel')
        }
        confirmText={strings('reveal_credential.confirm')}
        onCancelPress={unlocked ? done : cancelReveal}
        testID={`next-button`}
        onConfirmPress={() => tryUnlock()}
        showConfirmButton={!unlocked}
        confirmDisabled={!enableNextButton()}
      >
        <>
          <View style={[styles.rowWrapper, styles.normalText]}>
            {isPrivateKey() ? (
              <Text style={styles.normalText}>
                {strings(`reveal_credential.private_key_explanation`)}
              </Text>
            ) : (
              renderSRPExplanation()
            )}
          </View>
          {renderWarning(privateCredentialName)}

          <View style={styles.rowWrapper}>
            {unlocked
              ? renderTabView(privateCredentialName)
              : renderPasswordEntry()}
          </View>
        </>
      </ActionView>
      {renderModal(isPrivateKey(), privateCredentialName)}
      <ScreenshotDeterrent
        enabled={unlocked}
        isSRP={privateCredentialName !== PRIVATE_KEY}
      />
    </SafeAreaView>
  );
};

RevealPrivateCredential.propTypes = {
  /**
  /* navigation object required to push new views
  */
  navigation: PropTypes.object,
  /**
   * Action that shows the global alert
   */
  showAlert: PropTypes.func.isRequired,
  /**
   * String that represents the selected address
   */
  selectedAddress: PropTypes.string,
  /**
   * Boolean that determines if the user has set a password before
   */
  passwordSet: PropTypes.bool,
  /**
   * String that determines whether to show the seedphrase or private key export screen
   */
  credentialName: PropTypes.string,
  /**
   * Cancel function to be called when cancel button is clicked. If not provided, we go to previous screen on cancel
   */
  cancel: PropTypes.func,
  /**
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
  /**
   * Boolean that indicates if navbar should be disabled
   */
  navBarDisabled: PropTypes.bool,
  /**
   * Method to record the SRP reveal timestamp
   */
  recordSRPRevealTimestamp: PropTypes.func,
};

const mapStateToProps = (state) => ({
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  passwordSet: state.user.passwordSet,
});

const mapDispatchToProps = (dispatch) => ({
  showAlert: (config) => dispatch(showAlert(config)),
  recordSRPRevealTimestamp: (timestamp) =>
    dispatch(recordSRPRevealTimestamp(timestamp)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RevealPrivateCredential);
