import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import { fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import { util } from '@metamask/controllers';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import URL from 'url-parse';
import AnalyticsV2 from '../../../util/analyticsV2';
import { getAddressAccountType } from '../../../util/address';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { ThemeContext, mockTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    messageText: {
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
      textAlign: 'center',
    },
    messageTextColor: {
      color: colors.text.default,
    },
    textLeft: {
      textAlign: 'left',
    },
    messageWrapper: {
      marginBottom: 4,
    },
  });

/**
 * Component that supports personal_sign
 */
class PersonalSign extends PureComponent {
  static propTypes = {
    /**
     * A string that represents the selected address
     */
    selectedAddress: PropTypes.string,
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
      const { currentPageInformation, selectedAddress } = this.props;
      const { NetworkController } = Engine.context;
      const { chainId, type } = NetworkController?.state?.provider || {};
      const url = new URL(currentPageInformation?.url);

      return {
        account_type: getAddressAccountType(selectedAddress),
        dapp_host_name: url?.host,
        dapp_url: currentPageInformation?.url,
        network_name: type,
        chain_id: chainId,
        sign_type: 'personal',
      };
    } catch (error) {
      return {};
    }
  };

  componentDidMount = () => {
    AnalyticsV2.trackEvent(
      AnalyticsV2.ANALYTICS_EVENTS.SIGN_REQUEST_STARTED,
      this.getAnalyticsParams(),
    );
  };

  showWalletConnectNotification = (
    messageParams = {},
    confirmation = false,
  ) => {
    InteractionManager.runAfterInteractions(() => {
      messageParams.origin &&
        messageParams.origin.includes(WALLET_CONNECT_ORIGIN) &&
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
    const { KeyringController, PersonalMessageManager } = Engine.context;
    const messageId = messageParams.metamaskId;
    const cleanMessageParams = await PersonalMessageManager.approveMessage(
      messageParams,
    );
    const rawSig = await KeyringController.signPersonalMessage(
      cleanMessageParams,
    );
    PersonalMessageManager.setMessageStatusSigned(messageId, rawSig);
    this.showWalletConnectNotification(messageParams, true);
  };

  rejectMessage = () => {
    const { messageParams } = this.props;
    const { PersonalMessageManager } = Engine.context;
    const messageId = messageParams.metamaskId;
    PersonalMessageManager.rejectMessage(messageId);
    this.showWalletConnectNotification(messageParams);
  };

  cancelSignature = () => {
    this.rejectMessage();
    AnalyticsV2.trackEvent(
      AnalyticsV2.ANALYTICS_EVENTS.SIGN_REQUEST_CANCELLED,
      this.getAnalyticsParams(),
    );
    this.props.onCancel();
  };

  confirmSignature = async () => {
    try {
      await this.signMessage();
      AnalyticsV2.trackEvent(
        AnalyticsV2.ANALYTICS_EVENTS.SIGN_REQUEST_COMPLETED,
        this.getAnalyticsParams(),
      );
      this.props.onConfirm();
    } catch (e) {
      if (e?.message.startsWith(KEYSTONE_TX_CANCELED)) {
        AnalyticsV2.trackEvent(
          AnalyticsV2.ANALYTICS_EVENTS.QR_HARDWARE_TRANSACTION_CANCELED,
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

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return createStyles(colors);
  };

  renderMessageText = () => {
    const { messageParams, showExpandedMessage } = this.props;
    const { truncateMessage } = this.state;
    const styles = this.getStyles();

    const textChild = util
      .hexToText(messageParams.data)
      .split('\n')
      .map((line, i) => (
        <Text
          key={`txt_${i}`}
          style={[
            styles.messageText,
            !showExpandedMessage ? styles.textLeft : null,
          ]}
        >
          {line}
          {!showExpandedMessage && '\n'}
        </Text>
      ));
    let messageText;
    if (showExpandedMessage) {
      messageText = textChild;
    } else {
      messageText = truncateMessage ? (
        <Text
          style={styles.messageTextColor}
          numberOfLines={5}
          ellipsizeMode={'tail'}
        >
          {textChild}
        </Text>
      ) : (
        <Text
          style={styles.messageTextColor}
          onTextLayout={this.shouldTruncateMessage}
        >
          {textChild}
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
      toggleExpandedMessage,
      showExpandedMessage,
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
        navigation={this.props.navigation}
        onCancel={this.cancelSignature}
        onConfirm={this.confirmSignature}
        currentPageInformation={currentPageInformation}
        showExpandedMessage={showExpandedMessage}
        toggleExpandedMessage={toggleExpandedMessage}
        truncateMessage={this.state.truncateMessage}
        type="personalSign"
      >
        <View style={styles.messageWrapper}>{this.renderMessageText()}</View>
      </SignatureRequest>
    );
    return rootView;
  }
}

PersonalSign.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
});

export default connect(mapStateToProps)(PersonalSign);
