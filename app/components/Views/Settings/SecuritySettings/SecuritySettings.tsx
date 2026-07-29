/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Switch,
  ScrollView,
  View,
  Keyboard,
  Linking,
  TouchableOpacity,
} from 'react-native';
import IconCheck from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import StorageWrapper from '../../../../store/storage-wrapper';
import { useDispatch, useSelector } from 'react-redux';
import { MAINNET } from '../../../../constants/network';
import { clearHistory } from '../../../../actions/browser';
import { setLockTime } from '../../../../actions/settings';
import { SIMULATION_DETALS_ARTICLE_URL } from '../../../../constants/urls';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { SEED_PHRASE_HINTS } from '../../../../constants/storage';
import HintModal from '../../../UI/HintModal';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { trackExternalLinkClicked } from '../../../../util/analytics/externalLinkTracking';
import {
  ClearCookiesSection,
  DeleteMetaMetricsData,
  DeleteWalletData,
  ProtectYourWallet,
  DeviceSecurityToggle,
  ChangePassword,
  AutoLock,
  ClearPrivacy,
  BlockaidSettings,
} from './Sections';
import { selectProviderType } from '../../../../selectors/networkController';
import { selectUseTransactionSimulations } from '../../../../selectors/preferencesController';
import { SecurityPrivacyViewSelectorsIDs } from './SecurityPrivacyView.testIds';
import createStyles from './SecuritySettings.styles';
import { SecuritySettingsParams } from './SecuritySettings.types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useParams } from '../../../../util/navigation/navUtils';
import { CLEAR_BROWSER_HISTORY_SECTION } from './SecuritySettings.constants';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  BottomSheet,
  BottomSheetHeader,
  Box,
  HeaderStandard,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import OldButton, {
  ButtonVariants,
  ButtonSize as OldButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import LegacyBottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { TextVariant as LibraryTextVariant } from '../../../../component-library/components/Texts/Text';
import BasicFunctionalityComponent from '../../../UI/BasicFunctionality/BasicFunctionality';
import Routes from '../../../../constants/navigation/Routes';
import MetaMetricsAndDataCollectionSection from './Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection';
import TopTradersSection from './Sections/TopTradersSection';
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
import { useStyles } from '../../../../component-library/hooks/useStyles';
import AUTO_LOCK_OPTIONS from './Sections/AutoLock/constants';

interface ConfirmSheetConfig {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void | Promise<void>;
  testID?: string;
}

interface OptionSheetConfig {
  title: string;
  options: { key: string | number; label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

const Settings: React.FC = () => {
  const { trackEvent, isEnabled, createEventBuilder } = useAnalytics();
  const {
    styles,
    theme: { colors, brandColors },
  } = useStyles(createStyles, {});
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<SecuritySettingsParams>();
  const dispatch = useDispatch();
  const [browserHistoryModalVisible, setBrowserHistoryModalVisible] =
    useState(false);
  const [autoLockSheetVisible, setAutoLockSheetVisible] = useState(false);
  const [confirmSheetConfig, setConfirmSheetConfig] =
    useState<ConfirmSheetConfig | null>(null);
  const [optionSheetConfig, setOptionSheetConfig] =
    useState<OptionSheetConfig | null>(null);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const detectNftComponentRef = useRef<View>(null);
  const clearBrowserHistorySheetRef = useRef<{
    onOpenBottomSheet: () => void;
    onCloseBottomSheet: (callback?: () => void) => void;
  }>(null);
  const autoLockSheetRef = useRef<{
    onOpenBottomSheet: () => void;
    onCloseBottomSheet: (callback?: () => void) => void;
  }>(null);
  const confirmSheetRef = useRef<{
    onOpenBottomSheet: () => void;
    onCloseBottomSheet: (callback?: () => void) => void;
  }>(null);
  const optionSheetRef = useRef<{
    onOpenBottomSheet: () => void;
    onCloseBottomSheet: (callback?: () => void) => void;
  }>(null);
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
  const lockTime = useSelector((state: RootState) => state.settings.lockTime);

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

  const handleHintText = useCallback(async () => {
    const currentSeedphraseHints =
      await StorageWrapper.getItem(SEED_PHRASE_HINTS);
    const parsedHints =
      currentSeedphraseHints && JSON.parse(currentSeedphraseHints);
    const manualBackup = parsedHints?.manualBackup;

    setHintText(manualBackup);
  }, []);

  useEffect(() => {
    handleHintText();
    setAnalyticsEnabled(isEnabled());
  }, [handleHintText, setAnalyticsEnabled, isEnabled]);

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

  const openClearBrowserHistorySheet = () => {
    setBrowserHistoryModalVisible(true);
    requestAnimationFrame(() => {
      clearBrowserHistorySheetRef.current?.onOpenBottomSheet();
    });
  };

  const closeClearBrowserHistorySheet = () => {
    clearBrowserHistorySheetRef.current?.onCloseBottomSheet(() => {
      setBrowserHistoryModalVisible(false);
    });
  };

  const openAutoLockSheet = () => {
    setAutoLockSheetVisible(true);
    requestAnimationFrame(() => {
      autoLockSheetRef.current?.onOpenBottomSheet();
    });
  };

  const closeAutoLockSheet = () => {
    autoLockSheetRef.current?.onCloseBottomSheet(() => {
      setAutoLockSheetVisible(false);
    });
  };

  const openConfirmSheet = (config: ConfirmSheetConfig) => {
    setConfirmSheetConfig(config);
    requestAnimationFrame(() => {
      confirmSheetRef.current?.onOpenBottomSheet();
    });
  };

  const closeConfirmSheet = () => {
    confirmSheetRef.current?.onCloseBottomSheet(() => {
      setConfirmSheetConfig(null);
    });
  };

  const onConfirmSheetConfirm = async () => {
    await confirmSheetConfig?.onConfirm();
    closeConfirmSheet();
  };

  const openOptionSheet = (config: OptionSheetConfig) => {
    setOptionSheetConfig(config);
    requestAnimationFrame(() => {
      optionSheetRef.current?.onOpenBottomSheet();
    });
  };

  const closeOptionSheet = () => {
    optionSheetRef.current?.onCloseBottomSheet(() => {
      setOptionSheetConfig(null);
    });
  };

  const selectOptionSheetValue = (value: string) => {
    optionSheetConfig?.onSelect(value);
    closeOptionSheet();
  };

  const renderOptionSheet = () =>
    optionSheetConfig ? (
      <LegacyBottomSheet
        ref={optionSheetRef}
        shouldNavigateBack={false}
        onClose={() => setOptionSheetConfig(null)}
      >
        <BottomSheetHeader onClose={closeOptionSheet}>
          {optionSheetConfig.title}
        </BottomSheetHeader>
        <ScrollView
          style={styles.sheetOptionsContent}
          contentContainerStyle={styles.sheetOptionsList}
        >
          {optionSheetConfig.options.map((option) => {
            const isSelected = option.value === optionSheetConfig.selectedValue;
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => selectOptionSheetValue(option.value)}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                ]}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  style={styles.optionLabel}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
                {isSelected ? (
                  <IconCheck
                    style={styles.optionIcon}
                    name="check"
                    size={24}
                    color={brandColors.white}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LegacyBottomSheet>
    ) : null;

  const renderConfirmSheet = () =>
    confirmSheetConfig ? (
      <LegacyBottomSheet
        ref={confirmSheetRef}
        shouldNavigateBack={false}
        onClose={() => setConfirmSheetConfig(null)}
      >
        <View
          style={styles.destructiveSheetContent}
          testID={confirmSheetConfig.testID}
        >
          <Icon
            style={styles.destructiveSheetIcon}
            size={IconSize.Xl}
            color={IconColor.ErrorDefault}
            name={IconName.Danger}
          />
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            style={styles.destructiveSheetTitle}
          >
            {confirmSheetConfig.title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            style={styles.destructiveSheetText}
          >
            {confirmSheetConfig.message}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDanger
            onPress={onConfirmSheetConfirm}
          >
            {confirmSheetConfig.confirmText}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={closeConfirmSheet}
          >
            {confirmSheetConfig.cancelText}
          </Button>
        </View>
      </LegacyBottomSheet>
    ) : null;

  const selectLockTime = (time: string): void => {
    dispatch(setLockTime(parseInt(time, 10)));
    closeAutoLockSheet();
  };

  const renderAutoLockSheet = () =>
    autoLockSheetVisible ? (
      <LegacyBottomSheet
        ref={autoLockSheetRef}
        shouldNavigateBack={false}
        onClose={() => setAutoLockSheetVisible(false)}
      >
        <BottomSheetHeader onClose={closeAutoLockSheet}>
          {strings('app_settings.auto_lock')}
        </BottomSheetHeader>
        <ScrollView
          style={styles.sheetOptionsContent}
          contentContainerStyle={styles.sheetOptionsList}
        >
          {AUTO_LOCK_OPTIONS.map((option) => {
            const isSelected = option.value === lockTime.toString();
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => selectLockTime(option.value)}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                ]}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  style={styles.optionLabel}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
                {isSelected ? (
                  <IconCheck
                    style={styles.optionIcon}
                    name="check"
                    size={24}
                    color={brandColors.white}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LegacyBottomSheet>
    ) : null;

  const renderClearBrowserHistorySection = () => (
    <View style={styles.setting} testID={CLEAR_BROWSER_HISTORY_SECTION}>
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('app_settings.clear_browser_history_desc')}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        style={styles.desc}
      >
        {strings('app_settings.clear_history_desc')}
      </Text>
      <View style={styles.accessory}>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={openClearBrowserHistorySheet}
          isDisabled={browserHistory.length === 0}
        >
          {strings('app_settings.clear_browser_history_desc')}
        </Button>
      </View>
    </View>
  );

  const clearBrowserHistory = () => {
    dispatch(clearHistory(isEnabled(), isDataCollectionForMarketingEnabled));
    closeClearBrowserHistorySheet();
  };

  const renderHistoryModal = () =>
    browserHistoryModalVisible ? (
      <LegacyBottomSheet
        ref={clearBrowserHistorySheetRef}
        shouldNavigateBack={false}
        onClose={() => setBrowserHistoryModalVisible(false)}
      >
        <View style={styles.destructiveSheetContent}>
          <Icon
            style={styles.destructiveSheetIcon}
            size={IconSize.Xl}
            color={IconColor.ErrorDefault}
            name={IconName.Danger}
          />
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            style={styles.destructiveSheetTitle}
          >
            {strings('app_settings.clear_browser_history_modal_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            style={styles.destructiveSheetText}
          >
            {strings('app_settings.clear_browser_history_modal_message')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDanger
            onPress={clearBrowserHistory}
          >
            {strings('app_settings.clear')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={closeClearBrowserHistorySheet}
          >
            {strings('app_settings.reset_account_cancel_button')}
          </Button>
        </View>
      </LegacyBottomSheet>
    ) : null;

  const toggleUseTransactionSimulations = (value: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setUseTransactionSimulations(value);
  };

  const renderUseTransactionSimulations = useCallback(
    () => (
      <View style={styles.transactionRow}>
        <View style={styles.transactionContent}>
          <View style={styles.titleContainer}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              style={styles.title}
            >
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
                thumbColor={brandColors.white}
                style={styles.switch}
                ios_backgroundColor={colors.border.muted}
              />
            </View>
          </View>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            style={styles.desc}
          >
            {strings('app_settings.simulation_details_description')}
            <OldButton
              variant={ButtonVariants.Link}
              size={OldButtonSize.Auto}
              labelTextVariant={LibraryTextVariant.BodySMMedium}
              onPress={() => {
                Linking.openURL(SIMULATION_DETALS_ARTICLE_URL);
                trackExternalLinkClicked(trackEvent, createEventBuilder, {
                  location: 'app_settings',
                  text: strings('app_settings.simulation_details_learn_more'),
                  url_domain: SIMULATION_DETALS_ARTICLE_URL,
                });
              }}
              label={strings('app_settings.simulation_details_learn_more')}
            />
          </Text>
        </View>
      </View>
    ),
    [
      colors,
      styles,
      useTransactionSimulations,
      brandColors.white,
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
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderStandard
        testID="header"
        title={strings('app_settings.security_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID={SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL}
        ref={scrollViewRef}
      >
        <View style={styles.inner}>
          <ProtectYourWallet
            srpBackedup={seedphraseBackedUp}
            hintText={hintText}
            toggleHint={toggleHint}
          />
          <Box style={styles.groupDivider} />
          <ChangePassword />
          <Box style={styles.groupDivider} />
          <AutoLock onOpenSheet={openAutoLockSheet} />
          <Box style={styles.groupDivider} />
          <DeviceSecurityToggle />
          <Box style={styles.groupDivider} />
          <View style={styles.setting}>
            <BlockaidSettings />
          </View>

          <SectionDivider
            borderWidth={0}
            marginVertical={4}
            style={styles.sectionBreak}
          />
          <View style={styles.halfSetting}>
            <BasicFunctionalityComponent
              flushTop
              handleSwitchToggle={toggleBasicFunctionality}
            />
          </View>
          <Box style={styles.groupDivider} />
          <ClearPrivacy openConfirmSheet={openConfirmSheet} />
          <Box style={styles.groupDivider} />
          {renderClearBrowserHistorySection()}
          <Box style={styles.groupDivider} />
          <ClearCookiesSection openConfirmSheet={openConfirmSheet} />

          <SectionDivider
            borderWidth={0}
            marginVertical={4}
            style={styles.sectionBreak}
          />
          <NetworkDetailsCheckSettings />

          <SectionDivider
            borderWidth={0}
            marginVertical={4}
            style={styles.sectionBreak}
          />
          <View style={styles.transactionHeaderBreak} />
          <View style={[styles.transactionRow, styles.transactionFirstRow]}>
            <View style={styles.transactionContent}>
              <BatchAccountBalanceSettings />
            </View>
          </View>
          <Box style={styles.groupDivider} />
          {renderUseTransactionSimulations()}

          <SectionDivider
            borderWidth={0}
            marginVertical={4}
            style={styles.sectionBreak}
          />
          <DisplayNFTMediaSettings />
          {isMainnet && (
            <>
              <Box style={styles.groupDivider} />
              <View ref={detectNftComponentRef}>
                <AutoDetectNFTSettings />
              </View>
            </>
          )}
          <Box style={styles.groupDivider} />
          <IPFSGatewaySettings openOptionSheet={openOptionSheet} />

          <SectionDivider
            borderWidth={0}
            marginVertical={4}
            style={styles.sectionBreak}
          />
          <MetaMetricsAndDataCollectionSection />
          <Box style={styles.groupDivider} />
          <DeleteMetaMetricsData
            metricsOptin={analyticsEnabled}
            openConfirmSheet={openConfirmSheet}
          />
          <SectionDivider
            borderWidth={0}
            marginVertical={4}
            style={styles.sectionBreak}
          />
          <DeleteWalletData />
          <TopTradersSection />
          {renderHint()}
        </View>
      </ScrollView>
      {renderHistoryModal()}
      {renderAutoLockSheet()}
      {renderOptionSheet()}
      {renderConfirmSheet()}
      <SwitchLoadingModal
        loading={modalLoading}
        loadingText=""
        error={modalError}
      />
    </SafeAreaView>
  );
};

export default Settings;
