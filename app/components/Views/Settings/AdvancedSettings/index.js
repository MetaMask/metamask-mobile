// Third party dependencies.
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { typography } from '@metamask/design-tokens';

// External dependencies.
import Engine from '../../../../core/Engine';
import { baseStyles } from '../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import {
  setShowFiatOnTestnets,
  setShowHexData,
} from '../../../../actions/settings';
import { strings } from '../../../../../locales/i18n';
import Device from '../../../../util/device';
import { mockTheme, ThemeContext, useTheme } from '../../../../util/theme';
import { selectChainId } from '../../../../selectors/networkController';
import {
  selectDismissSmartAccountSuggestionEnabled,
  selectSmartAccountOptIn,
  selectSmartTransactionsOptInStatus,
  selectUseTokenDetection,
} from '../../../../selectors/preferencesController';
import { selectSmartTransactionsEnabled } from '../../../../selectors/smartTransactionsController';
import Routes from '../../../../constants/navigation/Routes';

import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AdvancedViewSelectorsIDs } from '../../../../../e2e/selectors/Settings/AdvancedView.selectors';
import Text, {
  TextVariant,
  TextColor,
  getFontFamily,
} from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import { withMetricsAwareness } from '../../../../components/hooks/useMetrics';
import AppConstants from '../../../../../app/core/AppConstants';
import { downloadStateLogs } from '../../../../util/logs';
import AutoDetectTokensSettings from '../AutoDetectTokensSettings';
import { ResetAccountModal } from './ResetAccountModal/ResetAccountModal';

const createStyles = (colors) =>
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
      marginTop: 32,
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
      fontFamily: getFontFamily(TextVariant.BodyMD),
      color: colors.text.default,
      flex: 1,
      marginStart: 8,
    },
  });

const SettingsRow = ({
  heading,
  description,
  value,
  onValueChange,
  testId,
  styles,
}) => {
  const { brandColors, colors } = useTheme();
  return (
    <View style={styles.setting}>
      <View style={styles.titleContainer}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.title}>
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
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {description}
      </Text>
    </View>
  );
};

SettingsRow.propTypes = {
  heading: PropTypes.string,
  description: PropTypes.string,
  value: PropTypes.bool,
  onValueChange: PropTypes.func,
  testId: PropTypes.string,
  styles: PropTypes.object,
};

/**
 * Main view for app configurations
 */
class AdvancedSettings extends PureComponent {
  static propTypes = {
    /**
    /* navigation object required to push new views
    */
    navigation: PropTypes.object,
    /**
     * Indicates whether hex data should be shown in transaction editor
     */
    showHexData: PropTypes.bool,
    /**
     * Called to toggle show hex data
     */
    setShowHexData: PropTypes.func,
    /**
     * Indicates whether fiat conversions should be shown on testnets
     */
    showFiatOnTestnets: PropTypes.bool,
    /**
     * Called to toggle showing fiat conversions on testnets
     */
    setShowFiatOnTestnets: PropTypes.func,
    /**
     * Entire redux state used to generate state logs
     */
    fullState: PropTypes.object,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
    /**
     * Boolean that checks if smart transactions is enabled
     */
    smartTransactionsOptInStatus: PropTypes.bool,
    /**
     * Boolean to disable smart account upgrade prompts
     */
    dismissSmartAccountSuggestionEnabled: PropTypes.bool,
    /**
     * Boolean for user to opt-in for smart account upgrade
     */
    smartAccountOptIn: PropTypes.bool,
  };

  scrollView = React.createRef();

  state = {
    resetModalVisible: false,
    inputWidth: Device.isAndroid() ? '99%' : undefined,
  };

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    return { styles, colors };
  };

  updateNavBar = () => {
    const { navigation, route } = this.props;
    const { colors } = this.getStyles();
    const isFullScreenModal = route?.params?.isFullScreenModal || false;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.advanced_title'),
        navigation,
        isFullScreenModal,
        colors,
      ),
    );
  };

  componentDidMount = async () => {
    this.updateNavBar();
    this.mounted = true;
    // Workaround https://github.com/facebook/react-native/issues/9958
    this.state.inputWidth &&
      setTimeout(() => {
        this.mounted && this.setState({ inputWidth: '100%' });
      }, 100);

    this.props.route?.params?.scrollToBottom &&
      this.scrollView?.current?.scrollToEnd({ animated: true });
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  componentWillUnmount = () => {
    this.mounted = false;
  };

  displayResetAccountModal = () => {
    this.setState({ resetModalVisible: true });
  };

  cancelResetAccount = () => {
    this.setState({ resetModalVisible: false });
  };

  downloadStateLogs = async () => {
    const { fullState } = this.props;
    downloadStateLogs(fullState);
  };

  toggleTokenDetection = (detectionStatus) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setUseTokenDetection(detectionStatus);
  };

  trackMetricsEvent = (event, properties) => {
    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(event)
        .addProperties({
          location: 'Advanced Settings',
          ...properties,
        })
        .build(),
    );
  };

  toggleSmartTransactionsOptInStatus = (smartTransactionsOptInStatus) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setSmartTransactionsOptInStatus(
      smartTransactionsOptInStatus,
    );

    this.trackMetricsEvent(MetaMetricsEvents.SMART_TRANSACTION_OPT_IN, {
      stx_opt_in: smartTransactionsOptInStatus,
    });
  };

  toggleSmartAccountOptIn = (smartAccountOptIn) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setSmartAccountOptIn(smartAccountOptIn);

    this.trackMetricsEvent(MetaMetricsEvents.SMART_ACCOUNT_OPT_IN, {
      smart_account_opt_in: smartAccountOptIn,
    });
  };

  toggleDismissSmartAccountSuggestionEnabled = (
    dismissSmartAccountSuggestionEnabled,
  ) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setDismissSmartAccountSuggestionEnabled(
      dismissSmartAccountSuggestionEnabled,
    );

    this.trackMetricsEvent(
      MetaMetricsEvents.DISMISS_SMART_ACCOUNT_SUGGESTION_ENABLED,
      {
        dismiss_smart_account_suggestion_enabled:
          dismissSmartAccountSuggestionEnabled,
      },
    );
  };

  openLinkAboutStx = () => {
    Linking.openURL(AppConstants.URLS.SMART_TXS);
  };

  openLinkAboutSmartAccount = () => {
    Linking.openURL(AppConstants.URLS.SMART_ACCOUNTS);
  };

  render = () => {
    const {
      showHexData,
      showFiatOnTestnets,
      setShowHexData,
      setShowFiatOnTestnets,
      smartAccountOptIn,
      smartTransactionsOptInStatus,
      dismissSmartAccountSuggestionEnabled,
    } = this.props;
    const { resetModalVisible } = this.state;
    const { styles } = this.getStyles();

    return (
      <SafeAreaView edges={{ bottom: 'additive' }} style={baseStyles.flexGrow}>
        <KeyboardAwareScrollView
          style={styles.wrapper}
          resetScrollToCoords={{ x: 0, y: 0 }}
          testID={AdvancedViewSelectorsIDs.ADVANCED_SETTINGS_SCROLLVIEW}
          ref={this.scrollView}
        >
          <View
            style={styles.inner}
            testID={AdvancedViewSelectorsIDs.CONTAINER}
          >
            <ResetAccountModal
              resetModalVisible={resetModalVisible}
              cancelResetAccount={this.cancelResetAccount}
              styles={styles}
            />
            <View style={[styles.setting, styles.firstSetting]}>
              <Text variant={TextVariant.BodyLGMedium}>
                {strings('app_settings.reset_account')}
              </Text>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.desc}
              >
                {strings('app_settings.reset_desc')}
              </Text>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                onPress={this.displayResetAccountModal}
                label={strings('app_settings.reset_account_button')}
                style={styles.accessory}
              />
            </View>

            <SettingsRow
              heading={strings('app_settings.use_smart_account_heading')}
              description={
                <>
                  {strings('app_settings.use_smart_account_desc')}{' '}
                  <Text
                    color={TextColor.Primary}
                    link
                    onPress={this.openLinkAboutSmartAccount}
                  >
                    {strings('app_settings.use_smart_account_learn_more')}
                  </Text>
                </>
              }
              value={smartAccountOptIn}
              onValueChange={this.toggleSmartAccountOptIn}
              testId={AdvancedViewSelectorsIDs.SMART_ACCOUNT_OPT_IN}
              styles={styles}
            />

            <SettingsRow
              heading={strings(
                'app_settings.dismiss_smart_account_update_heading',
              )}
              description={strings(
                'app_settings.dismiss_smart_account_update_desc',
              )}
              value={dismissSmartAccountSuggestionEnabled}
              onValueChange={this.toggleDismissSmartAccountSuggestionEnabled}
              testId={AdvancedViewSelectorsIDs.DISMISS_SMART_ACCOUNT_UPDATE}
              styles={styles}
            />

            <SettingsRow
              heading={strings(
                'app_settings.smart_transactions_opt_in_heading',
              )}
              description={
                <>
                  {strings(
                    'app_settings.smart_transactions_opt_in_desc_supported_networks',
                  )}{' '}
                  <Text
                    color={TextColor.Primary}
                    link
                    onPress={this.openLinkAboutStx}
                  >
                    {strings('app_settings.smart_transactions_learn_more')}
                  </Text>
                </>
              }
              value={smartTransactionsOptInStatus}
              onValueChange={this.toggleSmartTransactionsOptInStatus}
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
              onValueChange={(showFiatOnTestnets) => {
                if (showFiatOnTestnets) {
                  this.props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
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
              <Text variant={TextVariant.BodyLGMedium}>
                {strings('app_settings.state_logs')}
              </Text>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.desc}
              >
                {strings('app_settings.state_logs_desc')}
              </Text>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                onPress={this.downloadStateLogs}
                label={strings('app_settings.state_logs_button')}
                style={styles.accessory}
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  };
}

AdvancedSettings.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  showHexData: state.settings.showHexData,
  showFiatOnTestnets: state.settings.showFiatOnTestnets,
  fullState: state,
  isTokenDetectionEnabled: selectUseTokenDetection(state),
  chainId: selectChainId(state),
  smartTransactionsOptInStatus: selectSmartTransactionsOptInStatus(state),
  smartTransactionsEnabled: selectSmartTransactionsEnabled(
    state,
    selectChainId(state),
  ),
  dismissSmartAccountSuggestionEnabled:
    selectDismissSmartAccountSuggestionEnabled(state),
  smartAccountOptIn: selectSmartAccountOptIn(state),
});

const mapDispatchToProps = (dispatch) => ({
  setShowHexData: (showHexData) => dispatch(setShowHexData(showHexData)),
  setShowFiatOnTestnets: (showFiatOnTestnets) =>
    dispatch(setShowFiatOnTestnets(showFiatOnTestnets)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(AdvancedSettings));
