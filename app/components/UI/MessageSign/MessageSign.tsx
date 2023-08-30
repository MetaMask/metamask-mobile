import React, { PureComponent } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { fontStyles } from '../../../styles/common';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  addSignatureErrorListener,
  getAnalyticsParams,
  handleSignatureAction,
  removeSignatureErrorListener,
} from '../../../util/confirmation/signatureUtils';
import { MessageParams, PageMeta } from '../SignatureRequest/types';
import { Colors } from '../../../util/theme/models';
import { getAdditionalMetricsParams } from 'app/util/blockaid';
import { SecurityAlertResponse } from '../BlockaidBanner/BlockaidBanner.types';

interface MessageSignProps {
  /**
   * react-navigation object used for switching between screens
   */
  navigation: any;
  /**
   * Callback triggered when this message signature is rejected
   */
  onReject: () => void;
  /**
   * Callback triggered when this message signature is approved
   */
  onConfirm: () => void;
  /**
   * Message to be displayed to the user
   */
  messageParams: MessageParams;
  /**
   * Object containing current page title and url
   */
  currentPageInformation: PageMeta;
  /**
   * Hides or shows the expanded signing message
   */
  toggleExpandedMessage: () => void;
  /**
   * Indicated whether or not the expanded message is shown
   */
  showExpandedMessage: boolean;
}

interface MessageSignState {
  truncateMessage: boolean;
}

const createStyles = (colors: Colors) =>
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
class MessageSign extends PureComponent<MessageSignProps, MessageSignState> {
  static contextType = ThemeContext;

  state: MessageSignState = {
    truncateMessage: false,
  };

  componentDidMount = () => {
    const {
      messageParams: { metamaskId, securityAlertResponse },
    } = this.props;

    const additionalParams = getAdditionalMetricsParams(securityAlertResponse as SecurityAlertResponse);
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGN_REQUEST_STARTED, // TODO: Add blockaid metrics here
      { ...getAnalyticsParams(), ...additionalParams },
    );
    addSignatureErrorListener(metamaskId, this.onSignatureError);
  };

  componentWillUnmount = () => {
    const {
      messageParams: { metamaskId },
    } = this.props;
    removeSignatureErrorListener(metamaskId, this.onSignatureError);
  };

  onSignatureError = ({ error }: any) => {
    if (error?.message.startsWith(KEYSTONE_TX_CANCELED)) {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
        getAnalyticsParams(),
      );
    }
  };

  rejectSignature = async () => {
    const { messageParams, onReject } = this.props;
    await handleSignatureAction(onReject, messageParams, 'eth', false);
  };

  confirmSignature = async () => {
    const { messageParams, onConfirm } = this.props;
    await handleSignatureAction(onConfirm, messageParams, 'eth', true);
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

  shouldTruncateMessage = (e: any) => {
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
      messageParams: { from, securityAlertResponse },
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
        onReject={this.rejectSignature}
        onConfirm={this.confirmSignature}
        currentPageInformation={currentPageInformation}
        truncateMessage={this.state.truncateMessage}
        showExpandedMessage={showExpandedMessage}
        toggleExpandedMessage={toggleExpandedMessage}
        type="ethSign"
        showWarning
        fromAddress={from}
        securityAlertResponse={securityAlertResponse}
        testID={'eth-signature-request'}
      >
        <View style={styles.messageWrapper}>{this.renderMessageText()}</View>
      </SignatureRequest>
    );
    return rootView;
  }
}

export default MessageSign;
