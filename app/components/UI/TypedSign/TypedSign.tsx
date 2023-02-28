import React, { useState, useEffect, memo, useCallback } from 'react';
import { View, Text } from 'react-native';
import SignatureRequest from '../SignatureRequest';
import ExpandedMessage from '../SignatureRequest/ExpandedMessage';
import Device from '../../../util/device';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import createStyles from './styles';
import { useTheme } from '../../../util/theme';
import { SignatureProps } from '../../hooks/Signatures/useSignatureAction.types';
import { useNavigation } from '@react-navigation/native';
import useSignatureAction from '../../hooks/Signatures/useSignatureAction';
import sanitizeString from '../../../util/string';
import { signatureAnalytics } from '../SignatureRequest/Util';
import { SignatureType, TYPED_VERSIONS } from '../../../constants/signature';

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
  messageParams: { from },
}: SignatureProps) => {
  const [rejectMessage, signMessage] = useSignatureAction({
    messageParams,
    type: SignatureType.TYPED,
  });
  const navigation = useNavigation();
  const [truncateMessage, setTruncateMessage] = useState<boolean>(false);

  const { colors }: any = useTheme();
  const styles = createStyles(colors);

  const signatureAnalyticsCallback = useCallback(
    () =>
      signatureAnalytics({
        currentPageInformation,
        type: SignatureType.TYPED,
        messageParams,
      }),
    [currentPageInformation, messageParams],
  );

  useEffect(() => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGN_REQUEST_STARTED,
      signatureAnalyticsCallback(),
    );
  }, [signatureAnalyticsCallback]);

  const cancelSignature = () => {
    rejectMessage();
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SIGN_REQUEST_CANCELLED,
      signatureAnalyticsCallback(),
    );
    onCancel();
  };

  const confirmSignature = () => {
    try {
      signMessage();
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.SIGN_REQUEST_COMPLETED,
        signatureAnalyticsCallback(),
      );
      onConfirm();
    } catch (e: any) {
      if (e?.message.startsWith(KEYSTONE_TX_CANCELED)) {
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
          signatureAnalyticsCallback(),
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
            <Text style={[styles.messageText, styles.msgKey]}>
              {sanitizeString(key)}:
            </Text>
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
    if (messageParams.version === TYPED_VERSIONS.V1) {
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
    if (
      messageParams.version === TYPED_VERSIONS.V3 ||
      messageParams.version === TYPED_VERSIONS.V4
    ) {
      const { message } = JSON.parse(messageParams.data);
      return renderTypedMessageV3(message);
    }
  };

  const messageWrapperStyles = [];
  let domain;

  if (messageParams.version === TYPED_VERSIONS.V3) {
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
