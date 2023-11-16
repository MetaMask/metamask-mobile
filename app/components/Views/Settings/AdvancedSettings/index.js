// Third party dependencies.
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';
import { connect } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { isTokenDetectionSupportedForNetwork } from '@metamask/assets-controllers/dist/assetsUtil';
import {
  getApplicationName,
  getBuildNumber,
  getVersion,
} from 'react-native-device-info';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import RNFS from 'react-native-fs';
// eslint-disable-next-line import/no-nodejs-modules
import { Buffer } from 'buffer';
import { typography } from '@metamask/design-tokens';

// External dependencies.
import ActionModal from '../../../UI/ActionModal';
import Engine from '../../../../core/Engine';
import StyledButton from '../../../UI/StyledButton';
import {
  baseStyles,
  colors as importedColors,
  fontStyles,
} from '../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import {
  setShowCustomNonce,
  setShowHexData,
} from '../../../../actions/settings';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { generateStateLogs } from '../../../../util/logs';
import Device from '../../../../util/device';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import { selectChainId } from '../../../../selectors/networkController';
import {
  selectDisabledRpcMethodPreferences,
  selectUseTokenDetection,
} from '../../../../selectors/preferencesController';
import Routes from '../../../../constants/navigation/Routes';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { trackEventV2 as trackEvent } from '../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { AdvancedViewSelectorsIDs } from '../../../../../e2e/selectors/Settings/AdvancedView.selectors';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      padding: 24,
      paddingBottom: 48,
    },
    title: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 20,
      lineHeight: 20,
      paddingTop: 4,
      marginTop: -4,
    },
    desc: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 12,
    },
    marginTop: {
      marginTop: 18,
    },
    switchLine: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    switch: {
      alignSelf: 'flex-start',
    },
    switchLabel: {
      ...typography.sBodyLGMedium,
      color: colors.text.default,
      marginStart: 16,
    },
    setting: {
      marginTop: 50,
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
    modalText: {
      ...fontStyles.normal,
      fontSize: 16,
      textAlign: 'center',
      color: colors.text.default,
    },
    modalTitle: {
      ...fontStyles.bold,
      fontSize: 24,
      textAlign: 'center',
      marginBottom: 20,
      color: colors.text.default,
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
      color: colors.text.default,
      flex: 1,
      marginStart: 8,
    },
  });

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
     * Allow dapp api requests to eth_sign
     */
    enableEthSign: PropTypes.bool,
    /**
     * Called to toggle show hex data
     */
    setShowHexData: PropTypes.func,
    /**
     * Called to toggle show custom nonce
     */
    setShowCustomNonce: PropTypes.func,
    /**
     * Indicates whether custom nonce should be shown in transaction editor
     */
    showCustomNonce: PropTypes.bool,
    /**
     * Entire redux state used to generate state logs
     */
    fullState: PropTypes.object,
    /**
     * ChainID of network
     */
    chainId: PropTypes.string,
    /**
     * Boolean that checks if token detection is enabled
     */
    isTokenDetectionEnabled: PropTypes.bool,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
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

  componentDidMount = () => {
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

  resetAccount = () => {
    const { TransactionController } = Engine.context;
    const { navigation } = this.props;
    TransactionController.wipeTransactions(true);
    navigation.navigate('WalletView');
  };

  cancelResetAccount = () => {
    this.setState({ resetModalVisible: false });
  };

  downloadStateLogs = async () => {
    const { fullState } = this.props;
    const appName = await getApplicationName();
    const appVersion = await getVersion();
    const buildNumber = await getBuildNumber();
    const path =
      RNFS.DocumentDirectoryPath +
      `/state-logs-v${appVersion}-(${buildNumber}).json`;
    // A not so great way to copy objects by value

    try {
      const data = generateStateLogs(fullState);

      let url = `data:text/plain;base64,${new Buffer(data).toString('base64')}`;
      // // Android accepts attachements as BASE64
      if (Device.isIos()) {
        await RNFS.writeFile(path, data, 'utf8');
        url = path;
      }

      await Share.open({
        subject: `${appName} State logs -  v${appVersion} (${buildNumber})`,
        title: `${appName} State logs -  v${appVersion} (${buildNumber})`,
        url,
      });
    } catch (err) {
      Logger.error(err, 'State log error');
    }
  };

  onEthSignSettingChangeAttempt = (enabled) => {
    if (enabled) {
      // Navigate to the bottomsheet friction flow
      const { navigation } = this.props;
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.ETH_SIGN_FRICTION,
      });
    } else {
      // Disable eth_sign directly without friction
      const { PreferencesController } = Engine.context;
      PreferencesController.setDisabledRpcMethodPreference('eth_sign', false);
      trackEvent(MetaMetricsEvents.SETTINGS_ADVANCED_ETH_SIGN_DISABLED, {});
    }
  };

  toggleTokenDetection = (detectionStatus) => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setUseTokenDetection(detectionStatus);
  };

  renderTokenDetectionSection = () => {
    const { isTokenDetectionEnabled, chainId } = this.props;
    const { styles, colors } = this.getStyles();
    if (!isTokenDetectionSupportedForNetwork(chainId)) {
      return null;
    }
    return (
      <View style={styles.setting} testID={'token-detection-section'}>
        <Text style={styles.title}>
          {strings('app_settings.token_detection_title')}
        </Text>
        <Text style={styles.desc}>
          {strings('app_settings.token_detection_description')}
        </Text>
        <View style={styles.marginTop}>
          <View style={styles.switch}>
            <Switch
              value={isTokenDetectionEnabled}
              onValueChange={this.toggleTokenDetection}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={importedColors.white}
              ios_backgroundColor={colors.border.muted}
            />
          </View>
        </View>
      </View>
    );
  };

  render = () => {
    const {
      showHexData,
      showCustomNonce,
      setShowHexData,
      setShowCustomNonce,
      enableEthSign,
    } = this.props;
    const { resetModalVisible } = this.state;
    const { styles, colors } = this.getStyles();

    return (
      <SafeAreaView style={baseStyles.flexGrow}>
        <KeyboardAwareScrollView
          style={styles.wrapper}
          resetScrollToCoords={{ x: 0, y: 0 }}
          ref={this.scrollView}
        >
          <View
            style={styles.inner}
            testID={AdvancedViewSelectorsIDs.CONTAINER}
          >
            <ActionModal
              modalVisible={resetModalVisible}
              confirmText={strings('app_settings.reset_account_confirm_button')}
              cancelText={strings('app_settings.reset_account_cancel_button')}
              onCancelPress={this.cancelResetAccount}
              onRequestClose={this.cancelResetAccount}
              onConfirmPress={this.resetAccount}
            >
              <View style={styles.modalView}>
                <Text style={styles.modalTitle}>
                  {strings('app_settings.reset_account_modal_title')}
                </Text>
                <Text style={styles.modalText}>
                  {strings('app_settings.reset_account_modal_message')}
                </Text>
              </View>
            </ActionModal>
            <View style={[styles.setting, styles.firstSetting]}>
              <Text style={styles.title}>
                {strings('app_settings.reset_account')}
              </Text>
              <Text style={styles.desc}>
                {strings('app_settings.reset_desc')}
              </Text>
              <StyledButton
                type="info"
                onPress={this.displayResetAccountModal}
                containerStyle={styles.marginTop}
              >
                {strings('app_settings.reset_account_button')}
              </StyledButton>
            </View>
            <View style={styles.setting}>
              <Text style={styles.title}>
                {strings('app_settings.show_hex_data')}
              </Text>
              <Text style={styles.desc}>
                {strings('app_settings.hex_desc')}
              </Text>
              <View style={styles.marginTop}>
                <Switch
                  value={showHexData}
                  onValueChange={setShowHexData}
                  trackColor={{
                    true: colors.primary.default,
                    false: colors.border.muted,
                  }}
                  thumbColor={importedColors.white}
                  style={styles.switch}
                  ios_backgroundColor={colors.border.muted}
                />
              </View>
            </View>
            <View style={styles.setting}>
              <Text style={styles.title}>
                {strings('app_settings.enable_eth_sign')}
              </Text>
              <Text style={styles.desc}>
                {strings('app_settings.enable_eth_sign_desc')}
              </Text>
              {enableEthSign && (
                // display warning if eth_sign is enabled
                <View style={styles.warningBox}>
                  <Icon
                    color={IconColor.Error}
                    name={IconName.Danger}
                    size={IconSize.Lg}
                  />
                  <Text style={styles.warningText}>
                    {strings('app_settings.enable_eth_sign_warning')}
                  </Text>
                </View>
              )}
              <View style={[styles.marginTop, styles.switchLine]}>
                <Switch
                  value={enableEthSign}
                  onValueChange={this.onEthSignSettingChangeAttempt}
                  trackColor={{
                    true: colors.primary.default,
                    false: colors.border.muted,
                  }}
                  thumbColor={importedColors.white}
                  style={styles.switch}
                  ios_backgroundColor={colors.border.muted}
                  accessibilityRole={'switch'}
                  accessibilityLabel={strings('app_settings.enable_eth_sign')}
                  testID={AdvancedViewSelectorsIDs.ETH_SIGN_SWITCH}
                />
                <Text
                  onPress={() =>
                    this.onEthSignSettingChangeAttempt(!enableEthSign)
                  }
                  style={styles.switchLabel}
                >
                  {strings(
                    enableEthSign
                      ? 'app_settings.toggleEthSignOn'
                      : 'app_settings.toggleEthSignOff',
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.setting}>
              <Text style={styles.title}>
                {strings('app_settings.show_custom_nonce')}
              </Text>
              <Text style={styles.desc}>
                {strings('app_settings.custom_nonce_desc')}
              </Text>
              <View style={styles.marginTop}>
                <Switch
                  value={showCustomNonce}
                  onValueChange={setShowCustomNonce}
                  trackColor={{
                    true: colors.primary.default,
                    false: colors.border.muted,
                  }}
                  thumbColor={importedColors.white}
                  style={styles.switch}
                  ios_backgroundColor={colors.border.muted}
                />
              </View>
            </View>
            {this.renderTokenDetectionSection()}
            <View style={styles.setting}>
              <Text style={styles.title}>
                {strings('app_settings.state_logs')}
              </Text>
              <Text style={styles.desc}>
                {strings('app_settings.state_logs_desc')}
              </Text>
              <StyledButton
                type="info"
                onPress={this.downloadStateLogs}
                containerStyle={styles.marginTop}
              >
                {strings('app_settings.state_logs_button')}
              </StyledButton>
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
  showCustomNonce: state.settings.showCustomNonce,
  enableEthSign: selectDisabledRpcMethodPreferences(state).eth_sign,
  fullState: state,
  isTokenDetectionEnabled: selectUseTokenDetection(state),
  chainId: selectChainId(state),
});

const mapDispatchToProps = (dispatch) => ({
  setShowHexData: (showHexData) => dispatch(setShowHexData(showHexData)),
  setShowCustomNonce: (showCustomNonce) =>
    dispatch(setShowCustomNonce(showCustomNonce)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AdvancedSettings);
