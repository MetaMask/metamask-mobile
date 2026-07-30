// Third party dependencies.
import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { typography } from '@metamask/design-tokens';

// External dependencies.
import Engine from '../../../../core/Engine';
import { baseStyles } from '../../../../styles/common';
import {
  setShowFiatOnTestnets as setShowFiatOnTestnetsAction,
  setShowHexData as setShowHexDataAction,
} from '../../../../actions/settings';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { selectChainId } from '../../../../selectors/networkController';
import {
  selectDismissSmartAccountSuggestionEnabled,
  selectSmartTransactionsOptInStatus,
  selectUseTokenDetection,
} from '../../../../selectors/preferencesController';
import { selectSmartTransactionsEnabled } from '../../../../selectors/smartTransactionsController';
import Routes from '../../../../constants/navigation/Routes';

import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AdvancedViewSelectorsIDs } from './AdvancedView.testIds';
import { getFontFamily } from '../../../../component-library/components/Texts/Text/Text.utils';
import { TextVariant as LibraryTextVariant } from '../../../../component-library/components/Texts/Text/Text.types';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import AppConstants from '../../../../../app/core/AppConstants';
import { downloadStateLogs } from '../../../../util/logs';
import AutoDetectTokensSettings from '../AutoDetectTokensSettings';
import { ResetAccountModal } from './ResetAccountModal/ResetAccountModal';
import type { RootState } from '../../../../reducers';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { Colors } from '../../../../util/theme/models';
import type { Hex } from '@metamask/utils';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      padding: 16,
      paddingBottom: 100,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 16,
    },
    toggleDesc: {
      marginRight: 8,
    },
    desc: {
      marginTop: 8,
    },
    accessory: {
      marginTop: 16,
    },
    switchLine: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    switch: {
      alignSelf: 'flex-start',
    },
    setting: {
      marginTop: 24,
    },
    firstSetting: {
      marginTop: 0,
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
    },
    modalTitle: {
      textAlign: 'center',
      marginBottom: 20,
    },
    picker: {
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      marginTop: 16,
    },
    inner: {
      paddingBottom: 48,
    },
    ipfsGatewayLoadingWrapper: {
      height: 37,
      alignItems: 'center',
      justifyContent: 'center',
    },
    warningBox: {
      flexDirection: 'row',
      backgroundColor: colors.error.muted,
      borderLeftColor: colors.error.default,
      borderRadius: 4,
      borderLeftWidth: 4,
      marginTop: 24,
      marginHorizontal: 8,
      paddingStart: 11,
      paddingEnd: 8,
      paddingVertical: 8,
    },
    warningText: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(LibraryTextVariant.BodyMD),
      color: colors.text.default,
      flex: 1,
      marginStart: 8,
    },
  });

type Styles = ReturnType<typeof createStyles>;

interface SettingsRowProps {
  heading: string;
  description: ReactNode;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testId?: string;
  styles: Styles;
}

const SettingsRow = ({
  heading,
  description,
  value,
  onValueChange,
  testId,
  styles,
}: SettingsRowProps) => {
  const { brandColors, colors } = useTheme();
  return (
    <View style={styles.setting}>
      <View style={styles.titleContainer}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          style={styles.title}
        >
          {heading}
        </Text>
        <View style={styles.toggle}>
          <Switch
            testID={testId}
            value={value}
            onValueChange={onValueChange}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            accessibilityLabel={heading}
          />
        </View>
      </View>

      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        style={styles.desc}
      >
        {description}
      </Text>
    </View>
  );
};

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
  isTokenDetectionEnabled: ReturnType<typeof selectUseTokenDetection>;
  chainId: ReturnType<typeof selectChainId>;
  smartTransactionsOptInStatus: ReturnType<
    typeof selectSmartTransactionsOptInStatus
  >;
  smartTransactionsEnabled: ReturnType<typeof selectSmartTransactionsEnabled>;
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

const isHexChainId = (
  chainId: ReturnType<typeof selectChainId>,
): chainId is Hex => chainId.startsWith('0x');

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
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              onPress={displayResetAccountModal}
              label={strings('app_settings.reset_account_button')}
              style={styles.accessory}
            />
          </View>

          <SettingsRow
            heading={strings(
              'app_settings.smart_account_dapp_requests_heading',
            )}
            description={strings(
              'app_settings.smart_account_dapp_requests_desc_v2',
            )}
            value={!dismissSmartAccountSuggestionEnabled}
            onValueChange={(val) =>
              toggleDismissSmartAccountSuggestionEnabled(!val)
            }
            testId={AdvancedViewSelectorsIDs.DISMISS_SMART_ACCOUNT_UPDATE}
            styles={styles}
          />

          <SettingsRow
            heading={strings('app_settings.smart_transactions_opt_in_heading')}
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
            testId={AdvancedViewSelectorsIDs.STX_OPT_IN_SWITCH}
            styles={styles}
          />

          <SettingsRow
            heading={strings('app_settings.show_hex_data')}
            description={strings('app_settings.hex_desc')}
            value={showHexData}
            onValueChange={setShowHexData}
            styles={styles}
          />

          <AutoDetectTokensSettings />

          <SettingsRow
            heading={strings('app_settings.show_fiat_on_testnets')}
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
            testId={AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS}
            styles={styles}
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
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              onPress={handleDownloadStateLogs}
              label={strings('app_settings.state_logs_button')}
              style={styles.accessory}
            />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const mapStateToProps = (state: SettingsRootState): StateProps => {
  const chainId = selectChainId(state);

  return {
    showHexData: state.settings.showHexData,
    showFiatOnTestnets: state.settings.showFiatOnTestnets,
    fullState: state,
    isTokenDetectionEnabled: selectUseTokenDetection(state),
    chainId,
    smartTransactionsOptInStatus: selectSmartTransactionsOptInStatus(state),
    smartTransactionsEnabled: isHexChainId(chainId)
      ? selectSmartTransactionsEnabled(state, chainId)
      : false,
    dismissSmartAccountSuggestionEnabled:
      selectDismissSmartAccountSuggestionEnabled(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  setShowHexData: (showHexData: boolean) =>
    dispatch(setShowHexDataAction(showHexData)),
  setShowFiatOnTestnets: (showFiatOnTestnets: boolean) =>
    dispatch(setShowFiatOnTestnetsAction(showFiatOnTestnets)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AdvancedSettings);
