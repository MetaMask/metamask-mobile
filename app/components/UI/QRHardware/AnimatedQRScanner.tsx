/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  SafeAreaView,
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  Code,
} from 'react-native-vision-camera';
import { fontStyles } from '../../../styles/common';
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

const FRAME_SIZE = 250;
const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.6)';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modal: {
      margin: 0,
    },
    container: {
      flex: 1,
      backgroundColor: theme.brandColors.black,
    },
    preview: {
      flex: 1,
    },
    innerView: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    closeButtonContainer: {
      position: 'absolute',
      top: 0,
      right: 0,
      zIndex: 10,
    },
    closeIcon: {
      marginTop: 10,
      marginRight: 20,
    },
    // Overlay layout using flexbox to center the frame
    overlayColumn: {
      flex: 1,
      flexDirection: 'column',
    },
    // Top overlay section
    topOverlay: {
      flex: 1,
      backgroundColor: OVERLAY_COLOR,
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: 20,
    },
    // Middle row containing left overlay, frame, right overlay
    middleRow: {
      flexDirection: 'row',
      height: FRAME_SIZE,
    },
    // Side overlays
    sideOverlay: {
      flex: 1,
      backgroundColor: OVERLAY_COLOR,
    },
    // Frame container (transparent area)
    frameContainer: {
      width: FRAME_SIZE,
      height: FRAME_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frame: {
      width: FRAME_SIZE,
      height: FRAME_SIZE,
    },
    // Bottom overlay section
    bottomOverlay: {
      flex: 1,
      backgroundColor: OVERLAY_COLOR,
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: 20,
    },
    hintText: {
      maxWidth: '80%',
      color: theme.brandColors.white,
      textAlign: 'center',
      fontSize: 16,
      ...fontStyles.normal,
    },
    bold: {
      ...fontStyles.bold,
    },
    scanningText: {
      fontSize: 17,
      color: theme.brandColors.white,
      textAlign: 'center',
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

  const hintText = useMemo(
    () => (
      <Text style={styles.hintText}>
        {strings('connect_qr_hardware.hint_text')}
      </Text>
    ),
    [styles],
  );

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
            {/* Overlay layout - outside SafeAreaView to extend to screen edges */}
            <View style={styles.innerView}>
              <View style={styles.overlayColumn}>
                {/* Top overlay with hint text */}
                <View style={styles.topOverlay}>
                  <SafeAreaView>{hintText}</SafeAreaView>
                </View>

                {/* Middle row: left overlay, frame, right overlay */}
                <View style={styles.middleRow}>
                  <View style={styles.sideOverlay} />
                  <View style={styles.frameContainer}>
                    <Image source={frameImage} style={styles.frame} />
                  </View>
                  <View style={styles.sideOverlay} />
                </View>

                {/* Bottom overlay with scanning text */}
                <View style={styles.bottomOverlay}>
                  <SafeAreaView>
                    <Text style={styles.scanningText}>{`${strings(
                      'qr_scanner.scanning',
                    )} ${progress ? `${progress.toString()}%` : ''}`}</Text>
                  </SafeAreaView>
                </View>
              </View>
            </View>
            {/* Close button - inside SafeAreaView for proper positioning */}
            <SafeAreaView style={styles.closeButtonContainer}>
              <TouchableOpacity style={styles.closeIcon} onPress={hideModal}>
                <Icon name={IconName.Close} size={IconSize.Xl} />
              </TouchableOpacity>
            </SafeAreaView>
          </>
        ) : (
          <View style={styles.innerView}>
            <SafeAreaView style={styles.closeButtonContainer}>
              <TouchableOpacity style={styles.closeIcon} onPress={hideModal}>
                <Icon name={IconName.Close} size={IconSize.Xl} />
              </TouchableOpacity>
            </SafeAreaView>
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
