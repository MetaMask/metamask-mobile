import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, InteractionManager } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import Device from '../../../util/device';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import URL from 'url-parse';
import { getAddressAccountType } from '../../../util/address';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { ThemeContext, mockTheme } from '../../../util/theme';
import sanitizeString from '../../../util/string';
import AppConstants from '../../../core/AppConstants';

const createStyles = (colors) =>
  StyleSheet.create({
    messageText: {
      color: colors.text.default,
      ...fontStyles.normal,
      fontFamily: Device.isIos() ? 'Courier' : 'Roboto',
    },
    message: {
      marginLeft: 10,
    },
    truncatedMessageWrapper: {
      marginBottom: 4,
      overflow: 'hidden',
    },
    iosHeight: {
      height: 70,
    },
    androidHeight: {
      height: 97,
    },
    msgKey: {
      ...fontStyles.bold,
    },
  });

/**
 * Component that supports eth_signTypedData and eth_signTypedData_v3
 */
class TypedSign extends PureComponent {
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
     * Typed message to be displayed to the user
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
      const { currentPageInformation, messageParams } = this.props;
      const { NetworkController } = Engine.context;
      const { chainId } = NetworkController?.state?.providerConfig || {};
      const url = new URL(currentPageInformation?.url);
      return {
        account_type: getAddressAccountType(messageParams.from),
        dapp_host_name: url?.host,
        dapp_url: currentPageInformation?.url,
        chain_id: chainId,
        sign_type: 'typed',
        version: messageParams?.version,
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

  walletConnectNotificationTitle = (confirmation, isError) => {
    if (isError) return strings('notifications.wc_signed_failed_title');
    return confirmation
      ? strings('notifications.wc_signed_title')
      : strings('notifications.wc_signed_rejected_title');
  };

  showWalletConnectNotification = (
    messageParams = {},
    confirmation = false,
    isError = false,
  ) => {
    InteractionManager.runAfterInteractions(() => {
      messageParams.origin &&
        (messageParams.origin.startsWith(WALLET_CONNECT_ORIGIN) ||
          messageParams.origin.startsWith(
            AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
          )) &&
        NotificationManager.showSimpleNotification({
          status: `simple_notification${!confirmation ? '_rejected' : ''}`,
          duration: 5000,
          title: this.walletConnectNotificationTitle(confirmation, isError),
          description: strings('notifications.wc_description'),
        });
    });
  };

  signMessage = async () => {
    const { messageParams } = this.props;
    const { SignatureController } = Engine.context;
    try {
      await SignatureController.signTypedMessage(messageParams, {
        parseJsonData: false,
      });
      this.showWalletConnectNotification(messageParams, true);
    } catch (error) {
      this.showWalletConnectNotification(messageParams, false, true);
    }
  };

  rejectMessage = async () => {
    const { messageParams } = this.props;
    const { SignatureController } = Engine.context;
    const messageId = messageParams.metamaskId;
    await SignatureController.cancelTypedMessage(messageId);
    this.showWalletConnectNotification(messageParams);
  };

  cancelSignature = async () => {
    await this.rejectMessage();
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

  shouldTruncateMessage = (e) => {
    if (
      (Device.isIos() && e.nativeEvent.layout.height > 70) ||
      (Device.isAndroid() && e.nativeEvent.layout.height > 100)
    ) {
      this.setState({ truncateMessage: true });
      return;
    }
    this.setState({ truncateMessage: false });
  };

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return createStyles(colors);
  };

  renderTypedMessageV3 = (obj) => {
    const styles = this.getStyles();

    return Object.keys(obj).map((key) => (
      <View style={styles.message} key={key}>
        {obj[key] && typeof obj[key] === 'object' ? (
          <View>
            <Text style={[styles.messageText, styles.msgKey]}>
              {sanitizeString(key)}:
            </Text>
            <View>{this.renderTypedMessageV3(obj[key])}</View>
          </View>
        ) : (
          <Text style={styles.messageText}>
            <Text style={styles.msgKey}>{sanitizeString(key)}:</Text>{' '}
            {sanitizeString(`${obj[key]}`)}
          </Text>
        )}
      </View>
    ));
  };

  renderTypedMessage = () => {
    const { messageParams } = this.props;
    const styles = this.getStyles();

    if (messageParams.version === 'V1') {
      return (
        <View style={styles.message}>
          {messageParams.data.map((obj, i) => (
            <View key={`${obj.name}_${i}`}>
              <Text style={[styles.messageText, styles.msgKey]}>
                {sanitizeString(obj.name)}:
              </Text>
              <Text style={styles.messageText} key={obj.name}>
                {sanitizeString(` ${obj.value}`)}
              </Text>
            </View>
          ))}
        </View>
      );
    }
    if (messageParams.version === 'V3' || messageParams.version === 'V4') {
      const { message } = JSON.parse(messageParams.data);
      return this.renderTypedMessageV3(message);
    }
  };

  render() {
    const {
      messageParams,
      currentPageInformation,
      showExpandedMessage,
      toggleExpandedMessage,
      messageParams: { from },
    } = this.props;
    const { truncateMessage } = this.state;
    const messageWrapperStyles = [];
    let domain;
    const styles = this.getStyles();

    if (messageParams.version === 'V3') {
      domain = JSON.parse(messageParams.data).domain;
    }
    if (truncateMessage) {
      messageWrapperStyles.push(styles.truncatedMessageWrapper);
      if (Device.isIos()) {
        messageWrapperStyles.push(styles.iosHeight);
      } else {
        messageWrapperStyles.push(styles.androidHeight);
      }
    }

    const rootView = showExpandedMessage ? (
      <ExpandedMessage
        currentPageInformation={currentPageInformation}
        renderMessage={this.renderTypedMessage}
        toggleExpandedMessage={toggleExpandedMessage}
      />
    ) : (
      <SignatureRequest
        navigation={this.props.navigation}
        onCancel={this.cancelSignature}
        onConfirm={this.confirmSignature}
        toggleExpandedMessage={toggleExpandedMessage}
        domain={domain}
        currentPageInformation={currentPageInformation}
        truncateMessage={truncateMessage}
        type="typedSign"
        fromAddress={from}
        testID={'typed-signature-request'}
      >
        <View
          style={messageWrapperStyles}
          onLayout={truncateMessage ? null : this.shouldTruncateMessage}
        >
          {this.renderTypedMessage()}
        </View>
      </SignatureRequest>
    );
    return rootView;
  }
}

TypedSign.contextType = ThemeContext;

export default TypedSign;
