/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Switch,
  ScrollView,
  View,
  Keyboard,
  Linking,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CookieManager from '@react-native-cookies/cookies';
import StorageWrapper from '../../../../store/storage-wrapper';
import { useDispatch, useSelector } from 'react-redux';
import { MAINNET } from '../../../../constants/network';
import { clearHistory } from '../../../../actions/browser';
import { SIMULATION_DETALS_ARTICLE_URL } from '../../../../constants/urls';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { SEED_PHRASE_HINTS } from '../../../../constants/storage';
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
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  HeaderStandard,
  FontWeight,
  TextArea,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import OldButton, {
  ButtonVariants,
  ButtonSize as OldButtonSize,
} from '../../../../component-library/components/Buttons/Button';
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
import Device from '../../../../util/device';
import Logger from '../../../../util/Logger';
import SDKConnect from '../../../../core/SDKConnect/SDKConnect';
import { isSnapId } from '@metamask/snaps-utils';
import { ClearPrivacyModalSelectorsIDs } from './Sections/ClearPrivacy/ClearPrivacyModal.testIds';

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
  const [clearPrivacySheetVisible, setClearPrivacySheetVisible] =
    useState(false);
  const [clearCookiesSheetVisible, setClearCookiesSheetVisible] =
    useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const [hasCookies, setHasCookies] = useState(false);
  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );
  const clearBrowserHistorySheetRef = useRef<BottomSheetRef>(null);
  const clearPrivacySheetRef = useRef<BottomSheetRef>(null);
  const clearCookiesSheetRef = useRef<BottomSheetRef>(null);
  const hintSheetRef = useRef<BottomSheetRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const metaMetricsSectionRef = useRef<View>(null);
  const dataCollectionSectionRef = useRef<View>(null);
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
    const run = async () => {
      if (Device.isAndroid()) {
        setHasCookies(true);
        return;
      }

      if (Device.isIos()) {
        const useWebKit = true;
        const cookies = await CookieManager.getAll(useWebKit);
        setHasCookies(Object.keys(cookies).length > 0);
      }
    };

    run();
  }, []);

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

  const scrollToSection = useCallback(() => {
    const scrollHost = scrollViewRef.current?.getNativeScrollRef();
    if (!scrollHost) return;

    const sectionRef =
      params?.scrollToSection === 'data-collection'
        ? dataCollectionSectionRef
        : metaMetricsSectionRef;

    sectionRef.current?.measureLayout(
      scrollHost,
      (_, y) => {
        scrollViewRef.current?.scrollTo({
          y,
          animated: true,
        });
      },
      () => null,
    );
  }, [params?.scrollToSection]);

  useFocusEffect(
    useCallback(() => {
      if (!params?.scrollToSection) return;

      const task = InteractionManager.runAfterInteractions(scrollToSection);
      return () => task.cancel();
    }, [scrollToSection, params?.scrollToSection]),
  );

  const openHintSheet = () => setShowHint(true);

  const requestCloseHintSheet = useCallback(() => {
    Keyboard.dismiss();
    hintSheetRef.current?.onCloseBottomSheet();
  }, []);

  const saveHint = async () => {
    if (!hintText) return;
    Keyboard.dismiss();
    hintSheetRef.current?.onCloseBottomSheet(() => {
      (async () => {
        const currentSeedphraseHints =
          await StorageWrapper.getItem(SEED_PHRASE_HINTS);
        if (currentSeedphraseHints) {
          const parsedHints = JSON.parse(currentSeedphraseHints);
          await StorageWrapper.setItem(
            SEED_PHRASE_HINTS,
            JSON.stringify({ ...parsedHints, manualBackup: hintText }),
          );
        }
      })().catch((error) => {
        Logger.error(error as Error, 'SecuritySettings: Failed to save hint');
      });
    });
  };

  const openClearBrowserHistorySheet = () => setBrowserHistoryModalVisible(true);

  const closeClearBrowserHistorySheet = () =>
    setBrowserHistoryModalVisible(false);

  const requestCloseClearBrowserHistorySheet = useCallback(() => {
    clearBrowserHistorySheetRef.current?.onCloseBottomSheet();
  }, []);

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

  const clearBrowserHistory = useCallback(() => {
    dispatch(clearHistory(isEnabled(), isDataCollectionForMarketingEnabled));
  }, [dispatch, isDataCollectionForMarketingEnabled, isEnabled]);

  const renderClearBrowserHistorySheet = () => {
    if (!browserHistoryModalVisible) {
      return null;
    }

    return (
      <BottomSheet
        ref={clearBrowserHistorySheetRef}
        isInteractable
        onClose={closeClearBrowserHistorySheet}
      >
        <BottomSheetHeader onClose={requestCloseClearBrowserHistorySheet}>
          {strings('app_settings.clear_browser_history_modal_title')}
        </BottomSheetHeader>
        <Box twClassName="px-4 pt-2 pb-6">
          <Text variant={TextVariant.BodyMd} twClassName="text-center">
            {strings('app_settings.clear_browser_history_modal_message')}
          </Text>
        </Box>
        <BottomSheetFooter
          secondaryButtonProps={{
            children: strings('app_settings.reset_account_cancel_button'),
            onPress: requestCloseClearBrowserHistorySheet,
          }}
          primaryButtonProps={{
            children: strings('app_settings.clear'),
            isDanger: true,
            onPress: () =>
              clearBrowserHistorySheetRef.current?.onCloseBottomSheet(() => {
                clearBrowserHistory();
              }),
          }}
        />
      </BottomSheet>
    );
  };

  const openClearPrivacySheet = () => setClearPrivacySheetVisible(true);
  const closeClearPrivacySheet = () => setClearPrivacySheetVisible(false);
  const requestCloseClearPrivacySheet = useCallback(() => {
    clearPrivacySheetRef.current?.onCloseBottomSheet();
  }, []);

  const clearApprovals = useCallback(() => {
    const { PermissionController } = Engine.context;
    PermissionController.getSubjectNames()
      .filter((subject) => !isSnapId(subject))
      .forEach((subject) => PermissionController.revokeAllPermissions(subject));
    SDKConnect.getInstance().removeAll();
  }, []);

  const renderClearPrivacySheet = () => {
    if (!clearPrivacySheetVisible) {
      return null;
    }

    return (
      <BottomSheet
        ref={clearPrivacySheetRef}
        isInteractable
        onClose={closeClearPrivacySheet}
      >
        <BottomSheetHeader onClose={requestCloseClearPrivacySheet}>
          {strings('app_settings.clear_approvals_modal_title')}
        </BottomSheetHeader>
        <Box
          twClassName="px-4 pt-2 pb-6"
          testID={ClearPrivacyModalSelectorsIDs.CONTAINER}
        >
          <Text variant={TextVariant.BodyMd} twClassName="text-center">
            {strings('app_settings.clear_approvals_modal_message')}
          </Text>
        </Box>
        <BottomSheetFooter
          secondaryButtonProps={{
            children: strings('app_settings.reset_account_cancel_button'),
            onPress: requestCloseClearPrivacySheet,
          }}
          primaryButtonProps={{
            children: strings('app_settings.clear'),
            isDanger: true,
            onPress: () =>
              clearPrivacySheetRef.current?.onCloseBottomSheet(() => {
                clearApprovals();
              }),
          }}
        />
      </BottomSheet>
    );
  };

  const openClearCookiesSheet = () => setClearCookiesSheetVisible(true);
  const closeClearCookiesSheet = () => setClearCookiesSheetVisible(false);
  const requestCloseClearCookiesSheet = useCallback(() => {
    clearCookiesSheetRef.current?.onCloseBottomSheet();
  }, []);

  const clearCookies = useCallback(async () => {
    const useWebKit = true;
    await CookieManager.clearAll(useWebKit);
    Logger.log('Browser cookies cleared');

    if (Device.isIos()) {
      const cookies = await CookieManager.getAll(useWebKit);
      setHasCookies(Object.keys(cookies).length > 0);
    }
  }, []);

  const renderClearCookiesSheet = () => {
    if (!clearCookiesSheetVisible) {
      return null;
    }

    return (
      <BottomSheet
        ref={clearCookiesSheetRef}
        isInteractable
        onClose={closeClearCookiesSheet}
      >
        <BottomSheetHeader onClose={requestCloseClearCookiesSheet}>
          {strings('app_settings.clear_cookies_modal_title')}
        </BottomSheetHeader>
        <Box twClassName="px-4 pt-2 pb-6">
          <Text variant={TextVariant.BodyMd} twClassName="text-center">
            {strings('app_settings.clear_cookies_modal_message')}
          </Text>
        </Box>
        <BottomSheetFooter
          secondaryButtonProps={{
            children: strings('app_settings.reset_account_cancel_button'),
            onPress: requestCloseClearCookiesSheet,
          }}
          primaryButtonProps={{
            children: strings('app_settings.clear'),
            isDanger: true,
            onPress: () =>
              clearCookiesSheetRef.current?.onCloseBottomSheet(() => {
                clearCookies().catch((error) => {
                  Logger.error(
                    error as Error,
                    'SecuritySettings: Failed to clear cookies',
                  );
                });
              }),
          }}
        />
      </BottomSheet>
    );
  };

  const toggleUseTransactionSimulations = (value: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setUseTransactionSimulations(value);
  };

  const renderUseTransactionSimulations = useCallback(
    () => (
      <View style={styles.halfSetting}>
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

  const renderHintSheet = () => {
    if (!showHint) {
      return null;
    }

    return (
      <BottomSheet
        ref={hintSheetRef}
        isInteractable
        onClose={() => setShowHint(false)}
      >
        <BottomSheetHeader onClose={requestCloseHintSheet}>
          {strings('manual_backup_step_3.recovery_hint')}
        </BottomSheetHeader>
        <Box twClassName="px-4 pt-2 pb-6">
          <Text variant={TextVariant.BodyMd} twClassName="mb-4">
            {strings('manual_backup_step_3.leave_hint')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            twClassName="mb-4"
          >
            {strings('manual_backup_step_3.no_seedphrase')}
          </Text>
          <TextArea
            value={hintText}
            placeholder={strings('manual_backup_step_3.example')}
            onChangeText={handleChangeText}
            textAlignVertical="top"
          />
        </Box>
        <BottomSheetFooter
          secondaryButtonProps={{
            children: strings('action_view.cancel'),
            onPress: requestCloseHintSheet,
          }}
          primaryButtonProps={{
            children: strings('manual_backup_step_3.save'),
            onPress: saveHint,
          }}
        />
      </BottomSheet>
    );
  };

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
          <View style={[styles.setting, styles.firstSetting]}>
            <Text variant={TextVariant.HeadingMd} style={styles.heading}>
              {strings('app_settings.security_heading')}
            </Text>
          </View>
          <ProtectYourWallet
            srpBackedup={seedphraseBackedUp}
            hintText={hintText}
            toggleHint={openHintSheet}
          />
          <ChangePassword />
          <AutoLock />
          <DeviceSecurityToggle />
          <BlockaidSettings />
          <Text variant={TextVariant.HeadingMd} style={styles.subHeading}>
            {strings('app_settings.privacy_heading')}
          </Text>
          <View style={styles.halfSetting}>
            <BasicFunctionalityComponent
              flushTop
              handleSwitchToggle={toggleBasicFunctionality}
            />
          </View>
          <ClearPrivacy onPressClearPrivacy={openClearPrivacySheet} />
          {renderClearBrowserHistorySection()}
          <ClearCookiesSection
            hasCookies={hasCookies}
            onPressClearCookies={openClearCookiesSheet}
          />
          <Text variant={TextVariant.HeadingMd} style={styles.subHeading}>
            {strings('app_settings.network_provider')}
          </Text>
          <NetworkDetailsCheckSettings />
          <Text variant={TextVariant.HeadingMd} style={styles.subHeading}>
            {strings('app_settings.transactions_subheading')}
          </Text>
          <BatchAccountBalanceSettings />
          {renderUseTransactionSimulations()}
          <Text variant={TextVariant.HeadingMd} style={styles.subHeading}>
            {strings('app_settings.token_nft_ens_subheading')}
          </Text>
          <DisplayNFTMediaSettings />
          {isMainnet && <AutoDetectNFTSettings />}
          <IPFSGatewaySettings />
          <Text variant={TextVariant.HeadingMd} style={styles.subHeading}>
            {strings('app_settings.analytics_subheading')}
          </Text>
          <MetaMetricsAndDataCollectionSection
            metaMetricsRef={metaMetricsSectionRef}
            dataCollectionRef={dataCollectionSectionRef}
          />
          <DeleteMetaMetricsData metricsOptin={analyticsEnabled} />
          <DeleteWalletData />
          <TopTradersSection />
        </View>
      </ScrollView>
      {renderClearBrowserHistorySheet()}
      {renderClearPrivacySheet()}
      {renderClearCookiesSheet()}
      {renderHintSheet()}
      <SwitchLoadingModal
        loading={modalLoading}
        loadingText=""
        error={modalError}
      />
    </SafeAreaView>
  );
};

export default Settings;
