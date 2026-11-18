import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View, Keyboard, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { MAINNET } from '../../../../constants/network';
import ActionModal from '../../../UI/ActionModal';
import { clearHistory } from '../../../../actions/browser';
import { strings } from '../../../../../locales/i18n';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  ClearCookiesSection,
  DeleteMetaMetricsData,
  DeleteWalletData,
  ClearPrivacy,
  SupportConsentPreferenceSection,
  DeleteIdentityData,
} from '../SecuritySettings/Sections';
import { selectProviderType } from '../../../../selectors/networkController';
import createStyles from './PrivacySettings.styles';
import { PrivacySettingsParams } from './PrivacySettings.types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useParams } from '../../../../util/navigation/navUtils';
import { CLEAR_BROWSER_HISTORY_SECTION } from './PrivacySettings.constants';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import BasicFunctionalityComponent from '../../../UI/BasicFunctionality/BasicFunctionality';
import Routes from '../../../../constants/navigation/Routes';
import MetaMetricsAndDataCollectionSection from '../SecuritySettings/Sections/MetaMetricsAndDataCollectionSection/MetaMetricsAndDataCollectionSection';
import TopTradersSection from '../SecuritySettings/Sections/TopTradersSection';
import { RootState } from '../../../../reducers';
import NetworkDetailsCheckSettings from '../NetworkDetailsCheckSettings';
import DisplayNFTMediaSettings from '../DisplayNFTMediaSettings';
import AutoDetectNFTSettings from '../AutoDetectNFTSettings';
import IPFSGatewaySettings from '../IPFSGatewaySettings';
import { useStyles } from '../../../../component-library/hooks/useStyles';
import {
  selectIsBasicFunctionalityConsolidationEnabled,
  selectIsSocialLoginBasicFunctionalityLocked,
} from '../../../../selectors/featureFlagController/basicFunctionalityConsolidation';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';

function PrivacySettings() {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { isEnabled } = useAnalytics();
  const {
    styles,
    theme: { colors, brandColors },
  } = useStyles(createStyles, {});
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<PrivacySettingsParams>();
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

  const toggleClearBrowserHistoryModal = () => {
    setBrowserHistoryModalVisible(!browserHistoryModalVisible);
  };

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
          onPress={toggleClearBrowserHistoryModal}
          isDisabled={browserHistory.length === 0}
        >
          {strings('app_settings.clear_browser_history_desc')}
        </Button>
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
    >
      <View style={styles.modalView}>
        <Text variant={TextVariant.HeadingMd} style={styles.modalTitle}>
          {strings('app_settings.clear_browser_history_modal_title')}
        </Text>
        <Text variant={TextVariant.BodyMd} style={styles.modalText}>
          {strings('app_settings.clear_browser_history_modal_message')}
        </Text>
      </View>
    </ActionModal>
  );

  const toggleBasicFunctionality = () => {
    if (isSocialLoginBasicFunctionalityLocked) {
      return;
    }
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  };

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        testID="header"
        title={strings('app_settings.privacy_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        ref={scrollViewRef}
      >
        <View style={styles.inner}>
          <View style={[styles.setting, styles.firstSetting]}>
            <Text variant={TextVariant.HeadingMd} style={styles.heading}>
              {strings('app_settings.privacy_heading')}
            </Text>
          </View>
          <View style={styles.halfSetting}>
            <BasicFunctionalityComponent
              flushTop
              disabled={isSocialLoginBasicFunctionalityLocked}
              handleSwitchToggle={toggleBasicFunctionality}
            />
          </View>
          <ClearPrivacy />
          {renderClearBrowserHistorySection()}
          <ClearCookiesSection />
          {!isBasicFunctionalityConsolidationEnabled && (
            <>
              <Text variant={TextVariant.HeadingMd} style={styles.subHeading}>
                {strings('app_settings.network_provider')}
              </Text>
              <NetworkDetailsCheckSettings />
            </>
          )}
          {!isBasicFunctionalityConsolidationEnabled && (
            <>
              <Text variant={TextVariant.HeadingMd} style={styles.subHeading}>
                {strings('app_settings.token_nft_ens_subheading')}
              </Text>
              <DisplayNFTMediaSettings />
              {isMainnet && <AutoDetectNFTSettings />}
            </>
          )}
          <IPFSGatewaySettings />
          <Text variant={TextVariant.HeadingMd} style={styles.subHeading}>
            {strings('app_settings.analytics_subheading')}
          </Text>
          <MetaMetricsAndDataCollectionSection
            metaMetricsRef={metaMetricsSectionRef}
            dataCollectionRef={dataCollectionSectionRef}
          />
          <DeleteMetaMetricsData metricsOptin={analyticsEnabled} />
          <View style={styles.setting}>
            <SupportConsentPreferenceSection />
          </View>
          <DeleteWalletData />
          <DeleteIdentityData />
          <TopTradersSection />
          {renderHistoryModal()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default PrivacySettings;
