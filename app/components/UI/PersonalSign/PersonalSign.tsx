import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, InteractionManager } from 'react-native';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import { hexToText } from '@metamask/controller-utils';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import { getAddressAccountType } from '../../../util/address';
import sanitizeString from '../../../util/string';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { useTheme } from '../../../util/theme';
import { PersonalSignProps } from './types';
import { useNavigation } from '@react-navigation/native';
import createStyles from './styles';
import AppConstants from '../../../core/AppConstants';

/**
 * Component that supports personal_sign
 */
const PersonalSign = ({
  onCancel,
  onConfirm,
  messageParams,
  currentPageInformation,
  toggleExpandedMessage,
  showExpandedMessage,
}: PersonalSignProps) => {
  const navigation = useNavigation();
  const [truncateMessage, setTruncateMessage] = useState<boolean>(false);

  const { colors }: any = useTheme();
  const styles = createStyles(colors);

  interface AnalyticsParams {
    account_type?: string;
    dapp_host_name?: string;
    dapp_url?: string;
    chain_id?: string;
    sign_type?: string;
    [key: string]: string | undefined;
  }

  const getAnalyticsParams = useCallback((): AnalyticsParams => {
    try {
      const { NetworkController }: any = Engine.context;
      const { chainId } = NetworkController?.state?.providerConfig || {};
      const url = new URL(currentPageInformation?.url);

      return {
        account_type: getAddressAccountType(messageParams.from),
        dapp_host_name: url?.host,
        dapp_url: currentPageInformation?.url,
        chain_id: chainId,
        sign_type: 'personal',
        ...currentPageInformation?.analytics,
      };
    } catch (error) {
      return {};
    }
  }, [currentPageInformation, messageParams]);

  useEffect(() => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGN_REQUEST_STARTED,
      getAnalyticsParams(),
    );
  }, [getAnalyticsParams]);

  const showWalletConnectNotification = (confirmation = false) => {
    InteractionManager.runAfterInteractions(() => {
      messageParams.origin &&
        (messageParams.origin.startsWith(WALLET_CONNECT_ORIGIN) ||
          messageParams.origin.startsWith(
            AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
          )) &&
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

  const signMessage = async () => {
    const { SignatureController }: any = Engine.context;
    await SignatureController.signPersonalMessage(messageParams);
    showWalletConnectNotification(true);
  };

  const rejectMessage = async () => {
    const { SignatureController }: any = Engine.context;
    await SignatureController.cancelPersonalMessage(messageParams.metamaskId);
    showWalletConnectNotification(false);
  };

  const cancelSignature = async () => {
    await rejectMessage();
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGN_REQUEST_CANCELLED,
      getAnalyticsParams(),
    );
    onCancel();
  };

  const confirmSignature = async () => {
    try {
      await signMessage();
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.SIGN_REQUEST_COMPLETED,
        getAnalyticsParams(),
      );
      onConfirm();
    } catch (e: any) {
      if (e?.message.startsWith(KEYSTONE_TX_CANCELED)) {
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
          getAnalyticsParams(),
        );
        onCancel();
      }
    }
  };

  const shouldTruncateMessage = (e: any) => {
    if (e.nativeEvent.lines.length > 5) {
      setTruncateMessage(true);
      return;
    }
    setTruncateMessage(false);
  };

  const renderMessageText = () => {
    const textChild = sanitizeString(hexToText(messageParams.data))
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
          onTextLayout={shouldTruncateMessage}
        >
          {textChild}
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
      onCancel={cancelSignature}
      onConfirm={confirmSignature}
      currentPageInformation={currentPageInformation}
      showExpandedMessage={showExpandedMessage}
      toggleExpandedMessage={toggleExpandedMessage}
      truncateMessage={truncateMessage}
      type="personalSign"
      fromAddress={messageParams.from}
      testID={'personal-signature-request'}
    >
      <View style={styles.messageWrapper}>{renderMessageText()}</View>
    </SignatureRequest>
  );
  return rootView;
};

export default PersonalSign;
