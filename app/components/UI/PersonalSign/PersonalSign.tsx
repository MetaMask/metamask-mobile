import React, { useState } from 'react';
import { StyleSheet, View, Text, InteractionManager } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import { hexToText } from '@metamask/controller-utils';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import { getAddressAccountType } from '../../../util/address';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { MM_SDK_REMOTE_ORIGIN } from '../../../core/SDKConnect';
import { useTheme } from '../../../util/theme';
import { PersonalSignProps } from './types';
import { useNavigation } from '@react-navigation/native';

const createStyles = (colors: any) =>
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

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );

  const getAnalyticsParams = () => {
    try {
      const { NetworkController }: any = Engine.context;
      const { chainId } = NetworkController?.state?.provider || {};
      const url = new URL(currentPageInformation?.url);

      return {
        account_type: getAddressAccountType(selectedAddress),
        dapp_host_name: url?.host,
        dapp_url: currentPageInformation?.url,
        chain_id: chainId,
        sign_type: 'personal',
        ...currentPageInformation?.analytics,
      };
    } catch (error) {
      return {};
    }
  };

  const showWalletConnectNotification = (
    messageParams = {
      origin: '',
      data: '',
      from: '',
      metamaskId: '',
    },
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

  const signMessage = async () => {
    const { KeyringController, PersonalMessageManager }: any = Engine.context;
    const messageId = messageParams.metamaskId;
    const cleanMessageParams = await PersonalMessageManager.approveMessage(
      messageParams,
    );
    const rawSig = await KeyringController.signPersonalMessage(
      cleanMessageParams,
    );
    PersonalMessageManager.setMessageStatusSigned(messageId, rawSig);
    showWalletConnectNotification(messageParams, true);
  };

  const rejectMessage = () => {
    const { PersonalMessageManager }: any = Engine.context;
    const messageId = messageParams.metamaskId;
    PersonalMessageManager.rejectMessage(messageId);
    showWalletConnectNotification(messageParams);
  };

  const cancelSignature = () => {
    rejectMessage();
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

  const getStyles = () => {
    const { colors }: any = useTheme();
    return createStyles(colors);
  };

  const renderMessageText = () => {
    const styles = getStyles();

    const textChild = hexToText(messageParams.data)
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

  const shouldTruncateMessage = (e: any) => {
    if (e.nativeEvent.lines.length > 5) {
      setTruncateMessage(true);
      return;
    }
    setTruncateMessage(false);
  };

  const styles = getStyles();

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
    >
      <View style={styles.messageWrapper}>{renderMessageText()}</View>
    </SignatureRequest>
  );
  return rootView;
};

export default PersonalSign;
