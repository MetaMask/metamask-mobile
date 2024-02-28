import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import StyledButton from '../StyledButton';
import {
  View,
  InteractionManager,
  TouchableOpacity,
  Platform,
} from 'react-native';
import TransactionHeader from '../TransactionHeader';
import AccountInfoCard from '../AccountInfoCard';
import { strings } from '../../../../locales/i18n';
import Text from '../../../component-library/components/Texts/Text';
import NotificationManager from '../../../core/NotificationManager';

import { MetaMetricsEvents } from '../../../core/Analytics';

import URL from 'url-parse';
import { getAddressAccountType } from '../../../util/address';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  selectChainId,
  selectProviderType,
} from '../../../selectors/networkController';
import { selectTokensLength } from '../../../selectors/tokensController';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import { selectSelectedAddress } from '../../../selectors/preferencesController';
import AppConstants from '../../../../app/core/AppConstants';
import { shuffle } from 'lodash';
import SDKConnect from '../../../core/SDKConnect/SDKConnect';
import Routes from '../../../constants/navigation/Routes';
import CheckBox from '@react-native-community/checkbox';
import generateTestId from '../../../../wdio/utils/generateTestId';
import Engine from '../../../core/Engine';
import { prefixUrlWithProtocol } from '../../../util/browser';
import createStyles from './styles';
import ShowWarningBanner from './showWarningBanner';
import { ConnectAccountModalSelectorsIDs } from '../../../../e2e/selectors/Modals/ConnectAccountModal.selectors';
import { CommonSelectorsIDs } from '../../../../e2e/selectors/Common.selectors';
import { getDecimalChainId } from '../../../util/networks';
import { withMetricsAwareness } from '../../../components/hooks/useMetrics';

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
    /* navigation object required to access the props
    /* passed by the parent component
    */
    navigation: PropTypes.object,
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
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
  };

  state = {
    start: Date.now(),
    confirmDisabled: true,
    otpChoice: undefined,
    noPersist: false,
    otps: shuffle(this.props.currentPageInformation.otps || []),
    otp:
      this.props.currentPageInformation.origin ===
        AppConstants.DEEPLINKS.ORIGIN_QR_CODE &&
      this.props.currentPageInformation.reconnect &&
      this.props.currentPageInformation.apiVersion,
    isUrlFlaggedAsPhishing: false,
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
        chain_id: getDecimalChainId(chainId),
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
    const { currentPageInformation } = this.props;

    const prefixedUrl = prefixUrlWithProtocol(currentPageInformation?.url);
    const { hostname } = new URL(prefixedUrl);
    this.checkUrlFlaggedAsPhishing(hostname);

    this.props.metrics.trackEvent(
      MetaMetricsEvents.CONNECT_REQUEST_STARTED,
      this.getAnalyticsParams(),
    );
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
      // onConfirm will close current window by rejecting current approvalRequest.
      this.props.onCancel();

      this.props.metrics.trackEvent(
        MetaMetricsEvents.CONNECT_REQUEST_OTPFAILURE,
        this.getAnalyticsParams(),
      );

      // Navigate to feedback modal
      const { navigation } = this.props;
      navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SDK_FEEDBACK,
      });

      return;
    }

    if (this.state.noPersist) {
      SDKConnect.getInstance().invalidateChannel({
        channelId: this.props.currentPageInformation.channelId,
      });
    }

    this.props.onConfirm();
    this.props.metrics.trackEvent(
      MetaMetricsEvents.CONNECT_REQUEST_COMPLETED,
      this.getAnalyticsParams(),
    );
    this.showWalletConnectNotification(true);
  };

  /**
   * Calls onConfirm callback and analytics to track connect canceled event
   */
  onCancel = () => {
    this.props.metrics.trackEvent(
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
      otpChoice: value,
      confirmDisabled: false,
    });
  };

  checkUrlFlaggedAsPhishing = (hostname) => {
    const { PhishingController } = Engine.context;
    PhishingController.maybeUpdateState();
    const phishingControllerTestResult = PhishingController.test(hostname);

    this.setState({
      isUrlFlaggedAsPhishing: phishingControllerTestResult.result,
    });
  };

  render = () => {
    const { currentPageInformation, selectedAddress } = this.props;
    const { isUrlFlaggedAsPhishing } = this.state;
    const { colors, typography } = this.context || mockTheme;
    const styles = createStyles(colors, typography);
    const hasRememberMe =
      !currentPageInformation.reconnect &&
      this.props.currentPageInformation.origin ===
        AppConstants.DEEPLINKS.ORIGIN_QR_CODE;

    return (
      <View
        style={styles.root}
        {...generateTestId(Platform, ConnectAccountModalSelectorsIDs.CONTAINER)}
      >
        <TransactionHeader currentPageInformation={currentPageInformation} />

        {isUrlFlaggedAsPhishing && <ShowWarningBanner />}

        {!currentPageInformation.reconnect && (
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
        {currentPageInformation.reconnect && (
          <Text style={styles.intro_reconnect}>
            {this.state.otp
              ? strings('accountApproval.action_reconnect')
              : strings('accountApproval.action_reconnect_deeplink')}
          </Text>
        )}
        {this.state.otp && (
          <View style={styles.otpContainer}>
            {this.state.otps.map((otpValue, index) => (
              <TouchableOpacity
                key={`otp${index}`}
                style={[
                  styles.touchableOption,
                  this.state.otpChoice === otpValue && styles.selectedOption,
                ]}
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
            ))}
          </View>
        )}
        {hasRememberMe && (
          <View style={styles.rememberme}>
            <CheckBox
              style={styles.rememberCheckbox}
              value={this.state.noPersist}
              onValueChange={(checked) => {
                this.setState({ noPersist: checked });
              }}
              boxType={'square'}
              tintColors={{
                true: colors.primary.default,
                false: colors.border.default,
              }}
            />
            <Text style={styles.rememberText}>
              {strings('accountApproval.donot_rememberme')}
            </Text>
          </View>
        )}
        <View style={styles.actionContainer}>
          <StyledButton
            type={'cancel'}
            onPress={this.onCancel}
            containerStyle={[styles.button, styles.cancel]}
            testID={CommonSelectorsIDs.CANCEL_BUTTON}
          >
            {currentPageInformation.reconnect
              ? strings('accountApproval.disconnect')
              : strings('accountApproval.cancel')}
          </StyledButton>
          <StyledButton
            disabled={this.state.otp && this.state.confirmDisabled}
            type={'confirm'}
            onPress={this.onConfirm}
            containerStyle={[
              styles.button,
              styles.confirm,
              isUrlFlaggedAsPhishing && styles.warningButton,
            ]}
            testID={CommonSelectorsIDs.CONNECT_BUTTON}
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

const mapStateToProps = (state) => ({
  accountsLength: selectAccountsLength(state),
  tokensLength: selectTokensLength(state),
  selectedAddress: selectSelectedAddress(state),
  networkType: selectProviderType(state),
  chainId: selectChainId(state),
});

AccountApproval.contextType = ThemeContext;

export default connect(mapStateToProps)(withMetricsAwareness(AccountApproval));
