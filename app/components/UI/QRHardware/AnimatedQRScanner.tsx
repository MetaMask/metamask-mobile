/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import React, { useCallback, useState, useEffect } from 'react';
import { Image, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  Code,
} from 'react-native-vision-camera';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { URRegistryDecoder } from '@keystonehq/ur-decoder';
import Modal from 'react-native-modal';
import { UR } from '@ngraveio/bc-ur';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import { useTheme } from '../../../util/theme';
import { Theme } from '../../../util/theme/models';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { withQrKeyring } from '../../../core/QrKeyring/QrKeyring';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modal: {
      margin: 0,
    },
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '100%',
      backgroundColor: theme.brandColors.black,
    },
    preview: {
      flex: 1,
      width: '100%',
      height: '100%',
      position: 'absolute',
      zIndex: 0,
    },
    innerView: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    closeIcon: {
      position: 'absolute',
      top: 60,
      right: 20,
      zIndex: 10,
    },
    overlayContainerColumn: {
      display: 'flex',
      width: '100%',
      height: '100%',
      flexDirection: 'column',
      position: 'absolute',
      zIndex: 1,
    },
    overlayContainerRow: {
      display: 'flex',
      flexDirection: 'row',
    },
    overlay: {
      flex: 1,
      flexBasis: 0,
      backgroundColor: colors.overlay,
      flexDirection: 'column',
      display: 'flex',
    },
    frame: {
      width: 250,
      height: 250,
      alignSelf: 'center',
      justifyContent: 'center',
      margin: -4,
    },
    overlayText: {
      color: theme.brandColors.white,
      position: 'absolute',
      textAlign: 'center',
      textAlignVertical: 'bottom',
      paddingBottom: 28,
      width: '100%',
      top: -40,
      fontSize: 16,
      ...fontStyles.normal,
    },
    scanningText: {
      fontSize: 17,
      color: theme.brandColors.white,
      textAlign: 'center',
      marginTop: 20,
    },
    // For no camera permission state
    noCameraContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

const frameImage = require('../../../images/frame.png'); // eslint-disable-line import/no-commonjs

interface AnimatedQRScannerProps {
  visible: boolean;
  purpose: QrScanRequestType;
  onScanSuccess: (ur: UR) => void;
  onScanError: (error: string) => void;
  hideModal: () => void;
  pauseQRCode?: (x: boolean) => void;
}

const AnimatedQRScannerModal = (props: AnimatedQRScannerProps) => {
  const {
    visible,
    onScanError,
    purpose,
    onScanSuccess,
    hideModal,
    pauseQRCode,
  } = props;

  const [urDecoder, setURDecoder] = useState(new URRegistryDecoder());
  const [progress, setProgress] = useState(0);
  const theme = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(theme);

  const cameraDevice = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  let expectedURTypes: string[];
  if (purpose === QrScanRequestType.PAIR) {
    expectedURTypes = [
      SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
      SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT,
    ];
  } else {
    expectedURTypes = [SUPPORTED_UR_TYPE.ETH_SIGNATURE];
  }

  useEffect(() => {
    if (!hasPermission && visible) {
      requestPermission();
    }
  }, [hasPermission, requestPermission, visible]);

  const reset = useCallback(() => {
    setURDecoder(new URRegistryDecoder());
    setProgress(0);
  }, []);

  const onError = useCallback(
    async (error: Error) => {
      if (onScanError && error) {
        // Get device name asynchronously without blocking error handling
        withQrKeyring(({ keyring }) => Promise.resolve(keyring.getName()))
          .then((deviceName) => {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
                .addProperties({
                  error: error.message,
                  device_model: deviceName,
                  device_type: HardwareDeviceTypes.QR,
                })
                .build(),
            );
          })
          .catch(() => {
            // If getName fails, send analytics with 'Unknown'
            trackEvent(
              createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
                .addProperties({
                  error: error.message,
                  device_model: 'Unknown',
                  device_type: HardwareDeviceTypes.QR,
                })
                .build(),
            );
          });
        onScanError(error.message);
      }
    },
    [onScanError, trackEvent, createEventBuilder],
  );

  const onBarCodeRead = useCallback(
    async (codes: Code[]) => {
      if (!visible || !codes.length) {
        return;
      }
      const response = { data: codes[0].value };
      if (!response.data) {
        return;
      }

      try {
        const content = response.data;
        urDecoder.receivePart(content);
        setProgress(Math.ceil(urDecoder.getProgress() * 100));

        // Helper to send analytics with device name
        const sendAnalytics = (properties: Record<string, unknown>) => {
          withQrKeyring(({ keyring }) => Promise.resolve(keyring.getName()))
            .then((deviceName) => {
              trackEvent(
                createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
                  .addProperties({
                    ...properties,
                    device_model: deviceName,
                    device_type: HardwareDeviceTypes.QR,
                  })
                  .build(),
              );
            })
            .catch(() => {
              trackEvent(
                createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
                  .addProperties({
                    ...properties,
                    device_model: 'Unknown',
                    device_type: HardwareDeviceTypes.QR,
                  })
                  .build(),
              );
            });
        };

        if (urDecoder.isError()) {
          sendAnalytics({ error: urDecoder.resultError() });
          onScanError(strings('transaction.unknown_qr_code'));
        } else if (urDecoder.isSuccess()) {
          const ur = urDecoder.resultUR();
          if (expectedURTypes.includes(ur.type)) {
            onScanSuccess(ur);
            setProgress(0);
            setURDecoder(new URRegistryDecoder());
          } else if (purpose === QrScanRequestType.PAIR) {
            sendAnalytics({
              received_ur_type: ur.type,
              error: 'invalid `sync` qr code',
            });
            onScanError(strings('transaction.invalid_qr_code_sync'));
          } else {
            sendAnalytics({ error: 'invalid `sign` qr code' });
            onScanError(strings('transaction.invalid_qr_code_sign'));
          }
        }
      } catch (e) {
        withQrKeyring(({ keyring }) => Promise.resolve(keyring.getName()))
          .then((deviceName) => {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
                .addProperties({
                  error: strings('transaction.unknown_qr_code'),
                  device_model: deviceName,
                  device_type: HardwareDeviceTypes.QR,
                })
                .build(),
            );
          })
          .catch(() => {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
                .addProperties({
                  error: strings('transaction.unknown_qr_code'),
                  device_model: 'Unknown',
                  device_type: HardwareDeviceTypes.QR,
                })
                .build(),
            );
          });
        onScanError(strings('transaction.unknown_qr_code'));
      }
    },
    [
      visible,
      urDecoder,
      onScanError,
      expectedURTypes,
      purpose,
      onScanSuccess,
      trackEvent,
      createEventBuilder,
    ],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: onBarCodeRead,
  });

  // Handle camera permission error
  useEffect(() => {
    if (visible && !hasPermission) {
      onScanError(strings('transaction.no_camera_permission'));
    }
  }, [visible, hasPermission, onScanError]);

  return (
    <Modal
      isVisible={visible}
      style={styles.modal}
      coverScreen
      statusBarTranslucent
      onModalHide={() => {
        reset();
        pauseQRCode?.(false);
      }}
      onModalWillShow={() => pauseQRCode?.(true)}
    >
      <View style={styles.container}>
        {cameraDevice && hasPermission ? (
          <>
            <Camera
              style={styles.preview}
              device={cameraDevice}
              isActive={visible}
              codeScanner={codeScanner}
              torch="off"
              onError={onError}
            />
            {/* Overlay layout matching other QR scanner */}
            <View style={styles.overlayContainerColumn}>
              <View style={styles.overlay} />

              <View style={styles.overlayContainerRow}>
                <Text style={styles.overlayText}>
                  {strings('connect_qr_hardware.hint_text')}
                </Text>
                <View style={styles.overlay} />
                <Image source={frameImage} style={styles.frame} />
                <View style={styles.overlay} />
              </View>

              <View style={styles.overlay}>
                <Text style={styles.scanningText}>{`${strings(
                  'qr_scanner.scanning',
                )} ${progress ? `${progress.toString()}%` : ''}`}</Text>
              </View>
            </View>
            {/* Close button */}
            <TouchableOpacity style={styles.closeIcon} onPress={hideModal}>
              <Icon name={IconName.Close} size={IconSize.Xl} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.innerView}>
            <TouchableOpacity style={styles.closeIcon} onPress={hideModal}>
              <Icon name={IconName.Close} size={IconSize.Xl} />
            </TouchableOpacity>
            <View style={styles.noCameraContainer}>
              <Text style={styles.scanningText}>
                {strings('transaction.no_camera_permission')}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default AnimatedQRScannerModal;
