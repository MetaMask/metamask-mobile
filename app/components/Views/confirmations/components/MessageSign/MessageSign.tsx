import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { StyleSheet, View, Text } from 'react-native';
import { fontStyles } from '../../../../../styles/common';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import { KEYSTONE_TX_CANCELED } from '../../../../../constants/error';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useTheme } from '../../../../../util/theme';
import {
  getAnalyticsParams,
  handleSignatureAction,
} from '../../../../../util/confirmation/signatureUtils';
import { MessageParams, PageMeta } from '../SignatureRequest/types';
import { Colors } from '../../../../../util/theme/models';
import { isExternalHardwareAccount } from '../../../../../util/address';
import createExternalSignModelNav from '../../../../../util/hardwareWallet/signatureUtils';
import { SigningModalSelectorsIDs } from '../../../../../../e2e/selectors/Modals/SigningModal.selectors';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../../core/Engine';
import { useMetrics } from '../../../../../components/hooks/useMetrics';

interface MessageSignProps {
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
const MessageSign = ({
  onConfirm,
  onReject,
  messageParams,
  currentPageInformation,
  toggleExpandedMessage,
  showExpandedMessage,
}: MessageSignProps) => {
  const navigation = useNavigation();
  const { trackEvent } = useMetrics();
  const [truncateMessage, setTruncateMessage] = useState<boolean>(false);
  const { securityAlertResponse } = useSelector(
    (reduxState: any) => reduxState.signatureRequest,
  );

  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    trackEvent(
      MetaMetricsEvents.SIGNATURE_REQUESTED,
      getAnalyticsParams(messageParams, 'eth_sign'),
    );

    const onSignatureError = ({ error }: any) => {
      if (error?.message.startsWith(KEYSTONE_TX_CANCELED)) {
        trackEvent(
          MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
          getAnalyticsParams(messageParams, 'eth_sign'),
        );
      }
    };

    Engine.context.SignatureController.hub.on(
      `${messageParams.metamaskId}:signError`,
      onSignatureError,
    );
    return () => {
      Engine.context.SignatureController.hub.removeListener(
        `${messageParams.metamaskId}:signError`,
        onSignatureError,
      );
    };
  }, [messageParams, trackEvent]);

  const shouldTruncateMessage = (e: any) => {
    if (e.nativeEvent.lines.length > 5) {
      setTruncateMessage(true);
      return;
    }

    setTruncateMessage(false);
  };

  const rejectSignature = async () => {
    await handleSignatureAction(
      onReject,
      messageParams,
      'eth_sign',
      securityAlertResponse,
      false,
    );
  };

  const confirmSignature = async () => {
    if (!isExternalHardwareAccount(messageParams.from)) {
      await handleSignatureAction(
        onConfirm,
        messageParams,
        'eth_sign',
        securityAlertResponse,
        true,
      );
    } else {
      navigation.navigate(
        ...(await createExternalSignModelNav(
          onReject,
          onConfirm,
          messageParams,
          'eth_sign',
        )),
      );
    }
  };

  const renderMessageText = () => {
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
        <Text style={styles.messageText} onTextLayout={shouldTruncateMessage}>
          {messageParams.data}
        </Text>
      );
    }
    return messageText;
  };

  const rootView = showExpandedMessage ? (
    <ExpandedMessage
      currentPageInformation={currentPageInformation}
      renderMessage={renderMessageText}
      toggleExpandedMessage={toggleExpandedMessage}
    />
  ) : (
    <SignatureRequest
      navigation={navigation}
      onReject={rejectSignature}
      onConfirm={confirmSignature}
      currentPageInformation={currentPageInformation}
      truncateMessage={truncateMessage}
      showExpandedMessage={showExpandedMessage}
      toggleExpandedMessage={toggleExpandedMessage}
      type="eth_sign"
      showWarning
      fromAddress={messageParams.from}
      origin={messageParams.origin}
      testID={SigningModalSelectorsIDs.ETH_REQUEST}
    >
      <View style={styles.messageWrapper}>{renderMessageText()}</View>
    </SignatureRequest>
  );
  return rootView;
};

export default MessageSign;
