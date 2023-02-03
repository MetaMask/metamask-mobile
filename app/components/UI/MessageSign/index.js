import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, InteractionManager } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import URL from 'url-parse';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import { getAddressAccountType } from '../../../util/address';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { MM_SDK_REMOTE_ORIGIN } from '../../../core/SDKConnect';

const createStyles = (colors) =>
  StyleSheet.create({
    expandedMessage: {
      textAlign: 'center',
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.default,
    },
    messageText: {
      color: colors.text.default,
    },
    messageWrapper: {
      marginBottom: 4,
    },
  });

/**
 * Component that supports eth_sign
 */
class MessageSign extends PureComponent {
  static propTypes = {
    /**
     * react-navigation object used for switching between screens
     */
    navigation: PropTypes.object,
    /**
     * Callback triggered when this message signature is rejected
     */
    onCancel: PropTypes.func,
    /**
     * Callback triggered when this message signature is approved
     */
    onConfirm: PropTypes.func,
    /**
     * Personal message to be displayed to the user
     */
    messageParams: PropTypes.object,
    /**
     * Object containing current page title and url
     */
    currentPageInformation: PropTypes.object,
    /**
     * Hides or shows the expanded signing message
     */
    toggleExpandedMessage: PropTypes.func,
    /**
     * Indicated whether or not the expanded message is shown
     */
    showExpandedMessage: PropTypes.bool,
  };

  state = {
    truncateMessage: false,
  };

  getAnalyticsParams = () => {
    try {
      const {
        currentPageInformation,
        messageParams: { from },
      } = this.props;
      const { NetworkController } = Engine.context;
      const { chainId } = NetworkController?.state?.provider || {};
      const url = new URL(currentPageInformation?.url);
      return {
        account_type: getAddressAccountType(from),
        dapp_host_name: url?.host,
        dapp_url: currentPageInformation?.url,
        chain_id: chainId,
        sign_type: 'eth',
        ...currentPageInformation?.analytics,
      };
    } catch (error) {
      return {};
    }
  };

  componentDidMount = () => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGN_REQUEST_STARTED,
      this.getAnalyticsParams(),
    );
  };

  showWalletConnectNotification = (
    messageParams = {},
    confirmation = false,
  ) => {
    InteractionManager.runAfterInteractions(() => {
      messageParams.origin &&
        (messageParams.origin.startsWith(WALLET_CONNECT_ORIGIN) ||
          messageParams.origin.startsWith(MM_SDK_REMOTE_ORIGIN)) &&
        NotificationManager.showSimpleNotification({
          status: `simple_notification${!confirmation ? '_rejected' : ''}`,
          duration: 5000,
          title: confirmation
            ? strings('notifications.wc_signed_title')
            : strings('notifications.wc_signed_rejected_title'),
          description: strings('notifications.wc_description'),
        });
    });
  };

  signMessage = async () => {
    const { messageParams } = this.props;
    const { KeyringController, MessageManager } = Engine.context;
    const messageId = messageParams.metamaskId;
    const cleanMessageParams = await MessageManager.approveMessage(
      messageParams,
    );
    const rawSig = await KeyringController.signMessage(cleanMessageParams);
    MessageManager.setMessageStatusSigned(messageId, rawSig);
    this.showWalletConnectNotification(messageParams, true);
  };

  rejectMessage = () => {
    const { messageParams } = this.props;
    const { MessageManager } = Engine.context;
    const messageId = messageParams.metamaskId;
    MessageManager.rejectMessage(messageId);
    this.showWalletConnectNotification(messageParams);
  };

  cancelSignature = () => {
    this.rejectMessage();
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGN_REQUEST_CANCELLED,
      this.getAnalyticsParams(),
    );
    this.props.onCancel();
  };

  confirmSignature = async () => {
    try {
      await this.signMessage();
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.SIGN_REQUEST_COMPLETED,
        this.getAnalyticsParams(),
      );
      this.props.onConfirm();
    } catch (e) {
      if (e?.message.startsWith(KEYSTONE_TX_CANCELED)) {
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
          this.getAnalyticsParams(),
        );
        this.props.onCancel();
      }
    }
  };

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return createStyles(colors);
  };

  renderMessageText = () => {
    const { messageParams, showExpandedMessage } = this.props;
    const { truncateMessage } = this.state;
    const styles = this.getStyles();

    let messageText;
    if (showExpandedMessage) {
      messageText = (
        <Text style={styles.expandedMessage}>{messageParams.data}</Text>
      );
    } else {
      messageText = truncateMessage ? (
        <Text
          style={styles.messageText}
          numberOfLines={5}
          ellipsizeMode={'tail'}
        >
          {messageParams.data}
        </Text>
      ) : (
        <Text
          style={styles.messageText}
          onTextLayout={this.shouldTruncateMessage}
        >
          {messageParams.data}
        </Text>
      );
    }
    return messageText;
  };

  shouldTruncateMessage = (e) => {
    if (e.nativeEvent.lines.length > 5) {
      this.setState({ truncateMessage: true });
      return;
    }
    this.setState({ truncateMessage: false });
  };

  render() {
    const {
      currentPageInformation,
      navigation,
      showExpandedMessage,
      toggleExpandedMessage,
      messageParams: { from },
    } = this.props;
    const styles = this.getStyles();

    const rootView = showExpandedMessage ? (
      <ExpandedMessage
        currentPageInformation={currentPageInformation}
        renderMessage={this.renderMessageText}
        toggleExpandedMessage={toggleExpandedMessage}
      />
    ) : (
      <SignatureRequest
        navigation={navigation}
        onCancel={this.cancelSignature}
        onConfirm={this.confirmSignature}
        currentPageInformation={currentPageInformation}
        truncateMessage={this.state.truncateMessage}
        showExpandedMessage={showExpandedMessage}
        toggleExpandedMessage={toggleExpandedMessage}
        type="ethSign"
        showWarning
        fromAddress={from}
      >
        <View style={styles.messageWrapper}>{this.renderMessageText()}</View>
      </SignatureRequest>
    );
    return rootView;
  }
}

MessageSign.contextType = ThemeContext;

export default MessageSign;
