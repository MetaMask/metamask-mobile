// Third party dependencies.
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Engine from '../../../../core/Engine';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// External dependencies.
import { baseStyles } from '../../../../styles/common';
import { setShowFiatOnTestnets as setShowFiatOnTestnetsAction } from '../../../../actions/settings';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { selectDismissSmartAccountSuggestionEnabled } from '../../../../selectors/preferencesController';
import Routes from '../../../../constants/navigation/Routes';

import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AdvancedViewSelectorsIDs } from './AdvancedView.testIds';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { downloadStateLogs } from '../../../../util/logs';
import AutoDetectTokensSettings from '../AutoDetectTokensSettings';
import { ResetAccountModal } from './ResetAccountModal/ResetAccountModal';
import type { RootState } from '../../../../reducers';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { SettingsToggleRow } from '../components/SettingsToggleRow';
import { createStyles } from './AdvancedSettings.styles';
import { selectIsBasicFunctionalityConsolidationEnabled } from '../../../../selectors/featureFlagController/basicFunctionalityConsolidation';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';
import { selectMoneyAccountStatusPageEnabled } from '../../../UI/Money/selectors/featureFlags';

interface SettingsState {
  showHexData: boolean;
  showFiatOnTestnets: boolean;
}

type SettingsRootState = Omit<RootState, 'settings'> & {
  settings: SettingsState;
};

interface StateProps {
  showFiatOnTestnets: boolean;
  fullState: SettingsRootState;
  dismissSmartAccountSuggestionEnabled: ReturnType<
    typeof selectDismissSmartAccountSuggestionEnabled
  >;
  isBasicFunctionalityConsolidationEnabled: boolean;
}

interface DispatchProps {
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
  showFiatOnTestnets,
  setShowFiatOnTestnets,
  fullState,
  route,
  dismissSmartAccountSuggestionEnabled,
  isBasicFunctionalityConsolidationEnabled,
}: Props) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const isMoneyAccountStatusPageEnabled = useSelector(
    selectMoneyAccountStatusPageEnabled,
  );
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

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={baseStyles.flexGrow}>
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        title={strings('app_settings.advanced_title')}
        onBack={() => navigation.goBack()}
        backButtonProps={{ testID: AdvancedViewSelectorsIDs.BACK_BUTTON }}
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

          {!isBasicFunctionalityConsolidationEnabled && (
            <AutoDetectTokensSettings />
          )}

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

          {isMoneyAccountStatusPageEnabled && (
            <View style={styles.setting}>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {strings('app_settings.money_account_status')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                style={styles.desc}
              >
                {strings('app_settings.money_account_status_desc')}
              </Text>
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                isFullWidth
                onPress={() => navigation.navigate(Routes.MONEY.ACCOUNT_STATUS)}
                style={styles.accessory}
                testID={AdvancedViewSelectorsIDs.MONEY_ACCOUNT_STATUS_BUTTON}
              >
                {strings('app_settings.money_account_status_button')}
              </Button>
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const mapStateToProps = (state: SettingsRootState): StateProps => ({
  showFiatOnTestnets: state.settings.showFiatOnTestnets,
  fullState: state,
  dismissSmartAccountSuggestionEnabled:
    selectDismissSmartAccountSuggestionEnabled(state),
  isBasicFunctionalityConsolidationEnabled:
    selectIsBasicFunctionalityConsolidationEnabled(state),
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  setShowFiatOnTestnets: (showFiatOnTestnets: boolean) =>
    dispatch(setShowFiatOnTestnetsAction(showFiatOnTestnets)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AdvancedSettings);
