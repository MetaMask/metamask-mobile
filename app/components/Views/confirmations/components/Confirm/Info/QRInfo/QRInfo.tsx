import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { View, Linking, TouchableOpacity } from 'react-native';
import { UR } from '@ngraveio/bc-ur';
import { stringify as uuidStringify } from 'uuid';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';

import { strings } from '../../../../../../../../locales/i18n';
import Engine from '../../../../../../../core/Engine';
import Text from '../../../../../../../component-library/components/Texts/Text';
import AnimatedQRCode from '../../../../../../UI/QRHardware/AnimatedQRCode';
import AnimatedQRScannerModal from '../../../../../../UI/QRHardware/AnimatedQRScanner';
import Alert, { AlertType } from '../../../../../../Base/Alert';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../../../hooks/useMetrics';
import { useStyles } from '../../../../../../hooks/useStyles';
import { useQRHardwareContext } from '../../../../context/QRHardwareContext';
import styleSheet from './QRInfo.styles';

const QRInfo = () => {
  const {
    QRState,
    cameraError,
    scannerVisible,
    setRequestCompleted,
    setScannerVisible,
  } = useQRHardwareContext();
  const { createEventBuilder, trackEvent } = useMetrics();
  const { styles } = useStyles(styleSheet, {});
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [shouldPause, setShouldPause] = useState(false);

  const KeyringController = Engine.context.KeyringController;

  useEffect(() => {
    if (scannerVisible) {
      setErrorMessage(undefined);
    }
  }, [scannerVisible, setErrorMessage]);

  const onScanSuccess = useCallback(
    (ur: UR) => {
      setScannerVisible(false);
      const signature = ETHSignature.fromCBOR(ur.cbor);
      const buffer = signature.getRequestId();
      if (buffer) {
        const requestId = uuidStringify(buffer);
        if (QRState?.sign?.request?.requestId === requestId) {
          KeyringController.submitQRSignature(
            QRState.sign.request?.requestId as string,
            ur.cbor.toString('hex'),
          );
          setRequestCompleted();
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
      QRState?.sign?.request?.requestId,
      createEventBuilder,
      setRequestCompleted,
      setScannerVisible,
      KeyringController,
      trackEvent,
    ],
  );

  const onScanError = useCallback(
    (errorMsg: string) => {
      setScannerVisible(false);
      setErrorMessage(errorMsg);
    },
    [setScannerVisible],
  );

  return (
    <Fragment>
      {QRState?.sign?.request && (
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
              cbor={QRState.sign.request.payload.cbor}
              type={QRState.sign.request.payload.type}
              shouldPause={scannerVisible || shouldPause}
            />
          </TouchableOpacity>
        </View>
      )}
      <AnimatedQRScannerModal
        pauseQRCode={setShouldPause}
        visible={scannerVisible}
        purpose={'sign'}
        onScanSuccess={onScanSuccess}
        onScanError={onScanError}
        hideModal={() => setScannerVisible(false)}
      />
    </Fragment>
  );
};

export default QRInfo;
