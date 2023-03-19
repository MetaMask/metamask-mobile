import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import StyledButton from '../StyledButton';
import {
  StyleSheet,
  Text,
  View,
  InteractionManager,
  TouchableOpacity,
} from 'react-native';
import TransactionHeader from '../TransactionHeader';
import AccountInfoCard from '../AccountInfoCard';
import { strings } from '../../../../locales/i18n';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';
import NotificationManager from '../../../core/NotificationManager';
import { trackEvent } from '../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../core/Analytics';
import URL from 'url-parse';
import { getAddressAccountType } from '../../../util/address';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  ACCOUNT_APROVAL_MODAL_CONTAINER_ID,
  CANCEL_BUTTON_ID,
} from '../../../constants/test-ids';
import {
  selectChainId,
  selectProviderType,
} from '../../../selectors/networkController';
import AppConstants from '../../../../app/core/AppConstants';
import { shuffle } from 'lodash';
import { toggleSDKFeedbackModal } from '../../../../app/actions/modals';
import SDKConnect from '../../../core/SDKConnect/SDKConnect';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 200,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },
    accountCardWrapper: {
      paddingHorizontal: 24,
    },
    intro: {
      ...fontStyles.bold,
      textAlign: 'center',
      color: colors.text.default,
      fontSize: Device.isSmallDevice() ? 16 : 20,
      marginBottom: 8,
      marginTop: 16,
    },
    intro_reconnect: {
      ...fontStyles.bold,
      textAlign: 'center',
      color: colors.text.default,
      fontSize: Device.isSmallDevice() ? 16 : 20,
      marginBottom: 8,
      marginTop: 16,
      marginLeft: 16,
      marginRight: 16,
    },
    otpNotice: {
      ...fontStyles.thin,
      color: colors.text.default,
      paddingHorizontal: 24,
      marginBottom: 16,
      marginTop: 5,
      fontSize: 14,
      width: '100%',
      textAlign: 'center',
    },
    otpContainer: {},
    otpText: {
      color: colors.primary.default,
    },
    selectOtp: {
      marginTop: 0,
      padding: 2,
      marginLeft: 20,
      marginRight: 20,
    },
    otpView: {
      height: 30,
      backgroundColor: mockTheme.colors.background.alternative,
      alignItems: 'center',
      justifyContent: 'center',
    },
    firstChoice: {
      marginTop: 10,
    },
    warning: {
      ...fontStyles.thin,
      color: colors.text.default,
      paddingHorizontal: 24,
      marginBottom: 16,
      fontSize: 14,
      width: '100%',
      textAlign: 'center',
    },
    actionContainer: {
      flex: 0,
      flexDirection: 'row',
      paddingVertical: 16,
      paddingHorizontal: 24,
    },
    button: {
      flex: 1,
    },
    cancel: {
      marginRight: 8,
    },
    confirm: {
      marginLeft: 8,
    },
    otpRoot: {
      flexDirection: 'row',
      marginTop: 10,
      justifyContent: 'space-around',
    },
    circle: {
      width: 12,
      height: 12,
      borderRadius: 12 / 2,
      backgroundColor: colors.background.default,
      opacity: 1,
      margin: 2,
      borderWidth: 2,
      borderColor: colors.border.default,
      marginRight: 6,
    },
    rememberme: {
      marginTop: 10,
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginLeft: 20,
      alignItems: 'center',
    },
    option: {
      flex: 1,
    },
    touchableOption: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionText: {
      ...fontStyles.normal,
      color: colors.text.default,
    },
    selectedCircle: {
      width: 12,
      height: 12,
      borderRadius: 12 / 2,
      backgroundColor: colors.primary.default,
      opacity: 1,
      margin: 2,
      marginRight: 6,
    },
    rememberCheckbox: {
      height: 20,
      width: 20,
    },
    rememberText: { paddingLeft: 10 },
  });

/**
 * Account access approval component
 */
class AccountApproval extends PureComponent {
  static propTypes = {
    /**
     * Object containing current page title, url, and icon href
     */
    currentPageInformation: PropTypes.object,
    /**
     * Callback triggered on account access approval
     */
    onConfirm: PropTypes.func,
    /**
     * Callback triggered on account access rejection
     */
    onCancel: PropTypes.func,
    /**
     * A string that represents the selected address
     */
    selectedAddress: PropTypes.string,
    /**
     * Number of tokens
     */
    tokensLength: PropTypes.number,
    /**
     * Action that shows the SDK feedback modal
     */
    showSDKFeedbackModal: PropTypes.func,
    /**
     * Number of accounts
     */
    accountsLength: PropTypes.number,
    /**
     * A string representing the network name
     */
    networkType: PropTypes.string,
    /**
     * Whether it was a request coming through wallet connect
     */
    walletConnectRequest: PropTypes.bool,
    /**
     * A string representing the network chainId
     */
    chainId: PropTypes.string,
  };

  state = {
    start: Date.now(),
    confirmDisabled: true,
    noPersist: false,
    otpChoice: undefined,
    otps: shuffle(this.props.currentPageInformation.otps || []),
    otp:
      this.props.currentPageInformation.origin ===
        AppConstants.DEEPLINKS.ORIGIN_QR_CODE &&
      this.props.currentPageInformation.reconnect &&
      this.props.currentPageInformation.apiVersion,
  };

  getAnalyticsParams = () => {
    try {
      const {
        currentPageInformation,
        chainId,
        selectedAddress,
        accountsLength,
      } = this.props;
      const url = new URL(currentPageInformation?.url);
      return {
        account_type: getAddressAccountType(selectedAddress),
        dapp_host_name: url?.host,
        dapp_url: currentPageInformation?.url,
        chain_id: chainId,
        number_of_accounts: accountsLength,
        number_of_accounts_connected: 1,
        source: 'SDK / WalletConnect',
        ...currentPageInformation?.analytics,
      };
    } catch (error) {
      return {};
    }
  };

  componentDidMount = () => {
    InteractionManager.runAfterInteractions(() => {
      trackEvent(
        MetaMetricsEvents.CONNECT_REQUEST_STARTED,
        this.getAnalyticsParams(),
      );
    });
  };

  showWalletConnectNotification = (confirmation = false) => {
    if (this.props.walletConnectRequest) {
      const title = this.props.currentPageInformation.title;
      InteractionManager.runAfterInteractions(() => {
        NotificationManager.showSimpleNotification({
          status: `simple_notification${!confirmation ? '_rejected' : ''}`,
          duration: 5000,
          title: confirmation
            ? strings('notifications.wc_connected_title', { title })
            : strings('notifications.wc_connected_rejected_title'),
          description: strings('notifications.wc_description'),
        });
      });
    }
  };

  /**
   * Calls onConfirm callback and analytics to track connect confirmed event
   */
  onConfirm = () => {
    if (
      this.state.otp &&
      this.state.otpChoice !== this.props.currentPageInformation.otps[0]
    ) {
      SDKConnect.getInstance().removeChannel(
        this.props.currentPageInformation.channelId,
        true,
      );
      setTimeout(() => {
        // Adds delay otherwise, the modal sometime doesn't display correctly on ios.
        this.props.showSDKFeedbackModal();
      }, 500);

      this.props.onCancel();
      return;
    }

    if (this.state.noPersist) {
      SDKConnect.getInstance().invalidateChannel(
        this.props.currentPageInformation.channelId,
      );
    }

    this.props.onConfirm();
    trackEvent(
      MetaMetricsEvents.CONNECT_REQUEST_COMPLETED,
      this.getAnalyticsParams(),
    );
    this.showWalletConnectNotification(true);
  };

  /**
   * Calls onConfirm callback and analytics to track connect canceled event
   */
  onCancel = () => {
    trackEvent(
      MetaMetricsEvents.CONNECT_REQUEST_CANCELLED,
      this.getAnalyticsParams(),
    );

    if (this.props.currentPageInformation.channelId) {
      SDKConnect.getInstance().removeChannel(
        this.props.currentPageInformation.channelId,
        true,
      );
    }

    this.props.onCancel();
    this.showWalletConnectNotification();
  };

  /**
   * Returns corresponding tracking params to send
   *
   * @return {object} - Object containing numberOfTokens, numberOfAccounts, network and timeOpen
   */
  getTrackingParams = () => {
    const {
      tokensLength,
      accountsLength,
      networkType,
      currentPageInformation: { url },
    } = this.props;
    return {
      view: url,
      numberOfTokens: tokensLength,
      numberOfAccounts: accountsLength,
      network: networkType,
      timeOpen: (Date.now() - this.state.start) / 1000,
    };
  };

  onOTP = (value) => {
    this.setState({
      ...this.state,
      otpChoice: value,
      confirmDisabled: false,
    });
  };

  render = () => {
    const { currentPageInformation, selectedAddress } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    // const hasRememberMe =
    //   !currentPageInformation.reconnect &&
    //   this.props.currentPageInformation.origin ===
    //     AppConstants.DEEPLINKS.ORIGIN_QR_CODE;

    return (
      <View style={styles.root} testID={ACCOUNT_APROVAL_MODAL_CONTAINER_ID}>
        <TransactionHeader currentPageInformation={currentPageInformation} />
        {currentPageInformation.reconnect ? (
          <>
            <Text style={styles.intro_reconnect}>
              {this.state.otp
                ? strings('accountApproval.action_reconnect')
                : strings('accountApproval.action_reconnect_deeplink')}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.intro}>
              {strings('accountApproval.action')}
            </Text>
            <Text style={styles.warning}>
              {strings('accountApproval.warning')}
            </Text>
          </>
        )}
        <View style={styles.accountCardWrapper}>
          <AccountInfoCard fromAddress={selectedAddress} />
        </View>
        {this.state.otp && (
          <View style={styles.otpContainer}>
            <View style={styles.otpRoot}>
              {this.state.otps.map((otpValue, index) => (
                <View style={styles.option} key={`otp${index}`}>
                  <TouchableOpacity
                    style={styles.touchableOption}
                    onPress={() => this.onOTP(otpValue)}
                  >
                    <View
                      style={
                        this.state.otpChoice === otpValue
                          ? styles.selectedCircle
                          : styles.circle
                      }
                    />
                    <Text style={styles.optionText}>{otpValue}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
        {/* TODO fully decide if keep / remove DO NOT REMEMBER checkbox */}
        {/* {hasRememberMe && (
          <View style={styles.rememberme}>
            <CheckBox
              style={styles.rememberCheckbox}
              value={this.state.noPersist}
              onValueChange={(checked) => {
                this.setState({ ...this.state, noPersist: checked });
              }}
              boxType={'square'}
              tintColors={{
                true: colors.primary.default,
                false: colors.border.default,
              }}
              testID={'skip-backup-check'}
            />
            <Text style={styles.rememberText}>
              {strings('accountApproval.donot_rememberme')}
            </Text>
          </View>
        )} */}
        <View style={styles.actionContainer}>
          <StyledButton
            type={'cancel'}
            onPress={this.onCancel}
            containerStyle={[styles.button, styles.cancel]}
            testID={CANCEL_BUTTON_ID}
          >
            {currentPageInformation.reconnect
              ? strings('accountApproval.disconnect')
              : strings('accountApproval.cancel')}
          </StyledButton>
          <StyledButton
            disabled={this.state.otp && this.state.confirmDisabled}
            type={'confirm'}
            onPress={this.onConfirm}
            containerStyle={[styles.button, styles.confirm]}
            testID={'connect-approve-button'}
          >
            {currentPageInformation.reconnect
              ? strings('accountApproval.resume')
              : strings('accountApproval.connect')}
          </StyledButton>
        </View>
      </View>
    );
  };
}

const mapDispatchToProps = (dispatch) => ({
  showSDKFeedbackModal: () => dispatch(toggleSDKFeedbackModal(true)),
});

const mapStateToProps = (state) => ({
  accountsLength: Object.keys(
    state.engine.backgroundState.AccountTrackerController.accounts || {},
  ).length,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  tokensLength: state.engine.backgroundState.TokensController.tokens.length,
  networkType: selectProviderType(state),
  chainId: selectChainId(state),
});

AccountApproval.contextType = ThemeContext;

export default connect(mapStateToProps, mapDispatchToProps)(AccountApproval);
