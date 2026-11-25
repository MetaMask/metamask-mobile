import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View, Keyboard, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { MAINNET } from '../../../constants/network';
import ActionModal from '../../UI/ActionModal';
import { clearHistory } from '../../../actions/browser';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import {
  ClearCookiesSection,
  DeleteMetaMetricsData,
  DeleteWalletData,
  ClearPrivacy,
  SupportConsentPreferenceSection,
  DeleteIdentityData,
} from './SecuritySettings/Sections';
import { selectProviderType } from '../../../selectors/networkController';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useParams } from '../../../util/navigation/navUtils';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  Box,
} from '@metamask/design-system-react-native';
import BasicFunctionalityComponent from '../../UI/BasicFunctionality/BasicFunctionality';
import Routes from '../../../constants/navigation/Routes';
import MetaMetricsAndDataCollectionSection from './SecuritySettings/Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection';
import TopTradersSection from './SecuritySettings/Sections/TopTradersSection';
import { RootState } from '../../../reducers';
import { selectIsMetamaskNotificationsEnabled } from '../../../selectors/notifications';
import SwitchLoadingModal from '../../UI/Notification/SwitchLoadingModal';
import { useDisableNotifications } from '../../../util/notifications/hooks/useNotifications';
import NetworkDetailsCheckSettings from './NetworkDetailsCheckSettings';
import DisplayNFTMediaSettings from './DisplayNFTMediaSettings';
import AutoDetectNFTSettings from './AutoDetectNFTSettings';
import IPFSGatewaySettings from './IPFSGatewaySettings';
import {
  selectIsBasicFunctionalityConsolidationEnabled,
  selectIsSocialLoginBasicFunctionalityLocked,
} from '../../../selectors/featureFlagController/basicFunctionalityConsolidation';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../selectors/featureFlagController/glassHeaders';

const CLEAR_BROWSER_HISTORY_SECTION = 'clear-browser-history-section';

export type PrivacySettingsScrollSection = 'metametrics' | 'data-collection';

interface Params {
  scrollToSection?: PrivacySettingsScrollSection;
}

function PrivacySettings() {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { isEnabled } = useAnalytics();
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<Params>();
  const dispatch = useDispatch();
  const [browserHistoryModalVisible, setBrowserHistoryModalVisible] =
    useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );
  const isBasicFunctionalityConsolidationEnabled = useSelector(
    selectIsBasicFunctionalityConsolidationEnabled,
  );
  const isSocialLoginBasicFunctionalityLocked = useSelector(
    selectIsSocialLoginBasicFunctionalityLocked,
  );
  const {
    disableNotifications,
    loading: disableNotificationsLoading,
    error: disableNotificationsError,
  } = useDisableNotifications();
  const isNotificationEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const metaMetricsSectionRef = useRef<View>(null);
  const dataCollectionSectionRef = useRef<View>(null);

  const browserHistory = useSelector(
    (state: RootState) => state.browser.history,
  );

  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );

  const type = useSelector(selectProviderType);

  const isMainnet = type === MAINNET;

  useEffect(() => {
    setAnalyticsEnabled(isEnabled());
  }, [setAnalyticsEnabled, isEnabled]);

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

  function toggleClearBrowserHistoryModal() {
    setBrowserHistoryModalVisible(!browserHistoryModalVisible);
  }

  function renderClearBrowserHistorySection() {
    return (
      <Box twClassName="mt-6" testID={CLEAR_BROWSER_HISTORY_SECTION}>
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('app_settings.clear_browser_history_desc')}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('app_settings.clear_history_desc')}
        </Text>
        <Box twClassName="mt-4">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={toggleClearBrowserHistoryModal}
            isDisabled={browserHistory.length === 0}
          >
            {strings('app_settings.clear_browser_history_desc')}
          </Button>
        </Box>
      </Box>
    );
  }

  function clearBrowserHistory() {
    dispatch(clearHistory(isEnabled(), isDataCollectionForMarketingEnabled));
    toggleClearBrowserHistoryModal();
  }

  function renderHistoryModal() {
    return (
      <ActionModal
        modalVisible={browserHistoryModalVisible}
        confirmText={strings('app_settings.clear')}
        cancelText={strings('app_settings.reset_account_cancel_button')}
        onCancelPress={toggleClearBrowserHistoryModal}
        onRequestClose={toggleClearBrowserHistoryModal}
        onConfirmPress={clearBrowserHistory}
      >
        <Box twClassName="flex-1 items-center justify-center p-5">
          <Text variant={TextVariant.HeadingMd} twClassName="text-center mb-5">
            {strings('app_settings.clear_browser_history_modal_title')}
          </Text>
          <Text variant={TextVariant.BodyMd} twClassName="text-center">
            {strings('app_settings.clear_browser_history_modal_message')}
          </Text>
        </Box>
      </ActionModal>
    );
  }

  function toggleBasicFunctionality() {
    if (isSocialLoginBasicFunctionalityLocked) {
      return;
    }
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  }

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={tw`flex-1 bg-default`}>
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        testID="header"
        title={strings('app_settings.privacy_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`grow pb-12 pt-4`}
        ref={scrollViewRef}
      >
        <Box twClassName="pb-28 px-4">
          <Text variant={TextVariant.HeadingMd} twClassName="mb-4">
            {strings('app_settings.privacy_heading')}
          </Text>
          <Box twClassName="mt-6">
            <BasicFunctionalityComponent
              flushTop
              disabled={isSocialLoginBasicFunctionalityLocked}
              handleSwitchToggle={toggleBasicFunctionality}
            />
          </Box>
          <ClearPrivacy />
          {renderClearBrowserHistorySection()}
          <ClearCookiesSection />
          {!isBasicFunctionalityConsolidationEnabled && (
            <>
              <Text
                variant={TextVariant.HeadingMd}
                twClassName="mt-10 -mx-4 px-4 pt-9 border-t border-muted"
              >
                {strings('app_settings.network_provider')}
              </Text>
              <NetworkDetailsCheckSettings />
            </>
          )}
          {!isBasicFunctionalityConsolidationEnabled && (
            <>
              <Text
                variant={TextVariant.HeadingMd}
                twClassName="mt-10 -mx-4 px-4 pt-9 border-t border-muted"
              >
                {strings('app_settings.token_nft_ens_subheading')}
              </Text>
              <DisplayNFTMediaSettings />
              {isMainnet && <AutoDetectNFTSettings />}
            </>
          )}
          <IPFSGatewaySettings />
          <Text
            variant={TextVariant.HeadingMd}
            twClassName="mt-10 -mx-4 px-4 pt-9 border-t border-muted"
          >
            {strings('app_settings.analytics_subheading')}
          </Text>
          <MetaMetricsAndDataCollectionSection
            metaMetricsRef={metaMetricsSectionRef}
            dataCollectionRef={dataCollectionSectionRef}
          />
          <DeleteMetaMetricsData metricsOptin={analyticsEnabled} />
          <Box twClassName="mt-6">
            <SupportConsentPreferenceSection />
          </Box>
          <DeleteWalletData />
          <DeleteIdentityData />
          <TopTradersSection />
          {renderHistoryModal()}
        </Box>
      </ScrollView>
      <SwitchLoadingModal
        loading={disableNotificationsLoading}
        loadingText=""
        error={disableNotificationsError}
      />
    </SafeAreaView>
  );
}

export default PrivacySettings;
