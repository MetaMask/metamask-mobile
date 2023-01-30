/* eslint-disable no-mixed-spaces-and-tabs */
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Linking,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
import { useDispatch, useSelector } from 'react-redux';
=======
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js
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
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import InfoModal from '../../UI/Swaps/components/InfoModal';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { showAlert } from '../../../actions/alert';
import { recordSRPRevealTimestamp } from '../../../actions/privacy';
import { WRONG_PASSWORD_ERROR } from '../../../constants/error';
import {
  KEEP_SRP_SAFE_URL,
  NON_CUSTODIAL_WALLET_URL,
  SRP_GUIDE_URL,
} from '../../../constants/urls';
import ClipboardManager from '../../../core/ClipboardManager';
import { useTheme } from '../../../util/theme';
import Engine from '../../../core/Engine';
import { BIOMETRY_CHOICE } from '../../../constants/storage';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import { Authentication } from '../../../core/';

import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import { isQRHardwareAccount } from '../../../util/address';
import AppConstants from '../../../core/AppConstants';
import { createStyles } from './styles';
import { getNavigationOptionsTitle } from '../../../components/UI/Navbar';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  PASSWORD_INPUT_BOX_ID,
  REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
  SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID,
  SECRET_RECOVERY_PHRASE_CONTAINER_ID,
  SECRET_RECOVERY_PHRASE_LONG_PRESS_BUTTON_ID,
  SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID,
  SECRET_RECOVERY_PHRASE_TEXT,
} from '../../../../wdio/screen-objects/testIDs/Screens/RevelSecretRecoveryPhrase.testIds';

const PRIVATE_KEY = 'private_key';

<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
interface IRevealPrivateCredentialProps {
  navigation: any;
  credentialName: string;
  cancel: () => void;
  route: any;
}

=======
/**
 * View that displays private account information as private key or seed phrase
 */
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js
const RevealPrivateCredential = ({
  navigation,
  showAlert,
  recordSRPRevealTimestamp,
  selectedAddress,
  passwordSet,
  credentialName,
  cancel,
  route,
<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
}: IRevealPrivateCredentialProps) => {
  const hasNavigation = !!navigation;
  // TODO - Refactor or split RevealPrivateCredential when used in Nav stack vs outside of it
  const shouldUpdateNav = route?.params?.shouldUpdateNav;
  const [clipboardPrivateCredential, setClipboardPrivateCredential] =
    useState<string>('');
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [isUserUnlocked, setIsUserUnlocked] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [warningIncorrectPassword, setWarningIncorrectPassword] =
    useState<string>('');
  const [clipboardEnabled, setClipboardEnabled] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const passwordSet = useSelector((state: any) => state.user.passwordSet);

  const dispatch = useDispatch();
=======
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
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js

  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const credentialSlug = credentialName || route?.params.credentialName;
  const isPrivateKey = credentialSlug === PRIVATE_KEY;

  const updateNavBar = () => {
    if (!hasNavigation || !shouldUpdateNav) {
      return;
    }
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings(`reveal_credential.${credentialSlug ?? ''}_title`),
        navigation,
        false,
        colors,
        MetaMetricsEvents.GO_BACK_SRP_SCREEN,
      ),
    );
  };

<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
  const tryUnlockWithPassword = async (
    pswd: string,
    privCredentialName?: string,
  ) => {
    const { KeyringController } = Engine.context as any;
    const isPrivateKeyReveal = privCredentialName === PRIVATE_KEY;
=======
  const isPrivateKey = () => {
    const credential = credentialName || route.params.privateCredentialName;
    return credential === PRIVATE_KEY;
  };

  const tryUnlockWithPassword = async (password, privateCredentialName) => {
    const { KeyringController } = Engine.context;
    const isPrivateKeyReveal = privateCredentialName === PRIVATE_KEY;
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js

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
<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
    if (!isPrivateKey) {
      AnalyticsV2.trackEvent(MetaMetricsEvents.REVEAL_SRP_SCREEN, {});
=======
    if (!isPrivateKey()) {
      AnalyticsV2.trackEvent(MetaMetricsEvents.REVEAL_SRP_SCREEN);
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js
    }

    const unlockWithBiometrics = async () => {
      // Try to use biometrics to unlock
      const { availableBiometryType } = await Authentication.getType();
      if (!passwordSet) {
        tryUnlockWithPassword('');
      } else if (availableBiometryType) {
        const biometryChoice = await AsyncStorage.getItem(BIOMETRY_CHOICE);
        if (biometryChoice !== '' && biometryChoice === availableBiometryType) {
          const credentials = await Authentication.getPassword();
          if (credentials) {
            tryUnlockWithPassword(credentials.password);
          }
        }
      }
    };

    unlockWithBiometrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateBack = () => {
    if (hasNavigation && shouldUpdateNav) {
      navigation.pop();
    } else {
      cancel?.();
    }
  };

  const cancelReveal = () => {
    if (!unlocked)
      AnalyticsV2.trackEvent(
        isPrivateKey
          ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_CANCELLED
          : MetaMetricsEvents.REVEAL_SRP_CANCELLED,
        { view: 'Enter password' },
      );

<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
    if (!isPrivateKey)
      AnalyticsV2.trackEvent(MetaMetricsEvents.CANCEL_REVEAL_SRP_CTA, {});
=======
    if (!isPrivateKey())
      AnalyticsV2.trackEvent(MetaMetricsEvents.CANCEL_REVEAL_SRP_CTA);
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js
    if (cancel) return cancel();
    navigateBack();
  };

  const tryUnlock = () => {
    const { KeyringController } = Engine.context;
    if (KeyringController.validatePassword(password)) {
      if (!isPrivateKey) {
        const currentDate = new Date();
        recordSRPRevealTimestamp(currentDate.toString());
        AnalyticsV2.trackEvent(MetaMetricsEvents.NEXT_REVEAL_SRP_CTA);
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
<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
    if (!isPrivateKey)
      AnalyticsV2.trackEvent(MetaMetricsEvents.SRP_DONE_CTA, {});
=======
    if (!isPrivateKey()) AnalyticsV2.trackEvent(MetaMetricsEvents.SRP_DONE_CTA);
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js
    navigateBack();
  };

  const copyPrivateCredentialToClipboard = async (privateCredentialName) => {
    AnalyticsV2.trackEvent(
      privateCredentialName === PRIVATE_KEY
        ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_COMPLETED
        : MetaMetricsEvents.REVEAL_SRP_COMPLETED,
      { action: 'copied to clipboard' },
    );

<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
    if (!isPrivateKey) AnalyticsV2.trackEvent(MetaMetricsEvents.COPY_SRP, {});
=======
    if (!isPrivateKey()) AnalyticsV2.trackEvent(MetaMetricsEvents.COPY_SRP);
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js

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
        isPrivateKey
          ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_COMPLETED
          : MetaMetricsEvents.REVEAL_SRP_COMPLETED,
        { action: 'viewed SRP' },
      );

<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
      if (!isPrivateKey) AnalyticsV2.trackEvent(MetaMetricsEvents.VIEW_SRP, {});
=======
      if (!isPrivateKey()) AnalyticsV2.trackEvent(MetaMetricsEvents.VIEW_SRP);
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js
    } else if (event.i === 1) {
      AnalyticsV2.trackEvent(
        isPrivateKey
          ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_COMPLETED
          : MetaMetricsEvents.REVEAL_SRP_COMPLETED,
        { action: 'viewed QR code' },
      );

<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
      if (!isPrivateKey)
        AnalyticsV2.trackEvent(MetaMetricsEvents.VIEW_SRP_QR, {});
    }
  };

  useEffect(() => {
=======
      if (!isPrivateKey())
        AnalyticsV2.trackEvent(MetaMetricsEvents.VIEW_SRP_QR);
    }
  };

  const renderTabView = (privateCredentialName) => {
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js
    Device.isAndroid() &&
      Device.getDeviceAPILevel().then((apiLevel) => {
        if (apiLevel < AppConstants.LEAST_SUPPORTED_ANDROID_API_LEVEL) {
          setClipboardEnabled(false);
          return;
        }
      });

<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
    setClipboardEnabled(true);
  }, []);

  const renderTabView = (privCredentialName: string) => (
    <ScrollableTabView
      renderTabBar={() => renderTabBar()}
      onChangeTab={(event: any) => onTabBarChange(event)}
    >
      <View
        tabLabel={strings(`reveal_credential.text`)}
        style={styles.tabContent}
      >
        <Text style={styles.boldText}>
          {strings(`reveal_credential.${privCredentialName}`)}
        </Text>
        <View style={styles.seedPhraseView}>
          <TextInput
            value={clipboardPrivateCredential}
            numberOfLines={3}
            multiline
            selectTextOnFocus
            style={styles.seedPhrase}
            editable={false}
            {...generateTestId(Platform, SECRET_RECOVERY_PHRASE_TEXT)}
            placeholderTextColor={colors.text.muted}
            keyboardAppearance={themeAppearance}
          />
          {clipboardEnabled ? (
            <Button
              label={strings('reveal_credential.copy_to_clipboard')}
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Sm}
              onPress={() =>
                copyPrivateCredentialToClipboard(privCredentialName)
              }
              {...generateTestId(
                Platform,
                REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
              )}
              style={styles.clipboardButton}
            />
          ) : null}
        </View>
      </View>
      <View
        tabLabel={strings(`reveal_credential.qr_code`)}
        style={styles.tabContent}
      >
        <View style={styles.qrCodeWrapper}>
          <QRCode
            value={clipboardPrivateCredential}
            size={Dimensions.get('window').width - 176}
          />
=======
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
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js
        </View>
      </View>
    </ScrollableTabView>
  );

  const renderPasswordEntry = () => (
    <>
      <Text style={styles.enterPassword}>
        {strings('reveal_credential.enter_password')}
      </Text>
      <TextInput
        style={styles.input}
        placeholder={'Password'}
        placeholderTextColor={colors.text.muted}
        onChangeText={onPasswordChange}
        secureTextEntry
        onSubmitEditing={tryUnlock}
        keyboardAppearance={themeAppearance}
        {...generateTestId(Platform, PASSWORD_INPUT_BOX_ID)}
      />
      <Text style={styles.warningText} testID={'password-warning'}>
        {warningIncorrectPassword}
      </Text>
    </>
  );

  const closeModal = () => {
    AnalyticsV2.trackEvent(
      isPrivateKey
        ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_CANCELLED
        : MetaMetricsEvents.REVEAL_SRP_CANCELLED,
      { view: 'Hold to reveal' },
    );

    AnalyticsV2.trackEvent(MetaMetricsEvents.SRP_DISMISS_HOLD_TO_REVEAL_DIALOG);

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
<<<<<<< HEAD:app/components/Views/RevealPrivateCredential/RevealPrivateCredential.tsx
            onLongPress={() => revealCredential(privCredentialName)}
            {...generateTestId(
              Platform,
              SECRET_RECOVERY_PHRASE_LONG_PRESS_BUTTON_ID,
            )}
=======
            onLongPress={() => revealCredential(privateCredentialName)}
>>>>>>> 46fb0f82c (Merge main):app/components/Views/RevealPrivateCredential/index.js
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
    <View
      style={[styles.wrapper]}
      {...generateTestId(Platform, SECRET_RECOVERY_PHRASE_CONTAINER_ID)}
    >
      <ActionView
        cancelText={
          unlocked
            ? strings('reveal_credential.done')
            : strings('reveal_credential.cancel')
        }
        confirmText={strings('reveal_credential.confirm')}
        onCancelPress={unlocked ? done : cancelReveal}
        onConfirmPress={() => tryUnlock()}
        showConfirmButton={!unlocked}
        confirmDisabled={!enableNextButton()}
        cancelTestID={SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID}
        confirmTestID={SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID}
      >
        <>
          <View style={[styles.rowWrapper, styles.normalText]}>
            {isPrivateKey ? (
              <Text style={styles.normalText}>
                {strings(`reveal_credential.private_key_explanation`)}
              </Text>
            ) : (
              renderSRPExplanation()
            )}
          </View>
          {renderWarning(credentialSlug)}

          <View style={styles.rowWrapper}>
            {unlocked ? renderTabView(credentialSlug) : renderPasswordEntry()}
          </View>
        </>
      </ActionView>
      {renderModal(isPrivateKey, credentialSlug)}

      <ScreenshotDeterrent
        enabled={unlocked}
        isSRP={credentialSlug !== PRIVATE_KEY}
        hasNavigation={hasNavigation}
      />
    </View>
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
