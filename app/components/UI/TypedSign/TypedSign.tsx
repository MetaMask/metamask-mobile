import React, { useState, useEffect, memo } from 'react';
import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import Device from '../../../util/device';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import createStyles from './styles';
import { useTheme } from '../../../util/theme';
import { SignatureProps } from '../../hooks/Signatures/useSignatureTypes';
import { useNavigation } from '@react-navigation/native';
import useMessage from '../../hooks/Signatures/useMessage';
import sanitizeString from '../../../util/string';
import { signatureAnalytics } from '../SignatureRequest/SignatureSharedState';

/**
 * Component that supports eth_signTypedData and eth_signTypedData_v3
 */

const TypedSign = ({
  onCancel,
  onConfirm,
  messageParams,
  currentPageInformation,
  toggleExpandedMessage,
  showExpandedMessage,
  messageParams: { from }
}: SignatureProps) => {
  const [rejectMessage, signMessage] = useMessage({
    messageParams,
    type: 'typed',
  });
  const navigation = useNavigation();
  const [truncateMessage, setTruncateMessage] = useState<boolean>(false);

  const { colors }: any = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGN_REQUEST_STARTED,
      signatureAnalytics({
        currentPageInformation,
        type: 'typed',
        messageParams,
      }),
    );
  }, [currentPageInformation, messageParams]);

  const cancelSignature = () => {
    rejectMessage();
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGN_REQUEST_CANCELLED,
      signatureAnalytics({
        currentPageInformation,
        type: 'typed',
        messageParams,
      }),
    );
    onCancel();
  };

  const confirmSignature = () => {
    try {
      signMessage();
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.SIGN_REQUEST_COMPLETED,
        signatureAnalytics({
          currentPageInformation,
          type: 'typed',
          messageParams,
        }),
      );
      onConfirm();
    } catch (e: any) {
      if (e?.message.startsWith(KEYSTONE_TX_CANCELED)) {
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
          signatureAnalytics({
            currentPageInformation,
            type: 'typed',
            messageParams,
          }),
        );
        onCancel();
      }
    }
  };

  const shouldTruncateMessage = (e: any) => {
    if (truncateMessage) return;
    if (
      (Device.isIos() && e.nativeEvent.layout.height > 70) ||
      (Device.isAndroid() && e.nativeEvent.layout.height > 100)
    ) {
      setTruncateMessage(true);
      return;
    }
    setTruncateMessage(false);
  };

  const renderTypedMessageV3 = (obj: { [t: string]: any }) =>
    Object.keys(obj).map((key) => (
      <View style={styles.message} key={key}>
        {obj[key] && typeof obj[key] === 'object' ? (
          <View>
            <Text style={[styles.messageText, styles.msgKey]}>{sanitizeString(key)}:</Text>
            <View>{renderTypedMessageV3(obj[key])}</View>
          </View>
        ) : (
          <Text style={styles.messageText}>
            <Text style={styles.msgKey}>{sanitizeString(key)}:</Text>{' '}
            {sanitizeString(`${obj[key]}`)}
          </Text>
        )}
      </View>
    ));

  const renderTypedMessage = () => {
    if (messageParams.version === 'V1') {
      return (
        <View style={styles.message}>
          {messageParams.data.map(
            (
              obj: { name: string | any; value: string | any },
              i: string | any,
            ) => (
              <View key={`${obj.name}_${i}`}>
                <Text style={[styles.messageText, styles.msgKey]}>
                {sanitizeString(obj.name)}:
                </Text>
                <Text style={styles.messageText} key={obj.name}>
                {sanitizeString(` ${obj.value}`)}
                </Text>
              </View>
            ),
          )}
        </View>
      );
    }
    if (messageParams.version === 'V3' || messageParams.version === 'V4') {
      const { message } = JSON.parse(messageParams.data);
      return renderTypedMessageV3(message);
    }
  };

  const messageWrapperStyles = [];
  let domain;

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
      renderMessage={renderTypedMessage}
      toggleExpandedMessage={toggleExpandedMessage}
    />
  ) : (
    <SignatureRequest
      navigation={navigation}
      onCancel={cancelSignature}
      onConfirm={confirmSignature}
      toggleExpandedMessage={toggleExpandedMessage}
      domain={domain}
      currentPageInformation={currentPageInformation}
      truncateMessage={truncateMessage}
      type="typedSign"
      fromAddress={from}
    >
      <View style={messageWrapperStyles} onLayout={shouldTruncateMessage}>
        {renderTypedMessage()}
      </View>
    </SignatureRequest>
  );
  return rootView;
};

export default memo(TypedSign);
