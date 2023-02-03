import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import StyledButton from '../StyledButton';
import { StyleSheet, Text, View, InteractionManager } from 'react-native';
import TransactionHeader from '../TransactionHeader';
import AccountInfoCard from '../AccountInfoCard';
import { strings } from '../../../../locales/i18n';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';
import NotificationManager from '../../../core/NotificationManager';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import URL from 'url-parse';
import { getAddressAccountType } from '../../../util/address';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  ACCOUNT_APROVAL_MODAL_CONTAINER_ID,
  CANCEL_BUTTON_ID,
} from '../../../constants/test-ids';

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
        source: 'SDK / WalletConnect',
        ...currentPageInformation?.analytics,
      };
    } catch (error) {
      return {};
    }
  };

  componentDidMount = () => {
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
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
    this.props.onConfirm();
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.CONNECT_REQUEST_COMPLETED,
      this.getAnalyticsParams(),
    );
    this.showWalletConnectNotification(true);
  };

  /**
   * Calls onConfirm callback and analytics to track connect canceled event
   */
  onCancel = () => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.CONNECT_REQUEST_CANCELLED,
      this.getAnalyticsParams(),
    );

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

  render = () => {
    const { currentPageInformation, selectedAddress } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.root} testID={ACCOUNT_APROVAL_MODAL_CONTAINER_ID}>
        <TransactionHeader currentPageInformation={currentPageInformation} />
        <Text style={styles.intro}>{strings('accountApproval.action')}</Text>
        <Text style={styles.warning}>{strings('accountApproval.warning')}</Text>
        <View style={styles.accountCardWrapper}>
          <AccountInfoCard fromAddress={selectedAddress} />
        </View>
        <View style={styles.actionContainer}>
          <StyledButton
            type={'cancel'}
            onPress={this.onCancel}
            containerStyle={[styles.button, styles.cancel]}
            testID={CANCEL_BUTTON_ID}
          >
            {strings('accountApproval.cancel')}
          </StyledButton>
          <StyledButton
            type={'confirm'}
            onPress={this.onConfirm}
            containerStyle={[styles.button, styles.confirm]}
            testID={'connect-approve-button'}
          >
            {strings('accountApproval.connect')}
          </StyledButton>
        </View>
      </View>
    );
  };
}

const mapStateToProps = (state) => ({
  accountsLength: Object.keys(
    state.engine.backgroundState.AccountTrackerController.accounts || {},
  ).length,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  tokensLength: state.engine.backgroundState.TokensController.tokens.length,
  networkType: state.engine.backgroundState.NetworkController.provider.type,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
});

AccountApproval.contextType = ThemeContext;

export default connect(mapStateToProps)(AccountApproval);
