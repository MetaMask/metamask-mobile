/* eslint-disable no-mixed-spaces-and-tabs */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { InternalAccount } from '@metamask/keyring-internal-api';
import QRCode from 'react-native-qrcode-svg';
import { RouteProp, ParamListBase } from '@react-navigation/native';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTabView = ScrollView as any;
import { store } from '../../../store';
import StorageWrapper from '../../../store/storage-wrapper';
import ActionView from '../../UI/ActionView';
import ButtonReveal from '../../UI/ButtonReveal';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import Icon, {
  IconSize,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import InfoModal from '../../Base/InfoModal';
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
import { uint8ArrayToMnemonic } from '../../../util/mnemonic';
import { passwordRequirementsMet } from '../../../util/password';
import { Authentication } from '../../../core/';

import { isTest } from '../../../util/test/utils';
import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import {
  getInternalAccountByAddress,
  isHardwareAccount,
} from '../../../util/address';
import AppConstants from '../../../core/AppConstants';
import { createStyles } from './styles';
import { getNavigationOptionsTitle } from '../../../components/UI/Navbar';
import { RevealSeedViewSelectorsIDs } from '../../../../e2e/selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';

import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { AccountInfo } from '../MultichainAccounts/AccountDetails/components/AccountInfo/AccountInfo';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import TabBar from '../../../component-library/components-temp/TabBar/TabBar';

export const PRIVATE_KEY = 'private_key';

interface RootStackParamList extends ParamListBase {
  RevealPrivateCredential: {
    credentialName: string;
    shouldUpdateNav?: boolean;
    selectedAccount?: InternalAccount;
    keyringId?: string;
  };
}

type RevealPrivateCredentialRouteProp = RouteProp<
  RootStackParamList,
  'RevealPrivateCredential'
>;

interface IRevealPrivateCredentialProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  credentialName: string;
  cancel: () => void;
  route: RevealPrivateCredentialRouteProp;
  showCancelButton?: boolean;
}

const RevealPrivateCredential = ({
  navigation,
  credentialName,
  cancel,
  route,
  showCancelButton,
}: IRevealPrivateCredentialProps) => {
  const hasNavigation = !!navigation;
  // TODO - Refactor or split RevealPrivateCredential when used in Nav stack vs outside of it
  const shouldUpdateNav = route?.params?.shouldUpdateNav;
  const [clipboardPrivateCredential, setClipboardPrivateCredential] =
    useState<string>('');
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [warningIncorrectPassword, setWarningIncorrectPassword] =
    useState<string>('');
  const [clipboardEnabled, setClipboardEnabled] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const passwordInputRef = useRef<TextInput>(null);

  const keyringId = route?.params?.keyringId;

  const checkSummedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const passwordSet = useSelector((state: any) => state.user.passwordSet);

  const dispatch = useDispatch();

  const theme = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { colors, themeAppearance } = theme;
  const styles = createStyles(theme);

  const credentialSlug = credentialName || route?.params.credentialName;
  const selectedAddress =
    route?.params?.selectedAccount?.address || checkSummedAddress;

  // Address will always be defined because checkSummedAddress is the selectedAccount's address
  const account = getInternalAccountByAddress(selectedAddress as string);

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

  const tryUnlockWithPassword = useCallback(
    async (pswd: string, privCredentialName?: string) => {
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { KeyringController } = Engine.context as any;
      const isPrivateKeyReveal = privCredentialName === PRIVATE_KEY;

      // This will trigger after the user hold-pressed the button, we want to trace the actual
      // keyring operation of extracting the credential
      const traceName = isPrivateKeyReveal
        ? TraceName.RevealPrivateKey
        : TraceName.RevealSrp;
      trace({
        name: traceName,
        op: TraceOperation.RevealPrivateCredential,
        tags: getTraceTags(store.getState()),
      });

      try {
        let privateCredential;
        if (!isPrivateKeyReveal) {
          const uint8ArraySeed = await KeyringController.exportSeedPhrase(
            pswd,
            keyringId,
          );
          privateCredential = uint8ArrayToMnemonic(uint8ArraySeed, wordlist);
        } else {
          privateCredential = await KeyringController.exportAccount(
            pswd,
            selectedAddress,
          );
        }

        if (privateCredential) {
          setClipboardPrivateCredential(privateCredential);
          setUnlocked(true);

          // We would reveal the private credential after this point, so that's the end of the flow.
          endTrace({
            name: traceName,
          });
        }
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        let msg = strings('reveal_credential.warning_incorrect_password');
        if (selectedAddress && isHardwareAccount(selectedAddress)) {
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
    },
    [selectedAddress, keyringId],
  );

  useEffect(() => {
    updateNavBar();
    // Track SRP Reveal screen rendered
    if (!isPrivateKey) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REVEAL_SRP_SCREEN).build(),
      );
    }

    const unlockWithBiometrics = async () => {
      // Try to use biometrics to unlock
      const { availableBiometryType } = await Authentication.getType();
      if (!passwordSet) {
        tryUnlockWithPassword('');
      } else if (availableBiometryType) {
        const biometryChoice = await StorageWrapper.getItem(BIOMETRY_CHOICE);
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
      trackEvent(
        createEventBuilder(
          isPrivateKey
            ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_CANCELLED
            : MetaMetricsEvents.REVEAL_SRP_CANCELLED,
        )
          .addProperties({
            view: 'Enter password',
          })
          .build(),
      );

    if (!isPrivateKey)
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CANCEL_REVEAL_SRP_CTA).build(),
      );
    if (cancel) return cancel();
    navigateBack();
  };

  const tryUnlock = async () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { KeyringController } = Engine.context as any;
    try {
      await KeyringController.verifyPassword(password);
    } catch {
      const msg = strings('reveal_credential.warning_incorrect_password');
      setWarningIncorrectPassword(msg);
      return;
    }

    if (!isPrivateKey) {
      const currentDate = new Date();
      dispatch(recordSRPRevealTimestamp(currentDate.toString()));
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NEXT_REVEAL_SRP_CTA).build(),
      );
    }
    setIsModalVisible(true);
    setWarningIncorrectPassword('');
  };

  const onPasswordChange = (pswd: string) => {
    setPassword(pswd);
  };

  const done = () => {
    if (!isPrivateKey)
      trackEvent(createEventBuilder(MetaMetricsEvents.SRP_DONE_CTA).build());
    navigateBack();
  };

  const copyPrivateCredentialToClipboard = async (
    privCredentialName: string,
  ) => {
    trackEvent(
      createEventBuilder(
        privCredentialName === PRIVATE_KEY
          ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_COMPLETED
          : MetaMetricsEvents.REVEAL_SRP_COMPLETED,
      )
        .addProperties({
          action: 'copied to clipboard',
        })
        .build(),
    );

    if (!isPrivateKey)
      trackEvent(createEventBuilder(MetaMetricsEvents.COPY_SRP).build());

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

  const revealCredential = useCallback(() => {
    const credential = credentialName || route?.params.credentialName;
    tryUnlockWithPassword(password, credential);
    setIsModalVisible(false);
  }, [
    credentialName,
    password,
    route?.params.credentialName,
    tryUnlockWithPassword,
  ]);

  const renderTabBar = () => <TabBar />;

  const onTabBarChange = (event: { i: number }) => {
    if (event.i === 0) {
      trackEvent(
        createEventBuilder(
          isPrivateKey
            ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_COMPLETED
            : MetaMetricsEvents.REVEAL_SRP_COMPLETED,
        )
          .addProperties({ action: 'viewed SRP' })
          .build(),
      );

      if (!isPrivateKey)
        trackEvent(createEventBuilder(MetaMetricsEvents.VIEW_SRP).build());
    } else if (event.i === 1) {
      trackEvent(
        createEventBuilder(
          isPrivateKey
            ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_COMPLETED
            : MetaMetricsEvents.REVEAL_SRP_COMPLETED,
        )
          .addProperties({ action: 'viewed QR code' })
          .build(),
      );

      if (!isPrivateKey)
        trackEvent(createEventBuilder(MetaMetricsEvents.VIEW_SRP_QR).build());
    }
  };

  useEffect(() => {
    Device.isAndroid() &&
      Device.getDeviceAPILevel().then((apiLevel) => {
        if (apiLevel < AppConstants.LEAST_SUPPORTED_ANDROID_API_LEVEL) {
          setClipboardEnabled(false);
          return;
        }
      });

    setClipboardEnabled(true);
  }, []);

  const renderTabView = (privCredentialName: string) => (
    <View style={styles.tabContainer}>
      <ScrollableTabView
        renderTabBar={() => renderTabBar()}
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChangeTab={(event: any) => onTabBarChange(event)}
        style={styles.tabContentContainer}
      >
        <CustomTabView
          tabLabel={strings(`reveal_credential.text`)}
          testID={RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_TEXT}
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
              testID={RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_TEXT}
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
                testID={
                  RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON
                }
                style={styles.clipboardButton}
              />
            ) : null}
          </View>
        </CustomTabView>
        <CustomTabView
          tabLabel={strings(`reveal_credential.qr_code`)}
          testID={RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_QR_CODE}
        >
          <View
            style={styles.qrCodeWrapper}
            testID={
              RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_QR_CODE_IMAGE_ID
            }
          >
            <QRCode
              value={clipboardPrivateCredential}
              size={Dimensions.get('window').width - 200}
            />
          </View>
        </CustomTabView>
      </ScrollableTabView>
    </View>
  );

  const renderPasswordEntry = () => (
    <>
      <Text style={styles.enterPassword} variant={TextVariant.BodyMDMedium}>
        {strings('reveal_credential.enter_password')}
      </Text>
      <TextInput
        ref={passwordInputRef}
        style={styles.input}
        placeholder={'Password'}
        placeholderTextColor={colors.text.muted}
        onChangeText={onPasswordChange}
        secureTextEntry
        autoCapitalize="none"
        onSubmitEditing={tryUnlock}
        keyboardAppearance={themeAppearance}
        testID={RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID}
        onTouchStart={() => {
          if (!passwordInputRef.current?.isFocused()) {
            passwordInputRef.current?.focus();
          }
        }}
      />
      <Text
        style={styles.warningText}
        testID={RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID}
      >
        {warningIncorrectPassword}
      </Text>
    </>
  );

  const closeModal = () => {
    trackEvent(
      createEventBuilder(
        isPrivateKey
          ? MetaMetricsEvents.REVEAL_PRIVATE_KEY_CANCELLED
          : MetaMetricsEvents.REVEAL_SRP_CANCELLED,
      )
        .addProperties({ view: 'Hold to reveal' })
        .build(),
    );

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SRP_DISMISS_HOLD_TO_REVEAL_DIALOG,
      ).build(),
    );

    setIsModalVisible(false);
  };

  const renderModal = (isPrivateKeyReveal: boolean) => (
    <InfoModal
      isVisible={isModalVisible}
      toggleModal={closeModal}
      testID={RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_MODAL_ID}
      title={strings('reveal_credential.keep_credential_safe', {
        credentialName: isPrivateKeyReveal
          ? strings('reveal_credential.private_key_text')
          : strings('reveal_credential.srp_abbreviation_text'),
      })}
      body={
        <>
          <Text variant={TextVariant.BodyMD} style={styles.revealModalText}>
            {
              strings('reveal_credential.reveal_credential_modal', {
                credentialName: isPrivateKeyReveal
                  ? strings('reveal_credential.private_key_text')
                  : strings('reveal_credential.srp_text'),
              })[0]
            }
            <Text variant={TextVariant.BodyMDBold}>
              {isPrivateKeyReveal
                ? strings('reveal_credential.reveal_credential_modal')[1]
                : strings('reveal_credential.reveal_credential_modal')[2]}
            </Text>
            {strings('reveal_credential.reveal_credential_modal')[3]}
            <Text
              color={colors.primary.default}
              variant={TextVariant.BodyMDBold}
              onPress={() => Linking.openURL(KEEP_SRP_SAFE_URL)}
            >
              {strings('reveal_credential.reveal_credential_modal')[4]}
            </Text>
          </Text>
          {isTest ? (
            <Button
              label={strings('reveal_credential.reveal_credential', {
                credentialName: isPrivateKeyReveal
                  ? strings('reveal_credential.private_key_text')
                  : strings('reveal_credential.srp_abbreviation_text'),
              })}
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              onPress={revealCredential}
              style={styles.revealButton}
              testID={RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID}
            />
          ) : (
            <ButtonReveal
              label={strings('reveal_credential.hold_to_reveal_credential', {
                credentialName: isPrivateKeyReveal
                  ? strings('reveal_credential.private_key_text')
                  : strings('reveal_credential.srp_abbreviation_text'),
              })}
              onLongPress={revealCredential}
            />
          )}
        </>
      }
    />
  );

  const renderSRPExplanation = () => (
    <Text style={styles.normalText}>
      {strings('reveal_credential.seed_phrase_explanation')[0]}{' '}
      <Text
        color={colors.primary.default}
        onPress={() => Linking.openURL(SRP_GUIDE_URL)}
      >
        {strings('reveal_credential.seed_phrase_explanation')[1]}
      </Text>{' '}
      {strings('reveal_credential.seed_phrase_explanation')[2]}{' '}
      <Text>{strings('reveal_credential.seed_phrase_explanation')[3]}</Text>
      {strings('reveal_credential.seed_phrase_explanation')[4]}{' '}
      <Text
        color={colors.primary.default}
        onPress={() => Linking.openURL(NON_CUSTODIAL_WALLET_URL)}
      >
        {strings('reveal_credential.seed_phrase_explanation')[5]}{' '}
      </Text>
      {strings('reveal_credential.seed_phrase_explanation')[6]}{' '}
      <Text>{strings('reveal_credential.seed_phrase_explanation')[7]}</Text>
    </Text>
  );

  const renderWarning = (privCredentialName: string) => (
    <View style={[styles.rowWrapper, styles.warningWrapper]}>
      <View style={[styles.warningRowWrapper]}>
        <Icon
          color={colors.error.default}
          name={IconName.EyeSlash}
          size={IconSize.Lg}
          style={styles.icon}
        />
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
    <View
      style={styles.wrapper}
      testID={RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID}
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
        confirmDisabled={!passwordRequirementsMet(password)}
        cancelTestID={
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID
        }
        confirmTestID={
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID
        }
        scrollViewTestID={
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_SCROLL_ID
        }
        // The cancel button here is not named correctly. When it is unlocked, the button is shown as "Done"
        showCancelButton={Boolean(showCancelButton || unlocked)}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={40}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* @ts-expect-error - React Native style type mismatch due to outdated @types/react-native See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382 */}
          <View style={[styles.rowWrapper, styles.normalText]}>
            {isPrivateKey && account ? (
              <>
                <AccountInfo account={account} />
                <BannerAlert
                  severity={BannerAlertSeverity.Error}
                  title={strings(
                    'multichain_accounts.reveal_private_key.banner_title',
                  )}
                  description={strings(
                    'multichain_accounts.reveal_private_key.banner_description',
                  )}
                />
              </>
            ) : (
              <>
                {renderSRPExplanation()}
                {renderWarning(credentialSlug)}
              </>
            )}
          </View>
          {unlocked ? (
            renderTabView(credentialSlug)
          ) : (
            <View style={styles.rowWrapper}>{renderPasswordEntry()}</View>
          )}
        </View>
      </ActionView>
      {renderModal(isPrivateKey)}

      <ScreenshotDeterrent
        enabled={unlocked}
        isSRP={credentialSlug !== PRIVATE_KEY}
        hasNavigation={hasNavigation}
      />
    </View>
  );
};

export default RevealPrivateCredential;
