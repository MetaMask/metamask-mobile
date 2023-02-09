/* eslint-disable no-mixed-spaces-and-tabs */
import React, { useState, useEffect } from 'react';
import {
  Dimensions,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import ScrollableTabView, {
  DefaultTabBar,
} from 'react-native-scrollable-tab-view';
import Icon from 'react-native-vector-icons/FontAwesome5';
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
import SecureKeychain from '../../../core/SecureKeychain';
import { BIOMETRY_CHOICE } from '../../../constants/storage';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import { isQRHardwareAccount } from '../../../util/address';
import AppConstants from '../../../core/AppConstants';
import { createStyles } from './styles';

const PRIVATE_KEY = 'private_key';

interface IRevealPrivateCredentialProps {
  navigation: any;
  credentialName: string;
  cancel: () => void;
  route: any;
  hasNavigation: boolean;
}

const RevealPrivateCredential = ({
  navigation,
  credentialName,
  cancel,
  route,
  hasNavigation,
}: IRevealPrivateCredentialProps) => {
  const [clipboardPrivateCredential, setClipboardPrivateCredential] =
    useState<string>('');
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [isUserUnlocked, setIsUserUnlocked] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [warningIncorrectPassword, setWarningIncorrectPassword] =
    useState<string>('');
  const [isAndroidSupportedVersion, setIsAndroidSupportedVersion] =
    useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const passwordSet = useSelector((state: any) => state.user.passwordSet);

  const dispatch = useDispatch();

  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const privateCredentialName = credentialName || route.params.credentialName;

  const updateNavBar = () => {
    if (!hasNavigation && !route.params?.hasNavigation) {
      return;
    }
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings(
          `reveal_credential.${route.params?.credentialName ?? ''}_title`,
        ),
        navigation,
        false,
        colors,
        MetaMetricsEvents.GO_BACK_SRP_SCREEN,
      ),
    );
  };

  const isPrivateKey = () => {
    const credential = credentialName || route.params.credentialName;
    return credential === PRIVATE_KEY;
  };

  const tryUnlockWithPassword = async (
    pswd: string,
    privCredentialName?: string,
  ) => {
    const { KeyringController } = Engine.context as any;
    const isPrivateKeyReveal = privCredentialName === PRIVATE_KEY;

    try {
      let privateCredential;
      if (!isPrivateKeyReveal) {
        const mnemonic = await KeyringController.exportSeedPhrase(
          pswd,
        ).toString();
        privateCredential = JSON.stringify(mnemonic).replace(/"/g, '');
      } else {
        privateCredential = await KeyringController.exportAccount(
          pswd,
          selectedAddress,
        );
      }

      if (privateCredential && (isUserUnlocked || isPrivateKeyReveal)) {
        setClipboardPrivateCredential(privateCredential);
        setUnlocked(true);
      }
    } catch (e: any) {
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
      AnalyticsV2.trackEvent(MetaMetricsEvents.REVEAL_SRP_SCREEN, {});
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateBack = () => {
    hasNavigation && navigation.pop();
  };

  const cancelReveal = () => {
    if (!unlocked)
      AnalyticsV2.trackEvent(
        isPrivateKey()
          ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_CANCELLED
          : MetaMetricsEvents.REVEAL_SRP_CANCELLED,
        { view: 'Enter password' },
      );

    if (!isPrivateKey())
      AnalyticsV2.trackEvent(MetaMetricsEvents.CANCEL_REVEAL_SRP_CTA, {});
    if (cancel) return cancel();
    navigateBack();
  };

  const tryUnlock = () => {
    const { KeyringController } = Engine.context as any;
    if (KeyringController.validatePassword(password)) {
      if (!isPrivateKey()) {
        const currentDate = new Date();
        dispatch(recordSRPRevealTimestamp(currentDate.toString()));
        AnalyticsV2.trackEvent(MetaMetricsEvents.NEXT_REVEAL_SRP_CTA, {});
      }
      setIsModalVisible(true);
      setWarningIncorrectPassword('');
    } else {
      const msg = strings('reveal_credential.warning_incorrect_password');
      setWarningIncorrectPassword(msg);
    }
  };

  const onPasswordChange = (pswd: string) => {
    setPassword(pswd);
  };

  const done = () => {
    if (!isPrivateKey())
      AnalyticsV2.trackEvent(MetaMetricsEvents.SRP_DONE_CTA, {});
    navigateBack();
  };

  const copyPrivateCredentialToClipboard = async (
    privCredentialName: string,
  ) => {
    AnalyticsV2.trackEvent(
      privCredentialName === PRIVATE_KEY
        ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_COMPLETED
        : MetaMetricsEvents.REVEAL_SRP_COMPLETED,
      { action: 'copied to clipboard' },
    );

    if (!isPrivateKey()) AnalyticsV2.trackEvent(MetaMetricsEvents.COPY_SRP, {});

    await ClipboardManager.setStringExpire(clipboardPrivateCredential);

    const msg = `${strings(
      `reveal_credential.${privCredentialName}_copied_${Platform.OS}`,
    )}${
      Device.isIos()
        ? strings(`reveal_credential.${privCredentialName}_copied_time`)
        : ''
    }`;

    dispatch(
      showAlert({
        isVisible: true,
        autodismiss: 1500,
        content: 'clipboard-alert',
        data: {
          msg,
          width: '70%',
        },
      }),
    );
  };

  const revealCredential = (privCredentialName: string) => {
    tryUnlockWithPassword(password, privCredentialName);
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

  const onTabBarChange = (event: { i: number }) => {
    if (event.i === 0) {
      AnalyticsV2.trackEvent(
        isPrivateKey()
          ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_COMPLETED
          : MetaMetricsEvents.REVEAL_SRP_COMPLETED,
        { action: 'viewed SRP' },
      );

      if (!isPrivateKey())
        AnalyticsV2.trackEvent(MetaMetricsEvents.VIEW_SRP, {});
    } else if (event.i === 1) {
      AnalyticsV2.trackEvent(
        isPrivateKey()
          ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_COMPLETED
          : MetaMetricsEvents.REVEAL_SRP_COMPLETED,
        { action: 'viewed QR code' },
      );

      if (!isPrivateKey())
        AnalyticsV2.trackEvent(MetaMetricsEvents.VIEW_SRP_QR, {});
    }
  };

  const renderTabView = (privCredentialName: string) => {
    Device.isAndroid() &&
      Device.getDeviceAPILevel().then((apiLevel) => {
        if (apiLevel < AppConstants.LEAST_SUPPORTED_ANDROID_API_LEVEL) {
          setIsAndroidSupportedVersion(false);
        }
      });

    return (
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
              testID={'private-credential-text'}
              placeholderTextColor={colors.text.muted}
              keyboardAppearance={themeAppearance}
            />
            {isAndroidSupportedVersion && (
              <TouchableOpacity
                style={styles.privateCredentialAction}
                onPress={() =>
                  copyPrivateCredentialToClipboard(privCredentialName)
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
            <QRCode
              value={clipboardPrivateCredential}
              size={Dimensions.get('window').width - 176}
            />
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
        ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_CANCELLED
        : MetaMetricsEvents.REVEAL_SRP_CANCELLED,
      { view: 'Hold to reveal' },
    );

    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SRP_DISMISS_HOLD_TO_REVEAL_DIALOG,
      {},
    );

    setIsModalVisible(false);
  };

  const enableNextButton = () => {
    const { KeyringController } = Engine.context as any;
    return KeyringController.validatePassword(password);
  };

  const renderModal = (
    isPrivateKeyReveal: boolean,
    privCredentialName: string,
  ) => (
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
            onLongPress={() => revealCredential(privCredentialName)}
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

  const renderWarning = (privCredentialName: string) => (
    <View style={styles.warningWrapper}>
      <View style={[styles.rowWrapper, styles.warningRowWrapper]}>
        <Icon style={styles.icon} name="eye-slash" size={20} solid />
        {privCredentialName === PRIVATE_KEY ? (
          <Text style={styles.warningMessageText}>
            {strings(
              `reveal_credential.${privCredentialName}_warning_explanation`,
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
        hasNavigation={hasNavigation}
      />
    </SafeAreaView>
  );
};

export default RevealPrivateCredential;
