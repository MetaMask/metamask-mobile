import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { UR } from '@ngraveio/bc-ur';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import { stringify as uuidStringify } from 'uuid';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Alert, { AlertType } from '../../../../../components/Base/Alert';

import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { getHardwareWalletTypeName } from '../../../helpers';
import { ContentLayout } from './ContentLayout';
import QRSigningContext from '../../../contexts/QRSigningContext';
import Engine from '../../../../Engine';
import AnimatedQRCode from '../../../../../components/UI/QRHardware/AnimatedQRCode';
import AnimatedQRScannerModal from '../../../../../components/UI/QRHardware/AnimatedQRScanner';
import { MetaMetricsEvents } from '../../../../Analytics';
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';

export const AWAITING_CONFIRMATION_CONTENT_TEST_ID =
  'awaiting-confirmation-content';
export const AWAITING_CONFIRMATION_SPINNER_TEST_ID =
  'awaiting-confirmation-spinner';
export const AWAITING_CONFIRMATION_QR_CONTAINER_TEST_ID =
  'awaiting-confirmation-qr-container';
export const AWAITING_CONFIRMATION_QR_GET_SIGN_BUTTON_TEST_ID =
  'awaiting-confirmation-qr-get-sign-button';

const styles = StyleSheet.create({
  messageText: {
    textAlign: 'center',
  },
  spinnerContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  qrContainer: {
    alignItems: 'center',
    gap: 16,
  },
  qrTitle: {
    textAlign: 'center',
  },
  qrErrorText: {
    textAlign: 'center',
  },
  qrDescriptionContainer: {
    alignItems: 'center',
    gap: 4,
  },
  qrDescriptionText: {
    textAlign: 'center',
  },
});

export interface AwaitingConfirmationContentProps {
  /** The device type for context in messages */
  deviceType: HardwareWalletType;
  /** The type of operation awaiting confirmation (e.g., 'transaction', 'message') */
  operationType?: string;
  /** Optional callback when user wants to cancel/reject */
  onCancel?: () => void;
}

export const AwaitingConfirmationContent: React.FC<
  AwaitingConfirmationContentProps
> = ({ deviceType, operationType, onCancel }) => {
  const { colors } = useTheme();
  const { createEventBuilder, trackEvent } = useAnalytics();
  const deviceName = getHardwareWalletTypeName(deviceType);
  const qrSigningContext = useContext(QRSigningContext);
  const isQrFlow = deviceType === HardwareWalletType.Qr;
  const isSigningQRObject = qrSigningContext?.isSigningQRObject ?? false;
  const pendingScanRequest = qrSigningContext?.pendingScanRequest;
  const setRequestCompleted = qrSigningContext?.setRequestCompleted;
  const cancelQRScanRequestIfPresent =
    qrSigningContext?.cancelQRScanRequestIfPresent;

  const [scannerVisible, setScannerVisible] = useState(false);
  const [shouldPause, setShouldPause] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!isSigningQRObject) {
      setScannerVisible(false);
      setShouldPause(false);
      setErrorMessage(undefined);
    }
  }, [isSigningQRObject]);

  useEffect(() => {
    if (scannerVisible) {
      setErrorMessage(undefined);
    }
  }, [scannerVisible]);

  const onScanSuccess = useCallback(
    (ur: UR) => {
      setScannerVisible(false);

      const signature = ETHSignature.fromCBOR(ur.cbor);
      const buffer = signature.getRequestId();
      if (buffer) {
        const requestId = uuidStringify(buffer);
        if (pendingScanRequest?.request?.requestId === requestId) {
          Engine.getQrKeyringScanner().resolvePendingScan({
            type: ur.type,
            cbor: ur.cbor.toString('hex'),
          });
          setRequestCompleted?.();
          return;
        }
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
          .addProperties({
            error:
              'received signature request id is not matched with origin request',
          })
          .build(),
      );
      setErrorMessage(strings('transaction.mismatched_qr_request_id'));
    },
    [
      createEventBuilder,
      pendingScanRequest?.request?.requestId,
      setRequestCompleted,
      trackEvent,
    ],
  );

  const onScanError = useCallback((error: string) => {
    setScannerVisible(false);
    setErrorMessage(error);
  }, []);

  const onQrCancel = useCallback(async () => {
    setScannerVisible(false);
    try {
      await cancelQRScanRequestIfPresent?.();
    } catch {
      // Ignore cancel failures; onCancel still runs in `finally` (matches prior `.catch(() => undefined)`).
    } finally {
      onCancel?.();
    }
  }, [cancelQRScanRequestIfPresent, onCancel]);

  const onShowScanner = useCallback(() => {
    setScannerVisible(true);
  }, []);

  const title = useMemo(() => {
    switch (operationType) {
      case 'message':
        return strings('hardware_wallet.awaiting_confirmation.title_message', {
          device: deviceName,
        });
      case 'transaction':
      default:
        return strings(
          'hardware_wallet.awaiting_confirmation.title_transaction',
          { device: deviceName },
        );
    }
  }, [operationType, deviceName]);

  if (isQrFlow) {
    return (
      <>
        <ContentLayout
          testID={AWAITING_CONFIRMATION_CONTENT_TEST_ID}
          title={
            isSigningQRObject
              ? `${strings('transactions.sign_title_scan')}${strings(
                  'transactions.sign_title_device',
                )}`
              : strings('confirm.qr_scan_text')
          }
          body={
            isSigningQRObject && pendingScanRequest?.request ? (
              <View style={styles.qrContainer}>
                {errorMessage ? (
                  <Alert
                    type={AlertType.Error}
                    onPress={() => setErrorMessage(undefined)}
                  >
                    <Text
                      variant={TextVariant.BodyMD}
                      color={TextColor.Default}
                      style={styles.qrErrorText}
                    >
                      {errorMessage}
                    </Text>
                  </Alert>
                ) : null}
                <View testID={AWAITING_CONFIRMATION_QR_CONTAINER_TEST_ID}>
                  <AnimatedQRCode
                    cbor={pendingScanRequest.request.payload.cbor}
                    type={pendingScanRequest.request.payload.type}
                    shouldPause={scannerVisible || shouldPause}
                  />
                </View>
                <View style={styles.qrDescriptionContainer}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Default}
                    style={styles.qrDescriptionText}
                  >
                    {strings('transactions.sign_description_1')}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Default}
                    style={styles.qrDescriptionText}
                  >
                    {strings('transactions.sign_description_2')}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Default}
                  style={styles.messageText}
                >
                  {strings('transactions.sign_description_1')}
                </Text>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Default}
                  style={styles.messageText}
                >
                  {strings('transactions.sign_description_2')}
                </Text>
                <View style={styles.spinnerContainer}>
                  <ActivityIndicator
                    testID={AWAITING_CONFIRMATION_SPINNER_TEST_ID}
                    size="large"
                    color={colors.primary.default}
                  />
                </View>
              </>
            )
          }
          footer={
            <>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                label={strings('hardware_wallet.common.cancel')}
                width={ButtonWidthTypes.Full}
                onPress={onQrCancel}
              />
              {isSigningQRObject ? (
                <Button
                  testID={AWAITING_CONFIRMATION_QR_GET_SIGN_BUTTON_TEST_ID}
                  variant={ButtonVariants.Primary}
                  size={ButtonSize.Lg}
                  label={strings('confirm.qr_get_sign')}
                  width={ButtonWidthTypes.Full}
                  onPress={onShowScanner}
                />
              ) : null}
            </>
          }
        />
        <AnimatedQRScannerModal
          pauseQRCode={setShouldPause}
          visible={scannerVisible}
          purpose={QrScanRequestType.SIGN}
          onScanSuccess={onScanSuccess}
          onScanError={onScanError}
          hideModal={() => setScannerVisible(false)}
        />
      </>
    );
  }

  return (
    <ContentLayout
      testID={AWAITING_CONFIRMATION_CONTENT_TEST_ID}
      icon={
        <Icon
          name={IconName.SecurityTick}
          size={IconSize.Xl}
          color={IconColor.Primary}
        />
      }
      title={title}
      body={
        <>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={styles.messageText}
          >
            {strings('hardware_wallet.awaiting_confirmation.message', {
              device: deviceName,
            })}
          </Text>
          <View style={styles.spinnerContainer}>
            <ActivityIndicator
              testID={AWAITING_CONFIRMATION_SPINNER_TEST_ID}
              size="large"
              color={colors.primary.default}
            />
          </View>
        </>
      }
      footer={
        onCancel ? (
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            label={strings('hardware_wallet.common.cancel')}
            width={ButtonWidthTypes.Full}
            onPress={onCancel}
          />
        ) : undefined
      }
    />
  );
};
