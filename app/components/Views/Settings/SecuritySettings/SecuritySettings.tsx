/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Switch,
  ScrollView,
  View,
  ActivityIndicator,
  Keyboard,
  Platform,
  Linking,
} from 'react-native';
import StorageWrapper from '../../../../store/storage-wrapper';
import { useDispatch, useSelector } from 'react-redux';
import { MAINNET } from '../../../../constants/network';
import ActionModal from '../../../UI/ActionModal';
import { clearHistory } from '../../../../actions/browser';
import Logger from '../../../../util/Logger';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { setLockTime } from '../../../../actions/settings';
import { SIMULATION_DETALS_ARTICLE_URL } from '../../../../constants/urls';
import { strings } from '../../../../../locales/i18n';
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
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
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
  BlockaidSettings,
} from './Sections';
import {
  selectProviderType,
  selectNetworkConfigurations,
} from '../../../../selectors/networkController';
import {
  selectIpfsGateway,
  selectIsIpfsGatewayEnabled,
  selectIsMultiAccountBalancesEnabled,
  selectDisplayNftMedia,
  selectUseNftDetection,
  selectShowIncomingTransactionNetworks,
  selectShowTestNetworks,
  selectUseSafeChainsListValidation,
  selectUseTransactionSimulations,
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
  EtherscanNetworksType,
  Gateway,
  HeadingProps,
  NetworksI,
  SecuritySettingsParams,
} from './SecuritySettings.types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useParams } from '../../../../util/navigation/navUtils';
import {
  BATCH_BALANCE_REQUESTS_SECTION,
  BIOMETRY_CHOICE_STRING,
  CLEAR_BROWSER_HISTORY_SECTION,
  DISPLAY_SAFE_CHAINS_LIST_VALIDATION,
  HASH_STRING,
  HASH_TO_TEST,
  IPFS_GATEWAY_SECTION,
  NFT_AUTO_DETECT_MODE_SECTION,
  NFT_DISPLAY_MEDIA_MODE_SECTION,
  PASSCODE_CHOICE_STRING,
  SDK_SECTION,
  USE_SAFE_CHAINS_LIST_VALIDATION,
} from './SecuritySettings.constants';
import Cell from '../../../..//component-library/components/Cells/Cell/Cell';
import { CellVariant } from '../../../../component-library/components/Cells/Cell';
import { AvatarVariant } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
import Networks, {
  getAllNetworks,
  getNetworkImageSource,
  toggleUseSafeChainsListValidation,
} from '../../../../util/networks';
import images from 'images/image-icons';
import { ETHERSCAN_SUPPORTED_NETWORKS } from '@metamask/transaction-controller';
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import trackErrorAsAnalytics from '../../../../util/metrics/TrackError/trackErrorAsAnalytics';
import BasicFunctionalityComponent from '../../../UI/BasicFunctionality/BasicFunctionality';
import ProfileSyncingComponent from '../../../UI/ProfileSyncing/ProfileSyncing';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetrics } from '../../../../core/Analytics';
import MetaMetricsAndDataCollectionSection from './Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection';
import { UserProfileProperty } from '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { selectIsProfileSyncingEnabled } from '../../../../selectors/notifications';
import { useProfileSyncing } from '../../../../util/notifications/hooks/useProfileSyncing';
import SwitchLoadingModal from '../../../../components/UI/Notification/SwitchLoadingModal';

const Heading: React.FC<HeadingProps> = ({ children, first }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={[styles.setting, first && styles.firstSetting]}>
      <Text variant={TextVariant.HeadingLG} style={styles.heading}>
        {children}
      </Text>
    </View>
  );
};

const Settings: React.FC = () => {
  const { trackEvent, isEnabled, addTraitsToUser } = useMetrics();
  const theme = useTheme();
  const { colors } = theme;
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
  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);
  const {
    enableProfileSyncing,
    loading: profileSyncLoading,
    error: profileSyncError,
  } = useProfileSyncing();

  const scrollViewRef = useRef<ScrollView>(null);
  const detectNftComponentRef = useRef<View>(null);

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const browserHistory = useSelector((state: any) => state.browser.history);

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lockTime = useSelector((state: any) => state.settings.lockTime);
  const showTestNetworks = useSelector(selectShowTestNetworks);
  const showIncomingTransactionsNetworks = useSelector(
    selectShowIncomingTransactionNetworks,
  );
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const displayNftMedia = useSelector(selectDisplayNftMedia);
  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );
  const useTransactionSimulations = useSelector(
    selectUseTransactionSimulations,
  );

  const useNftDetection = useSelector(selectUseNftDetection);

  const seedphraseBackedUp = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.user.seedphraseBackedUp,
  );
  const type = useSelector(selectProviderType);
  const isMultiAccountBalancesEnabled = useSelector(
    selectIsMultiAccountBalancesEnabled,
  );
  const ipfsGateway = useSelector(selectIpfsGateway);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);
  const myNetworks = ETHERSCAN_SUPPORTED_NETWORKS as EtherscanNetworksType;
  const isMainnet = type === MAINNET;

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

    const sortedOnlineIpfsGateways = [...onlineGateways].sort(
      (a, b) => a.key - b.key,
    );

    setGotAvailableGateways(true);
    setOnlineIpfsGateways(sortedOnlineIpfsGateways);
  }, [isIpfsGatewayEnabled]);

  const handleHintText = useCallback(async () => {
    const currentSeedphraseHints = await StorageWrapper.getItem(
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
    setAnalyticsEnabled(isEnabled());
    trackEvent(MetaMetricsEvents.VIEW_SECURITY_SETTINGS, {});
  }, [
    handleHintText,
    updateNavBar,
    setAnalyticsEnabled,
    isEnabled,
    trackEvent,
  ]);

  const scrollToDetectNFTs = useCallback(() => {
    if (detectNftComponentRef.current) {
      detectNftComponentRef.current?.measureLayout(
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scrollViewRef.current as any,
        (_, y) => {
          scrollViewRef.current?.scrollTo({
            y,
            animated: true,
          });
        },
        () => null,
      );
    }
  }, []);

  const waitForRenderDetectNftComponentRef = useCallback(async () => {
    if (params?.scrollToDetectNFTs) {
      // Add a delay to ensure the component is fully rendered
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Scroll to the desired position
      scrollToDetectNFTs();
    }
  }, [scrollToDetectNFTs, params?.scrollToDetectNFTs]);

  useFocusEffect(
    useCallback(() => {
      waitForRenderDetectNftComponentRef();
    }, [waitForRenderDetectNftComponentRef]),
  );

  useEffect(() => {
    handleAvailableIpfsGateways();
  }, [handleAvailableIpfsGateways]);

  const toggleHint = () => {
    setShowHint(!showHint);
  };

  const saveHint = async () => {
    if (!hintText) return;
    toggleHint();
    const currentSeedphraseHints = await StorageWrapper.getItem(
      SEED_PHRASE_HINTS,
    );
    if (currentSeedphraseHints) {
      const parsedHints = JSON.parse(currentSeedphraseHints);
      await StorageWrapper.setItem(
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

      await StorageWrapper.setItem(EXISTING_USER, TRUE);

      if (!enabled) {
        setLoading(false);
        if (authChoice === PASSCODE_CHOICE_STRING) {
          await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);
        } else if (authChoice === BIOMETRY_CHOICE_STRING) {
          await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
          await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);
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
    <View style={styles.halfSetting} testID={SDK_SECTION}>
      <Text variant={TextVariant.BodyLGMedium}>
        {strings('app_settings.manage_sdk_connections_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.manage_sdk_connections_text')}
      </Text>
      <View style={styles.accessory}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('app_settings.manage_sdk_connections_title')}
          onPress={goToSDKSessionManager}
        />
      </View>
    </View>
  );

  const toggleClearBrowserHistoryModal = () => {
    setBrowserHistoryModalVisible(!browserHistoryModalVisible);
  };

  const renderClearBrowserHistorySection = () => (
    <View style={styles.setting} testID={CLEAR_BROWSER_HISTORY_SECTION}>
      <Text variant={TextVariant.BodyLGMedium}>
        {strings('app_settings.clear_browser_history_desc')}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.clear_history_desc')}
      </Text>
      <View style={styles.accessory}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('app_settings.clear_browser_history_desc')}
          onPress={toggleClearBrowserHistoryModal}
          isDisabled={browserHistory.length === 0}
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
    <View style={styles.halfSetting} testID={BATCH_BALANCE_REQUESTS_SECTION}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('app_settings.batch_balance_requests_title')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={isMultiAccountBalancesEnabled}
            onValueChange={toggleIsMultiAccountBalancesEnabled}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            {...generateTestId(
              Platform,
              SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
            )}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.batch_balance_requests_description')}
      </Text>
    </View>
  );
  const toggleEnableIncomingTransactions = (
    hexChainId: string,
    value: boolean,
  ) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setEnableNetworkIncomingTransactions(
      hexChainId,
      value,
    );
  };

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
        <Text variant={TextVariant.HeadingMD} style={styles.modalTitle}>
          {strings('app_settings.clear_browser_history_modal_title')}
        </Text>
        <Text style={styles.modalText}>
          {strings('app_settings.clear_browser_history_modal_message')}
        </Text>
      </View>
    </ActionModal>
  );

  const toggleDisplayNftMedia = (value: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController?.setDisplayNftMedia(value);
    if (!value) PreferencesController?.setUseNftDetection(value);
  };

  const toggleNftAutodetect = useCallback(
    (value) => {
      const { PreferencesController } = Engine.context;
      if (value) {
        PreferencesController.setDisplayNftMedia(value);
      }
      PreferencesController.setUseNftDetection(value);
      const traits = {
        [UserProfileProperty.NFT_AUTODETECTION]: value
          ? UserProfileProperty.ON
          : UserProfileProperty.OFF,
      };
      addTraitsToUser(traits);
      trackEvent(MetaMetricsEvents.NFT_AUTO_DETECTION_ENABLED, {
        ...traits,
        location: 'app_settings',
      });
    },
    [addTraitsToUser, trackEvent],
  );

  const renderDisplayNftMedia = useCallback(
    () => (
      <View style={styles.halfSetting} testID={NFT_DISPLAY_MEDIA_MODE_SECTION}>
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
            {strings('app_settings.display_nft_media')}
          </Text>
          <View style={styles.switchElement}>
            <Switch
              value={displayNftMedia}
              onValueChange={toggleDisplayNftMedia}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              style={styles.switch}
              ios_backgroundColor={colors.border.muted}
              testID="display-nft-toggle"
            />
          </View>
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.desc}
        >
          {strings('app_settings.display_nft_media_desc_new')}
        </Text>
      </View>
    ),
    [colors, styles, displayNftMedia, theme],
  );

  const renderUseSafeChainsListValidation = useCallback(
    () => (
      <View style={styles.halfSetting} testID={USE_SAFE_CHAINS_LIST_VALIDATION}>
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
            {strings('wallet.network_details_check')}
          </Text>
          <View style={styles.switchElement}>
            <Switch
              value={useSafeChainsListValidation}
              onValueChange={toggleUseSafeChainsListValidation}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              style={styles.switch}
              ios_backgroundColor={colors.border.muted}
              testID={DISPLAY_SAFE_CHAINS_LIST_VALIDATION}
            />
          </View>
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.desc}
        >
          {strings('app_settings.use_safe_chains_list_validation_desc_1')}
          <Text variant={TextVariant.BodyMDBold}>chainid.network </Text>
          {strings('app_settings.use_safe_chains_list_validation_desc_2')}{' '}
          chainid.network
        </Text>
      </View>
    ),
    [colors, styles, useSafeChainsListValidation, theme.brandColors],
  );

  const toggleUseTransactionSimulations = (value: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setUseTransactionSimulations(value);
  };

  const renderUseTransactionSimulations = useCallback(
    () => (
      <View style={styles.halfSetting}>
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
            {strings('app_settings.simulation_details')}
          </Text>
          <View style={styles.switchElement}>
            <Switch
              value={useTransactionSimulations}
              onValueChange={toggleUseTransactionSimulations}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              style={styles.switch}
              ios_backgroundColor={colors.border.muted}
            />
          </View>
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.desc}
        >
          {strings('app_settings.simulation_details_description')}
          <Button
            variant={ButtonVariants.Link}
            size={ButtonSize.Auto}
            onPress={() => {
              Linking.openURL(SIMULATION_DETALS_ARTICLE_URL);
              MetaMetrics.getInstance().trackEvent(
                MetaMetricsEvents.EXTERNAL_LINK_CLICKED,
                {
                  location: 'app_settings',
                  text: strings('app_settings.simulation_details_learn_more'),
                  url_domain: SIMULATION_DETALS_ARTICLE_URL,
                },
              );
            }}
            label={strings('app_settings.simulation_details_learn_more')}
          />
        </Text>
      </View>
    ),
    [colors, styles, useTransactionSimulations, theme.brandColors.white],
  );

  const renderAutoDetectNft = useCallback(
    () => (
      <View
        style={styles.setting}
        testID={NFT_AUTO_DETECT_MODE_SECTION}
        ref={detectNftComponentRef}
      >
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
            {strings('app_settings.nft_autodetect_mode')}
          </Text>
          <View style={styles.switchElement}>
            <Switch
              value={useNftDetection}
              onValueChange={toggleNftAutodetect}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              style={styles.switch}
              ios_backgroundColor={colors.border.muted}
            />
          </View>
        </View>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.desc}
        >
          {strings('app_settings.autodetect_nft_desc')}
        </Text>
      </View>
    ),
    [colors, styles, useNftDetection, theme, toggleNftAutodetect],
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
    <View style={styles.setting} testID={IPFS_GATEWAY_SECTION}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
          {strings('app_settings.ipfs_gateway')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={isIpfsGatewayEnabled}
            onValueChange={setIsIpfsGatewayEnabled}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.ipfs_gateway_content')}
      </Text>
      {isIpfsGatewayEnabled && (
        <View style={styles.accessory}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.desc}
          >
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
        </View>
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

  const renderShowIncomingTransactions = () => {
    const renderMainnet = () => {
      const { name: mainnetName, chainId } = Networks.mainnet;
      return (
        <Cell
          variant={CellVariant.Display}
          title={mainnetName}
          avatarProps={{
            variant: AvatarVariant.Network,
            name: mainnetName,
            imageSource: images.ETHEREUM,
          }}
          secondaryText="etherscan.io"
          style={styles.cellBorder}
        >
          <Switch
            value={showIncomingTransactionsNetworks[chainId]}
            onValueChange={(value) =>
              toggleEnableIncomingTransactions(chainId, value)
            }
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
          />
        </Cell>
      );
    };

    const renderLineaMainnet = () => {
      const { name: lineaMainnetName, chainId } = Networks['linea-mainnet'];

      return (
        <Cell
          variant={CellVariant.Display}
          title={lineaMainnetName}
          avatarProps={{
            variant: AvatarVariant.Network,
            name: lineaMainnetName,
            imageSource: images['LINEA-MAINNET'],
          }}
          secondaryText="lineascan.build"
          style={styles.cellBorder}
        >
          <Switch
            value={showIncomingTransactionsNetworks[chainId]}
            onValueChange={(value) =>
              toggleEnableIncomingTransactions(chainId, value)
            }
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
          />
        </Cell>
      );
    };

    const renderRpcNetworks = () =>
      Object.values(networkConfigurations).map(
        ({ nickname, rpcUrl, chainId }) => {
          if (!chainId) return null;

          if (!Object.keys(myNetworks).includes(chainId)) return null;

          const { name } = { name: nickname || rpcUrl };
          //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
          const image = getNetworkImageSource({ chainId: chainId?.toString() });

          return (
            <Cell
              key={chainId}
              variant={CellVariant.Display}
              title={name}
              secondaryText={myNetworks[chainId].domain}
              avatarProps={{
                variant: AvatarVariant.Network,
                name,
                imageSource: image,
              }}
              style={styles.cellBorder}
            >
              <Switch
                value={showIncomingTransactionsNetworks[chainId]}
                onValueChange={(value) =>
                  toggleEnableIncomingTransactions(chainId, value)
                }
                trackColor={{
                  true: colors.primary.default,
                  false: colors.border.muted,
                }}
                thumbColor={theme.brandColors.white}
                style={styles.switch}
                ios_backgroundColor={colors.border.muted}
              />
            </Cell>
          );
        },
      );

    const renderOtherNetworks = () => {
      const NetworksTyped = Networks as NetworksI;
      const getOtherNetworks = () => getAllNetworks().slice(2);
      return getOtherNetworks().map((networkType) => {
        const { name, imageSource, chainId } = NetworksTyped[networkType];
        if (!chainId) return null;
        return (
          <Cell
            key={chainId}
            variant={CellVariant.Display}
            title={name}
            secondaryText={myNetworks[chainId]?.domain}
            avatarProps={{
              variant: AvatarVariant.Network,
              name,
              imageSource,
            }}
            style={styles.cellBorder}
          >
            <Switch
              value={showIncomingTransactionsNetworks[chainId]}
              onValueChange={(value) => {
                chainId && toggleEnableIncomingTransactions(chainId, value);
              }}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={theme.brandColors.white}
              style={styles.switch}
              ios_backgroundColor={colors.border.muted}
            />
          </Cell>
        );
      });
    };

    return (
      <View
        style={styles.setting}
        testID={SecurityPrivacyViewSelectorsIDs.INCOMING_TRANSACTIONS}
      >
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('app_settings.incoming_transactions_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.desc}
        >
          {strings('app_settings.incoming_transactions_content')}
        </Text>
        <View style={styles.transactionsContainer}>
          {renderMainnet()}
          {renderLineaMainnet()}
          {renderRpcNetworks()}
          {showTestNetworks && renderOtherNetworks()}
        </View>
      </View>
    );
  };

  const toggleProfileSyncing = async () => {
    if (isProfileSyncingEnabled) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.PROFILE_SYNCING,
      });
    } else {
      await enableProfileSyncing();
    }
  };

  const toggleBasicFunctionality = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  };

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
        <View style={styles.setting}>
          <RememberMeOptionSection />
        </View>
        <RevealPrivateKey />
        <BlockaidSettings />
        <Heading>{strings('app_settings.privacy_heading')}</Heading>
        <View>
          <Text
            variant={TextVariant.BodyLGMedium}
            color={TextColor.Alternative}
            style={{ ...styles.subHeading, ...styles.firstSetting }}
          >
            {strings('app_settings.general_heading')}
          </Text>
          <BasicFunctionalityComponent
            handleSwitchToggle={toggleBasicFunctionality}
          />
        </View>
        <ProfileSyncingComponent handleSwitchToggle={toggleProfileSyncing} />
        <Text
          variant={TextVariant.BodyLGMedium}
          color={TextColor.Alternative}
          style={{ ...styles.subHeading, ...styles.firstSetting }}
        >
          {strings('app_settings.privacy_browser_subheading')}
        </Text>
        {renderSDKSettings()}
        <ClearPrivacy />
        {renderClearBrowserHistorySection()}
        <ClearCookiesSection />

        <Text
          variant={TextVariant.BodyLGMedium}
          color={TextColor.Alternative}
          style={styles.subHeading}
        >
          {strings('app_settings.network_provider')}
        </Text>
        {renderUseSafeChainsListValidation()}
        <Text
          variant={TextVariant.BodyLGMedium}
          color={TextColor.Alternative}
          style={styles.subHeading}
        >
          {strings('app_settings.transactions_subheading')}
        </Text>
        {renderMultiAccountBalancesSection()}
        {renderShowIncomingTransactions()}
        {renderHistoryModal()}
        {renderUseTransactionSimulations()}
        <Text
          variant={TextVariant.BodyLGMedium}
          color={TextColor.Alternative}
          style={styles.subHeading}
        >
          {strings('app_settings.token_nft_ens_subheading')}
        </Text>
        {renderDisplayNftMedia()}
        {isMainnet && renderAutoDetectNft()}
        {renderIpfsGateway()}
        <Text
          variant={TextVariant.BodyLGMedium}
          color={TextColor.Alternative}
          style={styles.subHeading}
        >
          {strings('app_settings.security_check_subheading')}
        </Text>
        <View style={styles.halfSetting}>
          <AutomaticSecurityChecks />
        </View>
        <Text
          variant={TextVariant.BodyLGMedium}
          color={TextColor.Alternative}
          style={styles.subHeading}
        >
          {strings('app_settings.analytics_subheading')}
        </Text>
        <MetaMetricsAndDataCollectionSection />
        <DeleteMetaMetricsData metricsOptin={analyticsEnabled} />
        <DeleteWalletData />
        {renderHint()}
      </View>
      <SwitchLoadingModal
        loading={profileSyncLoading}
        loadingText={strings('app_settings.enabling_profile_sync')}
        error={profileSyncError}
      />
    </ScrollView>
  );
};

export default Settings;
