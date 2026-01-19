/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Switch, ScrollView, View, Keyboard, Linking } from 'react-native';
import StorageWrapper from '../../../../store/storage-wrapper';
import { useDispatch, useSelector } from 'react-redux';
import { MAINNET } from '../../../../constants/network';
import ActionModal from '../../../UI/ActionModal';
import { clearHistory } from '../../../../actions/browser';
import HeaderCenter from '../../../../component-library/components-temp/HeaderCenter';
import { SIMULATION_DETALS_ARTICLE_URL } from '../../../../constants/urls';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { SEED_PHRASE_HINTS } from '../../../../constants/storage';
import HintModal from '../../../UI/HintModal';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { useTheme } from '../../../../util/theme';
import {
  ClearCookiesSection,
  DeleteMetaMetricsData,
  DeleteWalletData,
  RememberMeOptionSection,
  ProtectYourWallet,
  LoginOptionsSettings,
  ChangePassword,
  AutoLock,
  ClearPrivacy,
  BlockaidSettings,
} from './Sections';
import { selectProviderType } from '../../../../selectors/networkController';
import { selectUseTransactionSimulations } from '../../../../selectors/preferencesController';
import { SECURITY_PRIVACY_VIEW_ID } from '../../../../../wdio/screen-objects/testIDs/Screens/SecurityPrivacy.testIds';
import createStyles from './SecuritySettings.styles';
import { HeadingProps, SecuritySettingsParams } from './SecuritySettings.types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useParams } from '../../../../util/navigation/navUtils';
import {
  CLEAR_BROWSER_HISTORY_SECTION,
  SDK_SECTION,
} from './SecuritySettings.constants';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import BasicFunctionalityComponent from '../../../UI/BasicFunctionality/BasicFunctionality';
import Routes from '../../../../constants/navigation/Routes';
import MetaMetricsAndDataCollectionSection from './Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection';
import { selectIsMetamaskNotificationsEnabled } from '../../../../selectors/notifications';
import SwitchLoadingModal from '../../../../components/UI/Notification/SwitchLoadingModal';
import { RootState } from '../../../../reducers';
import { useDisableNotifications } from '../../../../util/notifications/hooks/useNotifications';
import NetworkDetailsCheckSettings from '../../Settings/NetworkDetailsCheckSettings';
import DisplayNFTMediaSettings from '../../Settings/DisplayNFTMediaSettings';
import AutoDetectNFTSettings from '../../Settings/AutoDetectNFTSettings';
import IPFSGatewaySettings from '../../Settings/IPFSGatewaySettings';
import BatchAccountBalanceSettings from '../../Settings/BatchAccountBalanceSettings';
import useCheckNftAutoDetectionModal from '../../../hooks/useCheckNftAutoDetectionModal';
import useCheckMultiRpcModal from '../../../hooks/useCheckMultiRpcModal';

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
  const { trackEvent, isEnabled, createEventBuilder } = useMetrics();
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const params = useParams<SecuritySettingsParams>();
  const dispatch = useDispatch();
  const [browserHistoryModalVisible, setBrowserHistoryModalVisible] =
    useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );

  const scrollViewRef = useRef<ScrollView>(null);
  const detectNftComponentRef = useRef<View>(null);
  const {
    disableNotifications,
    loading: disableNotificationsLoading,
    error: disableNotificationsError,
  } = useDisableNotifications();

  const browserHistory = useSelector(
    (state: RootState) => state.browser.history,
  );

  const useTransactionSimulations = useSelector(
    selectUseTransactionSimulations,
  );

  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const seedphraseBackedUp = useSelector(
    (state: RootState) => state.user.seedphraseBackedUp,
  );

  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );

  /**
   * Shows Nft auto detect modal if the user is on mainnet, never saw the modal and have nft detection off
   */
  useCheckNftAutoDetectionModal();

  /**
   * Show multi rpc modal if there are networks duplicated and if never showed before
   */
  useCheckMultiRpcModal();

  const type = useSelector(selectProviderType);

  const isMainnet = type === MAINNET;

  const updateNavBar = useCallback(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleHintText = useCallback(async () => {
    const currentSeedphraseHints =
      await StorageWrapper.getItem(SEED_PHRASE_HINTS);
    const parsedHints =
      currentSeedphraseHints && JSON.parse(currentSeedphraseHints);
    const manualBackup = parsedHints?.manualBackup;

    setHintText(manualBackup);
  }, []);

  useEffect(() => {
    updateNavBar();
    handleHintText();
    setAnalyticsEnabled(isEnabled());
  }, [handleHintText, updateNavBar, setAnalyticsEnabled, isEnabled]);

  useEffect(() => {
    const triggerCascadeBasicFunctionalityDisable = async () => {
      if (!isBasicFunctionalityEnabled) {
        isNotificationEnabled && (await disableNotifications());
      }
    };
    triggerCascadeBasicFunctionalityDisable();
  }, [
    disableNotifications,
    isBasicFunctionalityEnabled,
    isNotificationEnabled,
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

  const toggleHint = () => {
    setShowHint(!showHint);
  };

  const saveHint = async () => {
    if (!hintText) return;
    toggleHint();
    const currentSeedphraseHints =
      await StorageWrapper.getItem(SEED_PHRASE_HINTS);
    if (currentSeedphraseHints) {
      const parsedHints = JSON.parse(currentSeedphraseHints);
      await StorageWrapper.setItem(
        SEED_PHRASE_HINTS,
        JSON.stringify({ ...parsedHints, manualBackup: hintText }),
      );
    }
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

  const clearBrowserHistory = () => {
    dispatch(clearHistory(isEnabled(), isDataCollectionForMarketingEnabled));
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
      childrenContainerStyle={styles.modalChildrenContainer}
    >
      <View style={styles.modalContentWrapper}>
        <HeaderCenter
          title={strings('app_settings.clear_browser_history_modal_title')}
          onClose={toggleClearBrowserHistoryModal}
        />
        <View style={styles.modalView}>
          <Text style={styles.modalText}>
            {strings('app_settings.clear_browser_history_modal_message')}
          </Text>
        </View>
      </View>
    </ActionModal>
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
              trackEvent(
                createEventBuilder(MetaMetricsEvents.EXTERNAL_LINK_CLICKED)
                  .addProperties({
                    location: 'app_settings',
                    text: strings('app_settings.simulation_details_learn_more'),
                    url_domain: SIMULATION_DETALS_ARTICLE_URL,
                  })
                  .build(),
              );
            }}
            label={strings('app_settings.simulation_details_learn_more')}
          />
        </Text>
      </View>
    ),
    [
      colors,
      styles,
      useTransactionSimulations,
      theme.brandColors.white,
      createEventBuilder,
      trackEvent,
    ],
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

  const toggleBasicFunctionality = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  };

  const modalLoading = disableNotificationsLoading;
  const modalError = disableNotificationsError;

  return (
    <>
      <HeaderCenter
        title={strings('app_settings.security_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
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
        <LoginOptionsSettings />
        <View style={styles.setting}>
          <RememberMeOptionSection />
        </View>
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
        <NetworkDetailsCheckSettings />
        <Text
          variant={TextVariant.BodyLGMedium}
          color={TextColor.Alternative}
          style={styles.subHeading}
        >
          {strings('app_settings.transactions_subheading')}
        </Text>
        <BatchAccountBalanceSettings />
        {renderHistoryModal()}
        {renderUseTransactionSimulations()}
        <Text
          variant={TextVariant.BodyLGMedium}
          color={TextColor.Alternative}
          style={styles.subHeading}
        >
          {strings('app_settings.token_nft_ens_subheading')}
        </Text>
        <DisplayNFTMediaSettings />
        {isMainnet && (
          <View ref={detectNftComponentRef}>
            <AutoDetectNFTSettings />
          </View>
        )}
        <IPFSGatewaySettings />
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
        loading={modalLoading}
        loadingText=""
        error={modalError}
      />
      </ScrollView>
    </>
  );
};

export default Settings;
