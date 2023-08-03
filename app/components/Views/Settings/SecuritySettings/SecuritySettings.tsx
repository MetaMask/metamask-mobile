/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Switch,
  Text,
  ScrollView,
  View,
  ActivityIndicator,
  Keyboard,
  InteractionManager,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { MAINNET } from '../../../../constants/network';
import ActionModal from '../../../UI/ActionModal';
import StyledButton from '../../../UI/StyledButton';
import { clearHistory } from '../../../../actions/browser';
import { setThirdPartyApiMode } from '../../../../actions/privacy';
import { colors as importedColors } from '../../../../styles/common';
import Logger from '../../../../util/Logger';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { setLockTime } from '../../../../actions/settings';
import { strings } from '../../../../../locales/i18n';
import Analytics from '../../../../core/Analytics/Analytics';
import { passwordSet } from '../../../../actions/user';
import Engine from '../../../../core/Engine';
import AppConstants from '../../../../core/AppConstants';
import {
  EXISTING_USER,
  TRUE,
  PASSCODE_DISABLED,
  BIOMETRY_CHOICE_DISABLED,
  SEED_PHRASE_HINTS,
} from '../../../../constants/storage';
import HintModal from '../../../UI/HintModal';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import AnalyticsV2, {
  trackErrorAsAnalytics,
} from '../../../../util/analyticsV2';
import { Authentication } from '../../../../core';
import AUTHENTICATION_TYPE from '../../../../constants/userProperties';
import { useTheme } from '../../../../util/theme';
import {
  ClearCookiesSection,
  DeleteMetaMetricsData,
  DeleteWalletData,
  RememberMeOptionSection,
  AutomaticSecurityChecks,
  ProtectYourWallet,
  LoginOptionsSettings,
  RevealPrivateKey,
  ChangePassword,
  AutoLock,
  ClearPrivacy,
} from './Sections';
import { selectProviderType } from '../../../../selectors/networkController';
import {
  selectIpfsGateway,
  selectIsIpfsGatewayEnabled,
  selectIsMultiAccountBalancesEnabled,
  selectOpenSeaEnabled,
  selectUseNftDetection,
} from '../../../../selectors/preferencesController';
import {
  SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
  SECURITY_PRIVACY_VIEW_ID,
} from '../../../../../wdio/screen-objects/testIDs/Screens/SecurityPrivacy.testIds';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import ipfsGateways from '../../../../util/ipfs-gateways.json';
import SelectComponent from '../../../UI/SelectComponent';
import { timeoutFetch } from '../../../../util/general';
import createStyles from './SecuritySettings.styles';
import {
  Gateway,
  HeadingProps,
  SecuritySettingsParams,
} from './SecuritySettings.types';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../../util/navigation/navUtils';
import {
  BIOMETRY_CHOICE_STRING,
  HASH_STRING,
  HASH_TO_TEST,
  PASSCODE_CHOICE_STRING,
} from './SecuritySettings.constants';

const Heading: React.FC<HeadingProps> = ({ children, first }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={[styles.setting, first && styles.firstSetting]}>
      <Text style={[styles.title, styles.heading]}>{children}</Text>
    </View>
  );
};

const Settings: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const params = useParams<SecuritySettingsParams>();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [browserHistoryModalVisible, setBrowserHistoryModalVisible] =
    useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const [onlineIpfsGateways, setOnlineIpfsGateways] = useState<Gateway[]>([]);
  const [gotAvailableGateways, setGotAvailableGateways] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const detectNftComponentRef = useRef<View>(null);

  const browserHistory = useSelector((state: any) => state.browser.history);

  const lockTime = useSelector((state: any) => state.settings.lockTime);
  const thirdPartyApiMode = useSelector(
    (state: any) => state.privacy.thirdPartyApiMode,
  );
  const openSeaEnabled = useSelector(selectOpenSeaEnabled);
  const useNftDetection = useSelector(selectUseNftDetection);

  const seedphraseBackedUp = useSelector(
    (state: any) => state.user.seedphraseBackedUp,
  );
  const type = useSelector(selectProviderType);
  const isMultiAccountBalancesEnabled = useSelector(
    selectIsMultiAccountBalancesEnabled,
  );
  const ipfsGateway = useSelector(selectIpfsGateway);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.security_title'),
        navigation,
        false,
        colors,
        null,
      ),
    );
  }, [colors, navigation]);

  const handleAvailableIpfsGateways = useCallback(async () => {
    if (!isIpfsGatewayEnabled) return;
    const ipfsGatewaysPromises = ipfsGateways.map(async (gateway: Gateway) => {
      const testUrl =
        gateway.value + HASH_TO_TEST + '#x-ipfs-companion-no-redirect';
      try {
        const res = await timeoutFetch(testUrl, 1200);
        const text = await res.text();
        const available = text.trim() === HASH_STRING.trim();
        return { ...gateway, available };
      } catch (e) {
        const available = false;
        return { ...gateway, available };
      }
    });
    const ipfsGatewaysAvailability = await Promise.all(ipfsGatewaysPromises);
    const onlineGateways = ipfsGatewaysAvailability.filter(
      (gateway) => gateway.available,
    );

    const sortedOnlineIpfsGateways = onlineGateways.sort(
      (a, b) => a.key - b.key,
    );

    setGotAvailableGateways(true);
    setOnlineIpfsGateways(sortedOnlineIpfsGateways);
  }, [isIpfsGatewayEnabled]);

  const handleHintText = useCallback(async () => {
    const currentSeedphraseHints = await AsyncStorage.getItem(
      SEED_PHRASE_HINTS,
    );
    const parsedHints =
      currentSeedphraseHints && JSON.parse(currentSeedphraseHints);
    const manualBackup = parsedHints?.manualBackup;

    setHintText(manualBackup);
  }, []);

  useEffect(() => {
    updateNavBar();
    handleHintText();
    AnalyticsV2.trackEvent(MetaMetricsEvents.VIEW_SECURITY_SETTINGS, {});
    const isAnalyticsEnabled = Analytics.checkEnabled();
    setAnalyticsEnabled(isAnalyticsEnabled);

    if (params?.scrollToDetectNFTs && detectNftComponentRef) {
      detectNftComponentRef.current?.measureLayout(
        scrollViewRef.current as any,
        (_, y) => {
          scrollViewRef.current?.scrollTo({ y, animated: true });
        },
      );
    }
  }, [handleHintText, params?.scrollToDetectNFTs, updateNavBar]);

  useEffect(() => {
    handleAvailableIpfsGateways();
  }, [handleAvailableIpfsGateways]);

  const toggleHint = () => {
    setShowHint(!showHint);
  };

  const saveHint = async () => {
    if (!hintText) return;
    toggleHint();
    const currentSeedphraseHints = await AsyncStorage.getItem(
      SEED_PHRASE_HINTS,
    );
    if (currentSeedphraseHints) {
      const parsedHints = JSON.parse(currentSeedphraseHints);
      await AsyncStorage.setItem(
        SEED_PHRASE_HINTS,
        JSON.stringify({ ...parsedHints, manualBackup: hintText }),
      );
    }
  };

  const storeCredentials = async (
    password: string,
    enabled: boolean,
    authChoice: string,
  ) => {
    try {
      await Authentication.resetPassword();

      await Engine.context.KeyringController.exportSeedPhrase(password);

      await AsyncStorage.setItem(EXISTING_USER, TRUE);

      if (!enabled) {
        setLoading(false);
        if (authChoice === PASSCODE_CHOICE_STRING) {
          await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
        } else if (authChoice === BIOMETRY_CHOICE_STRING) {
          await AsyncStorage.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
          await AsyncStorage.setItem(PASSCODE_DISABLED, TRUE);
        }

        return;
      }

      try {
        let authType;
        if (authChoice === BIOMETRY_CHOICE_STRING) {
          authType = AUTHENTICATION_TYPE.BIOMETRIC;
        } else if (authChoice === PASSCODE_CHOICE_STRING) {
          authType = AUTHENTICATION_TYPE.PASSCODE;
        } else {
          authType = AUTHENTICATION_TYPE.PASSWORD;
        }
        await Authentication.storePassword(password, authType);
      } catch (error) {
        Logger.error(error as string, {});
      }

      dispatch(passwordSet());

      if (lockTime === -1) {
        dispatch(setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT));
      }
      setLoading(false);
    } catch (e) {
      const errorWithMessage = e as { message: string };
      if (errorWithMessage.message === 'Invalid password') {
        Alert.alert(
          strings('app_settings.invalid_password'),
          strings('app_settings.invalid_password_message'),
        );
        trackErrorAsAnalytics(
          'SecuritySettings: Invalid password',
          errorWithMessage?.message,
          '',
        );
      } else {
        Logger.error(e as string, 'SecuritySettings:biometrics');
      }
      setLoading(false);
    }
  };

  const setPassword = async (enabled: boolean, passwordType: string) => {
    setLoading(true);
    let credentials;
    try {
      credentials = await Authentication.getPassword();
    } catch (error) {
      Logger.error(error as string, {});
    }

    if (credentials && credentials.password !== '') {
      storeCredentials(credentials.password, enabled, passwordType);
    } else {
      navigation.navigate('EnterPasswordSimple', {
        onPasswordSet: (password: string) => {
          storeCredentials(password, enabled, passwordType);
        },
      });
    }
  };

  const isMainnet = () => type === MAINNET;

  const onSignInWithPasscode = async (enabled: boolean) => {
    await setPassword(enabled, PASSCODE_CHOICE_STRING);
  };

  const onSingInWithBiometrics = async (enabled: boolean) => {
    await setPassword(enabled, BIOMETRY_CHOICE_STRING);
  };

  const goToSDKSessionManager = () => {
    navigation.navigate('SDKSessionsManager');
  };

  const renderSDKSettings = () => (
    <View style={[styles.setting, styles.firstSetting]} testID={'sdk-section'}>
      <Text style={styles.title}>
        {strings('app_settings.manage_sdk_connections_title')}
      </Text>
      <Text style={styles.desc}>
        {strings('app_settings.manage_sdk_connections_text')}
      </Text>
      <StyledButton
        type="normal"
        containerStyle={styles.confirm}
        onPress={goToSDKSessionManager}
      >
        {strings('app_settings.manage_sdk_connections_title')}
      </StyledButton>
    </View>
  );

  const toggleClearBrowserHistoryModal = () => {
    setBrowserHistoryModalVisible(!browserHistoryModalVisible);
  };

  const renderClearBrowserHistorySection = () => (
    <View style={styles.setting} testID="clear-browser-history-section">
      <Text style={styles.title}>
        {strings('app_settings.clear_browser_history_desc')}
      </Text>
      <Text style={styles.desc}>
        {strings('app_settings.clear_history_desc')}
      </Text>
      <StyledButton
        type="normal"
        onPress={toggleClearBrowserHistoryModal}
        disabled={browserHistory.length === 0}
        containerStyle={styles.confirm}
      >
        {strings('app_settings.clear_browser_history_desc')}
      </StyledButton>
    </View>
  );

  /**
   * Track the event of opt in or opt out.
   * @param AnalyticsOptionSelected - User selected option regarding the tracking of events
   */
  const trackOptInEvent = (AnalyticsOptionSelected: string) => {
    InteractionManager.runAfterInteractions(async () => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED, {
        analytics_option_selected: AnalyticsOptionSelected,
        updated_after_onboarding: true,
      });
    });
  };

  const toggleMetricsOptIn = async (value: boolean) => {
    if (value) {
      Analytics.enable();

      setAnalyticsEnabled(true);
      await trackOptInEvent('Metrics Opt In');
    } else {
      await trackOptInEvent('Metrics Opt Out');
      Analytics.disable();
      setAnalyticsEnabled(false);
      Alert.alert(
        strings('app_settings.metametrics_opt_out'),
        strings('app_settings.metametrics_restart_required'),
      );
    }
  };

  const renderMetaMetricsSection = () => (
    <View style={styles.setting} testID={'metametrics-section'}>
      <Text style={styles.title}>
        {strings('app_settings.metametrics_title')}
      </Text>
      <Text style={styles.desc}>
        {strings('app_settings.metametrics_description')}
      </Text>
      <View style={styles.switchElement}>
        <Switch
          value={analyticsEnabled}
          onValueChange={toggleMetricsOptIn}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={importedColors.white}
          style={styles.switch}
          ios_backgroundColor={colors.border.muted}
          testID={'metametrics-switch'}
        />
      </View>
    </View>
  );

  const toggleIsMultiAccountBalancesEnabled = (
    multiAccountBalancesEnabled: boolean,
  ) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setIsMultiAccountBalancesEnabled(
      multiAccountBalancesEnabled,
    );
  };

  const renderMultiAccountBalancesSection = () => (
    <View style={styles.setting} testID="batch-balance-requests-section">
      <Text style={styles.title}>
        {strings('app_settings.batch_balance_requests_title')}
      </Text>
      <Text style={styles.desc}>
        {strings('app_settings.batch_balance_requests_description')}
      </Text>
      <View style={styles.switchElement}>
        <Switch
          value={isMultiAccountBalancesEnabled}
          onValueChange={toggleIsMultiAccountBalancesEnabled}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={importedColors.white}
          style={styles.switch}
          ios_backgroundColor={colors.border.muted}
          {...generateTestId(
            Platform,
            SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
          )}
        />
      </View>
    </View>
  );
  const toggleThirdPartyAPI = (value: boolean) => {
    dispatch(setThirdPartyApiMode(value));
  };

  const renderThirdPartySection = () => (
    <View style={styles.setting} testID={'third-party-section'}>
      <Text style={styles.title}>
        {strings('app_settings.third_party_title')}
      </Text>
      <Text style={styles.desc}>
        {strings('app_settings.third_party_description')}
      </Text>
      <View style={styles.switchElement}>
        <Switch
          value={thirdPartyApiMode}
          onValueChange={toggleThirdPartyAPI}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={importedColors.white}
          style={styles.switch}
          ios_backgroundColor={colors.border.muted}
        />
      </View>
    </View>
  );

  const clearBrowserHistory = () => {
    dispatch(clearHistory());
    toggleClearBrowserHistoryModal();
  };

  const renderHistoryModal = () => (
    <ActionModal
      modalVisible={browserHistoryModalVisible}
      confirmText={strings('app_settings.clear')}
      cancelText={strings('app_settings.reset_account_cancel_button')}
      onCancelPress={toggleClearBrowserHistoryModal}
      onRequestClose={toggleClearBrowserHistoryModal}
      onConfirmPress={clearBrowserHistory}
    >
      <View style={styles.modalView}>
        <Text style={styles.modalTitle}>
          {strings('app_settings.clear_browser_history_modal_title')}
        </Text>
        <Text style={styles.modalText}>
          {strings('app_settings.clear_browser_history_modal_message')}
        </Text>
      </View>
    </ActionModal>
  );

  const toggleOpenSeaApi = (value: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController?.setOpenSeaEnabled(value);
    if (!value) PreferencesController?.setUseNftDetection(value);
  };

  const toggleNftAutodetect = (value: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setUseNftDetection(value);
  };

  const renderOpenSeaSettings = () => (
    <>
      <View
        ref={detectNftComponentRef}
        style={styles.setting}
        testID={'nft-opensea-mode-section'}
      >
        <Text style={styles.title}>
          {strings('app_settings.nft_opensea_mode')}
        </Text>
        <Text style={styles.desc}>
          {strings('app_settings.nft_opensea_desc')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={openSeaEnabled}
            onValueChange={toggleOpenSeaApi}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={importedColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
          />
        </View>
      </View>
      <View
        style={styles.setting}
        testID={'nft-opensea-autodetect-mode-section'}
      >
        <Text style={styles.title}>
          {strings('app_settings.nft_autodetect_mode')}
        </Text>
        <Text style={styles.desc}>
          {strings('app_settings.nft_autodetect_desc')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={useNftDetection}
            onValueChange={toggleNftAutodetect}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={importedColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            disabled={!openSeaEnabled}
          />
        </View>
      </View>
    </>
  );

  const setIpfsGateway = (gateway: string) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setIpfsGateway(gateway);
  };

  const setIsIpfsGatewayEnabled = (isIpfsGatewatEnabled: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setIsIpfsGatewayEnabled(isIpfsGatewatEnabled);
  };

  const renderIpfsGateway = () => (
    <View style={styles.setting} testID="ipfs-gateway-section">
      <Text style={styles.title}>{strings('app_settings.ipfs_gateway')}</Text>
      <Text style={styles.desc}>
        {strings('app_settings.ipfs_gateway_content')}
      </Text>
      <View style={styles.marginTop}>
        <Switch
          value={isIpfsGatewayEnabled}
          onValueChange={setIsIpfsGatewayEnabled}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={importedColors.white}
          style={styles.switch}
          ios_backgroundColor={colors.border.muted}
        />
      </View>
      {isIpfsGatewayEnabled && (
        <>
          <Text style={styles.desc}>
            {strings('app_settings.ipfs_gateway_desc')}
          </Text>
          <View style={styles.picker}>
            {gotAvailableGateways ? (
              <SelectComponent
                selectedValue={ipfsGateway}
                defaultValue={strings('app_settings.ipfs_gateway_down')}
                onValueChange={setIpfsGateway}
                label={strings('app_settings.ipfs_gateway')}
                options={onlineIpfsGateways}
              />
            ) : (
              <View>
                <ActivityIndicator size="small" />
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );

  const handleChangeText = (text: string) => setHintText(text);

  const renderHint = () => (
    <HintModal
      onConfirm={saveHint}
      onCancel={toggleHint}
      modalVisible={showHint}
      onRequestClose={Keyboard.dismiss}
      value={hintText}
      onChangeText={handleChangeText}
    />
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.wrapper}
      testID={SECURITY_PRIVACY_VIEW_ID}
      ref={scrollViewRef}
    >
      <View style={styles.inner}>
        <Heading first>{strings('app_settings.security_heading')}</Heading>
        <ProtectYourWallet
          srpBackedup={seedphraseBackedUp}
          hintText={hintText}
          toggleHint={toggleHint}
        />
        <ChangePassword />
        <AutoLock />
        <LoginOptionsSettings
          onSignWithBiometricsOptionUpdated={onSingInWithBiometrics}
          onSignWithPasscodeOptionUpdated={onSignInWithPasscode}
        />
        <RememberMeOptionSection />
        <RevealPrivateKey />
        <Heading>{strings('app_settings.privacy_heading')}</Heading>
        {renderSDKSettings()}
        <ClearPrivacy />
        {renderClearBrowserHistorySection()}
        <ClearCookiesSection />
        {renderMetaMetricsSection()}
        <DeleteMetaMetricsData />
        <DeleteWalletData />
        {renderMultiAccountBalancesSection()}
        {renderThirdPartySection()}
        {renderHistoryModal()}
        {isMainnet() && renderOpenSeaSettings()}
        {renderIpfsGateway()}
        <AutomaticSecurityChecks />
        {renderHint()}
      </View>
    </ScrollView>
  );
};

export default Settings;
