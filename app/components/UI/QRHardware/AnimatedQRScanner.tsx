/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  AppState,
  AppStateStatus,
  Image,
  Linking,
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
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { URRegistryDecoder } from '@keystonehq/ur-decoder';
import Modal from 'react-native-modal';
import { UR } from '@ngraveio/bc-ur';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import { useTheme } from '../../../util/theme';
import { Theme } from '../../../util/theme/models';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { withQrKeyring } from '../../../core/QrKeyring/QrKeyring';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import { HardwareWalletError } from '@metamask/hw-wallet-sdk';
import {
  createQRHardwareScanError,
  getQRHardwareScanErrorTitle,
  isQRHardwareScanError,
  QRHardwareScanErrorType,
} from '../../../core/HardwareWallet/errors';

/**
 * Builds {@link MetaMetricsEvents.HARDWARE_WALLET_ERROR} properties for QR hardware flows.
 *
 * - `error_category` — set for decode / scan pipeline failures (not for native camera errors).
 * - `received_ur_type` — only when `error_category` is `wrong_ur_type` (decoded UR type mismatch).
 * - `is_ur_format` — whether the scanned payload (trimmed) starts with `ur:` (case-insensitive).
 */
function buildQrHardwareWalletErrorAnalyticsProperties(options: {
  error: string;
  error_category?: QRHardwareScanErrorType;
  is_ur_format: boolean;
  received_ur_type?: string;
}): Record<string, unknown> {
  const { error, error_category, is_ur_format, received_ur_type } = options;
  const payload: Record<string, unknown> = {
    error,
    is_ur_format,
  };
  if (error_category !== undefined) {
    payload.error_category = error_category;
  }
  if (error_category === QRHardwareScanErrorType.WrongURType) {
    payload.received_ur_type = received_ur_type ?? '';
  }
  return payload;
}

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
      paddingHorizontal: 24,
    },
    openSettingsButton: {
      marginTop: 24,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 40,
      borderWidth: 1,
      borderColor: theme.brandColors.white,
    },
    openSettingsText: {
      color: theme.brandColors.white,
      fontSize: 16,
      textAlign: 'center',
      ...fontStyles.normal,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    errorTitle: {
      color: theme.brandColors.white,
      fontSize: 28,
      lineHeight: 36,
      textAlign: 'center',
      marginBottom: 16,
      ...fontStyles.bold,
    },
    errorBody: {
      color: theme.brandColors.white,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      ...fontStyles.normal,
    },
    errorFooter: {
      marginTop: 32,
      gap: 12,
    },
    errorButton: {
      minHeight: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    errorButtonPrimary: {
      backgroundColor: theme.brandColors.white,
    },
    errorButtonSecondary: {
      borderWidth: 1,
      borderColor: theme.brandColors.white,
    },
    errorButtonPrimaryText: {
      color: theme.brandColors.black,
      fontSize: 16,
      ...fontStyles.bold,
    },
    errorButtonSecondaryText: {
      color: theme.brandColors.white,
      fontSize: 16,
      ...fontStyles.bold,
    },
  });

const frameImage = require('../../../images/frame.png'); // eslint-disable-line import-x/no-commonjs
const QR_HARDWARE_LEARN_MORE_URL =
  'https://support.metamask.io/more-web3/wallets/hardware-wallet-hub/#qr-codean-gapped-wallets';

interface AnimatedQRScannerProps {
  visible: boolean;
  purpose: QrScanRequestType;
  onScanSuccess: (ur: UR) => void;
  onScanError: (error: string) => void;
  onQRHardwareScanError?: (error: HardwareWalletError) => void;
  hideModal: () => void;
  pauseQRCode?: (x: boolean) => void;
  onModalHideComplete?: () => void;
}

const AnimatedQRScannerModal = (props: AnimatedQRScannerProps) => {
  const {
    visible,
    onScanError,
    onQRHardwareScanError,
    purpose,
    onScanSuccess,
    hideModal,
    pauseQRCode,
    onModalHideComplete,
  } = props;

  const [urDecoder, setURDecoder] = useState(new URRegistryDecoder());
  const [progress, setProgress] = useState(0);
  const [scanError, setScanError] = useState<HardwareWalletError | null>(null);

  const onQRHardwareScanErrorRef = useRef(onQRHardwareScanError);
  onQRHardwareScanErrorRef.current = onQRHardwareScanError;
  const theme = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const styles = createStyles(theme);

  const cameraDevice = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const appState = useRef(AppState.currentState);

  let expectedURTypes: string[];
  if (purpose === QrScanRequestType.PAIR) {
    expectedURTypes = [
      SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
      SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT,
    ];
  } else {
    expectedURTypes = [SUPPORTED_UR_TYPE.ETH_SIGNATURE];
  }

  const refreshCameraPermission = useCallback(() => {
    if (!visible || hasPermission) {
      return;
    }

    requestPermission();
  }, [hasPermission, requestPermission, visible]);

  useEffect(() => {
    refreshCameraPermission();
  }, [refreshCameraPermission]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        const hasReturnedToForeground =
          /inactive|background/.test(appState.current) &&
          nextAppState === 'active';

        appState.current = nextAppState;

        if (hasReturnedToForeground) {
          refreshCameraPermission();
        }
      },
    );

    return () => {
      subscription?.remove?.();
    };
  }, [refreshCameraPermission, visible]);

  const resetDecoder = useCallback(() => {
    setURDecoder(new URRegistryDecoder());
    setProgress(0);
  }, []);

  const reset = useCallback(() => {
    resetDecoder();
    setScanError(null);
  }, [resetDecoder]);

  // Helper to send analytics with device name
  const sendErrorAnalytics = useCallback(
    async (properties: Record<string, unknown>) => {
      try {
        const deviceName = await withQrKeyring(async ({ keyring }) =>
          keyring.getName(),
        );
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
            .addProperties({
              ...properties,
              device_model: deviceName,
              device_type: HardwareDeviceTypes.QR,
            })
            .build(),
        );
      } catch (e) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
            .addProperties({
              ...properties,
              device_model: 'Unknown',
              device_type: HardwareDeviceTypes.QR,
            })
            .build(),
        );
      }
    },
    [trackEvent, createEventBuilder],
  );

  useEffect(() => {
    if (scanError && onQRHardwareScanErrorRef.current) {
      const errorCallback = onQRHardwareScanErrorRef.current;
      setScanError(null);
      errorCallback(scanError);
    }
  }, [scanError]);

  const onError = useCallback(
    async (error: Error) => {
      if (onScanError && error) {
        sendErrorAnalytics(
          buildQrHardwareWalletErrorAnalyticsProperties({
            error: error.message,
            is_ur_format: false,
          }),
        );
        onScanError(error.message);
      }
    },
    [onScanError, sendErrorAnalytics],
  );

  const showScannerError = useCallback(
    async (error: HardwareWalletError) => {
      resetDecoder();

      if (!isQRHardwareScanError(error)) {
        return;
      }

      const metadata = error.metadata as {
        qrHardwareScanErrorType: QRHardwareScanErrorType;
        receivedUrType?: string;
        isUrFormat: boolean;
      };

      const errorCallback = onQRHardwareScanErrorRef.current;
      if (errorCallback) {
        errorCallback(error);
      } else {
        setScanError(error);
      }

      sendErrorAnalytics(
        buildQrHardwareWalletErrorAnalyticsProperties({
          error: error.message,
          error_category: metadata.qrHardwareScanErrorType,
          is_ur_format: metadata.isUrFormat,
          received_ur_type: metadata.receivedUrType,
        }),
      ).catch(() => undefined);
    },
    [resetDecoder, sendErrorAnalytics],
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
      const content = response.data.trim();
      const isUrFormat = content.toLowerCase().startsWith('ur:');

      try {
        if (!isUrFormat) {
          await showScannerError(
            createQRHardwareScanError({
              errorType: QRHardwareScanErrorType.NonURQrScanned,
              purpose,
              technicalMessage: 'Scanned QR code is not in UR format',
              isUrFormat: false,
            }),
          );
          return;
        }

        urDecoder.receivePart(content);
        setProgress(Math.ceil(urDecoder.getProgress() * 100));

        if (urDecoder.isError()) {
          await showScannerError(
            createQRHardwareScanError({
              errorType: QRHardwareScanErrorType.URDecodeError,
              purpose,
              technicalMessage: urDecoder.resultError(),
              isUrFormat: true,
            }),
          );
        } else if (urDecoder.isSuccess()) {
          const ur = urDecoder.resultUR();
          if (expectedURTypes.includes(ur.type)) {
            onScanSuccess(ur);
            setProgress(0);
            setURDecoder(new URRegistryDecoder());
          } else {
            await showScannerError(
              createQRHardwareScanError({
                errorType: QRHardwareScanErrorType.WrongURType,
                purpose,
                technicalMessage:
                  purpose === QrScanRequestType.PAIR
                    ? 'Received UR type is not valid for pairing flow'
                    : 'Received UR type is not valid for signing flow',
                receivedUrType: ur.type,
                isUrFormat: true,
              }),
            );
          }
        }
      } catch (e) {
        await showScannerError(
          createQRHardwareScanError({
            errorType: QRHardwareScanErrorType.ScanException,
            purpose,
            technicalMessage: e instanceof Error ? e.message : String(e),
            isUrFormat,
          }),
        );
      }
    },
    [
      visible,
      urDecoder,
      expectedURTypes,
      purpose,
      onScanSuccess,
      showScannerError,
    ],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: onBarCodeRead,
  });

  const hintText = useMemo(
    () => (
      <Text style={styles.overlayText}>
        {strings(
          purpose === QrScanRequestType.PAIR
            ? 'connect_qr_hardware.hint_text_pair'
            : 'connect_qr_hardware.hint_text_sign',
        )}
      </Text>
    ),
    [purpose, styles],
  );

  const errorTitle = useMemo(() => {
    if (scanError && isQRHardwareScanError(scanError)) {
      return getQRHardwareScanErrorTitle(scanError);
    }

    return null;
  }, [scanError]);

  const handleLearnMore = useCallback(() => {
    Linking.openURL(QR_HARDWARE_LEARN_MORE_URL);
  }, []);

  const handleTryAgain = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <Modal
      isVisible={visible}
      style={styles.modal}
      coverScreen
      statusBarTranslucent
      onModalHide={() => {
        reset();
        pauseQRCode?.(false);
        onModalHideComplete?.();
      }}
      onModalWillShow={() => pauseQRCode?.(true)}
    >
      <View style={styles.container}>
        {cameraDevice && hasPermission ? (
          <>
            {!scanError ? (
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
                    {hintText}
                    <View style={styles.overlay} />
                    <Image source={frameImage} style={styles.frame} />
                    <View style={styles.overlay} />
                  </View>

                  <View style={styles.overlay}>
                    {progress > 0 && (
                      <Text style={styles.scanningText}>{`${strings(
                        'qr_scanner.scanning',
                      )} ${progress ? `${progress.toString()}%` : ''}`}</Text>
                    )}
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.innerView}>
                <View style={styles.errorContainer}>
                  {errorTitle ? (
                    <Text style={styles.errorTitle}>{errorTitle}</Text>
                  ) : null}
                  {scanError.userMessage ? (
                    <Text style={styles.errorBody}>
                      {scanError.userMessage}
                    </Text>
                  ) : null}
                  <View style={styles.errorFooter}>
                    <TouchableOpacity
                      style={[styles.errorButton, styles.errorButtonSecondary]}
                      onPress={handleLearnMore}
                      testID="qr-scanner-error-learn-more-button"
                    >
                      <Text style={styles.errorButtonSecondaryText}>
                        {strings('hardware_wallet.common.learn_more')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.errorButton, styles.errorButtonPrimary]}
                      onPress={handleTryAgain}
                      testID="qr-scanner-error-try-again-button"
                    >
                      <Text style={styles.errorButtonPrimaryText}>
                        {strings('hardware_wallet.common.try_again')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
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
              <TouchableOpacity
                style={styles.openSettingsButton}
                onPress={() => Linking.openSettings()}
                testID="open-settings-button"
              >
                <Text style={styles.openSettingsText}>
                  {strings('qr_scanner.open_settings')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default AnimatedQRScannerModal;
