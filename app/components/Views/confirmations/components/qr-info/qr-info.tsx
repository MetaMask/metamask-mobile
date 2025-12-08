import React, { useCallback, useEffect, useState } from 'react';
import { View, Linking, TouchableOpacity } from 'react-native';
import { UR } from '@ngraveio/bc-ur';
import { stringify as uuidStringify } from 'uuid';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import Text from '../../../../../component-library/components/Texts/Text';
import AnimatedQRCode from '../../../../UI/QRHardware/AnimatedQRCode';
import AnimatedQRScannerModal from '../../../../UI/QRHardware/AnimatedQRScanner';
import Alert, { AlertType } from '../../../../Base/Alert';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useStyles } from '../../../../hooks/useStyles';
import { useHardwareWalletSigningContext } from '../../context/hardware-wallet-signing-context';
import { ConfirmationInfoComponentIDs } from '../../constants/info-ids';
import styleSheet from './qr-info.styles';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';

const QRInfo = () => {
  const {
    pendingRequest: pendingScanRequest,
    error: cameraError,
    modalVisible: scannerVisible,
    markRequestCompleted,
    closeSignModal,
  } = useHardwareWalletSigningContext();
  const { createEventBuilder, trackEvent } = useMetrics();
  const { styles } = useStyles(styleSheet, {});
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [shouldPause, setShouldPause] = useState(false);

  useEffect(() => {
    if (scannerVisible) {
      setErrorMessage(undefined);
    }
  }, [scannerVisible, setErrorMessage]);

  const onScanSuccess = useCallback(
    (ur: UR) => {
      closeSignModal();
      const signature = ETHSignature.fromCBOR(ur.cbor);
      const buffer = signature.getRequestId();
      if (buffer) {
        const requestId = uuidStringify(buffer);
        if (pendingScanRequest?.request?.requestId === requestId) {
          Engine.getQrKeyringScanner().resolvePendingScan({
            type: ur.type,
            cbor: ur.cbor.toString('hex'),
          });
          markRequestCompleted();
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
      pendingScanRequest?.request?.requestId,
      createEventBuilder,
      markRequestCompleted,
      closeSignModal,
      trackEvent,
    ],
  );

  const onScanError = useCallback(
    (errorMsg: string) => {
      closeSignModal();
      setErrorMessage(errorMsg);
    },
    [closeSignModal],
  );

  return (
    <View testID={ConfirmationInfoComponentIDs.QR_INFO}>
      {pendingScanRequest?.type === QrScanRequestType.SIGN &&
        pendingScanRequest?.request && (
          <View style={styles.container}>
            <TouchableOpacity>
              {/* todo: to be replaced by alert system */}
              {errorMessage && (
                <Alert
                  type={AlertType.Error}
                  onPress={() => setErrorMessage(undefined)}
                  style={styles.alert}
                >
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </Alert>
              )}
              {cameraError && (
                <Alert
                  type={AlertType.Error}
                  style={styles.alert}
                  onPress={Linking.openSettings}
                >
                  <Text style={styles.errorText}>{cameraError}</Text>
                </Alert>
              )}
              <View style={styles.title}>
                <Text style={styles.titleText}>
                  {strings('confirm.qr_scan_text')}
                </Text>
              </View>
              <AnimatedQRCode
                cbor={pendingScanRequest.request.payload.cbor}
                type={pendingScanRequest.request.payload.type}
                shouldPause={scannerVisible || shouldPause}
              />
            </TouchableOpacity>
          </View>
        )}
      <AnimatedQRScannerModal
        pauseQRCode={setShouldPause}
        visible={scannerVisible}
        purpose={QrScanRequestType.SIGN}
        onScanSuccess={onScanSuccess}
        onScanError={onScanError}
        hideModal={closeSignModal}
      />
    </View>
  );
};

export default QRInfo;
