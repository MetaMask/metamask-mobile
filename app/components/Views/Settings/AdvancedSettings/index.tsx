// Third party dependencies.
import React, { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// External dependencies.
import Engine from '../../../../core/Engine';
import { baseStyles } from '../../../../styles/common';
import {
  setShowFiatOnTestnets as setShowFiatOnTestnetsAction,
  setShowHexData as setShowHexDataAction,
} from '../../../../actions/settings';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import {
  selectDismissSmartAccountSuggestionEnabled,
  selectSmartTransactionsOptInStatus,
} from '../../../../selectors/preferencesController';
import Routes from '../../../../constants/navigation/Routes';

import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AdvancedViewSelectorsIDs } from './AdvancedView.testIds';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  HeaderStandard,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import AppConstants from '../../../../../app/core/AppConstants';
import { downloadStateLogs } from '../../../../util/logs';
import AutoDetectTokensSettings from '../AutoDetectTokensSettings';
import { ResetAccountModal } from './ResetAccountModal/ResetAccountModal';
import type { RootState } from '../../../../reducers';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { SettingsToggleRow } from '../components/SettingsToggleRow';
import { createStyles } from './AdvancedSettings.styles';

interface SettingsState {
  showHexData: boolean;
  showFiatOnTestnets: boolean;
}

type SettingsRootState = Omit<RootState, 'settings'> & {
  settings: SettingsState;
};

interface StateProps {
  showHexData: boolean;
  showFiatOnTestnets: boolean;
  fullState: SettingsRootState;
  smartTransactionsOptInStatus: ReturnType<
    typeof selectSmartTransactionsOptInStatus
  >;
  dismissSmartAccountSuggestionEnabled: ReturnType<
    typeof selectDismissSmartAccountSuggestionEnabled
  >;
}

interface DispatchProps {
  setShowHexData: (showHexData: boolean) => void;
  setShowFiatOnTestnets: (showFiatOnTestnets: boolean) => void;
}

interface OwnProps {
  navigation: AppNavigationProp;
  route?: {
    params?: {
      scrollToBottom?: boolean;
    };
  };
}

type Props = StateProps & DispatchProps & OwnProps;

/**
 * Main view for app configurations
 */
const AdvancedSettings = ({
  navigation,
  showHexData,
  setShowHexData,
  showFiatOnTestnets,
  setShowFiatOnTestnets,
  fullState,
  route,
  smartTransactionsOptInStatus,
  dismissSmartAccountSuggestionEnabled,
}: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const scrollView = useRef<KeyboardAwareScrollView | null>(null);
  const [resetModalVisible, setResetModalVisible] = useState(false);

  useEffect(() => {
    if (route?.params?.scrollToBottom) {
      scrollView.current?.scrollToEnd(true);
    }
  }, [route?.params?.scrollToBottom]);

  const displayResetAccountModal = () => {
    setResetModalVisible(true);
  };

  const cancelResetAccount = () => {
    setResetModalVisible(false);
  };

  const handleDownloadStateLogs = () => {
    downloadStateLogs(fullState);
  };

  const trackMetricsEvent = (
    event: Parameters<typeof AnalyticsEventBuilder.createEventBuilder>[0],
    properties: Record<string, unknown>,
  ) => {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(event)
        .addProperties({
          location: 'Advanced Settings',
          ...properties,
        })
        .build(),
    );
  };

  const toggleSmartTransactionsOptInStatus = (optInStatus: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setSmartTransactionsOptInStatus(optInStatus);

    trackMetricsEvent(MetaMetricsEvents.SMART_TRANSACTION_OPT_IN, {
      stx_opt_in: optInStatus,
    });
  };

  const toggleDismissSmartAccountSuggestionEnabled = (enabled: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setDismissSmartAccountSuggestionEnabled(enabled);

    trackMetricsEvent(
      MetaMetricsEvents.DISMISS_SMART_ACCOUNT_SUGGESTION_ENABLED,
      {
        dismiss_smart_account_suggestion_enabled: enabled,
      },
    );
  };

  const openLinkAboutStx = () => {
    Linking.openURL(AppConstants.URLS.SMART_TXS);
  };

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={baseStyles.flexGrow}>
      <HeaderStandard
        title={strings('app_settings.advanced_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <KeyboardAwareScrollView
        style={styles.wrapper}
        resetScrollToCoords={{ x: 0, y: 0 }}
        testID={AdvancedViewSelectorsIDs.ADVANCED_SETTINGS_SCROLLVIEW}
        ref={scrollView}
      >
        <View style={styles.inner} testID={AdvancedViewSelectorsIDs.CONTAINER}>
          <ResetAccountModal
            resetModalVisible={resetModalVisible}
            cancelResetAccount={cancelResetAccount}
            styles={styles}
          />
          <View style={[styles.setting, styles.firstSetting]}>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('app_settings.reset_account')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              style={styles.desc}
            >
              {strings('app_settings.reset_desc')}
            </Text>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={displayResetAccountModal}
              style={styles.accessory}
            >
              {strings('app_settings.reset_account_button')}
            </Button>
          </View>

          <SettingsToggleRow
            title={strings('app_settings.smart_account_dapp_requests_heading')}
            description={strings(
              'app_settings.smart_account_dapp_requests_desc_v2',
            )}
            value={!dismissSmartAccountSuggestionEnabled}
            onValueChange={(val) =>
              toggleDismissSmartAccountSuggestionEnabled(!val)
            }
            testID={AdvancedViewSelectorsIDs.DISMISS_SMART_ACCOUNT_UPDATE}
          />

          <SettingsToggleRow
            title={strings('app_settings.smart_transactions_opt_in_heading')}
            description={
              <>
                {strings(
                  'app_settings.smart_transactions_opt_in_desc_supported_networks',
                )}{' '}
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.PrimaryDefault}
                  accessibilityRole="link"
                  onPress={openLinkAboutStx}
                >
                  {strings('app_settings.smart_transactions_learn_more')}
                </Text>
              </>
            }
            value={smartTransactionsOptInStatus}
            onValueChange={toggleSmartTransactionsOptInStatus}
            testID={AdvancedViewSelectorsIDs.STX_OPT_IN_SWITCH}
          />

          <SettingsToggleRow
            title={strings('app_settings.show_hex_data')}
            description={strings('app_settings.hex_desc')}
            value={showHexData}
            onValueChange={setShowHexData}
          />

          <AutoDetectTokensSettings />

          <SettingsToggleRow
            title={strings('app_settings.show_fiat_on_testnets')}
            description={strings('app_settings.show_fiat_on_testnets_desc')}
            value={showFiatOnTestnets}
            onValueChange={(enabled) => {
              if (enabled) {
                navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
                  screen: Routes.SHEET.FIAT_ON_TESTNETS_FRICTION,
                });
              } else {
                setShowFiatOnTestnets(false);
              }
            }}
            testID={AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS}
          />

          <View style={styles.setting}>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('app_settings.state_logs')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              style={styles.desc}
            >
              {strings('app_settings.state_logs_desc')}
            </Text>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleDownloadStateLogs}
              style={styles.accessory}
            >
              {strings('app_settings.state_logs_button')}
            </Button>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const mapStateToProps = (state: SettingsRootState): StateProps => ({
  showHexData: state.settings.showHexData,
  showFiatOnTestnets: state.settings.showFiatOnTestnets,
  fullState: state,
  smartTransactionsOptInStatus: selectSmartTransactionsOptInStatus(state),
  dismissSmartAccountSuggestionEnabled:
    selectDismissSmartAccountSuggestionEnabled(state),
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  setShowHexData: (showHexData: boolean) =>
    dispatch(setShowHexDataAction(showHexData)),
  setShowFiatOnTestnets: (showFiatOnTestnets: boolean) =>
    dispatch(setShowFiatOnTestnetsAction(showFiatOnTestnets)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AdvancedSettings);
