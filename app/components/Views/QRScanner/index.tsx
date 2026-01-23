/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { parse } from 'eth-url-parser';
import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Alert, Image, InteractionManager, View, Linking } from 'react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
  Code,
} from 'react-native-vision-camera';
import { strings } from '../../../../locales/i18n';
import { PROTOCOLS } from '../../../constants/deeplinks';
import Routes from '../../../constants/navigation/Routes';
import {
  MM_SDK_DEEPLINK,
  MM_WALLETCONNECT_DEEPLINK,
} from '../../../constants/urls';
import AppConstants from '../../../core/AppConstants';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/DeeplinkManager';
import Engine from '../../../core/Engine';
import type { EngineContext } from '../../../core/Engine/types';
import { useSendNavigation } from '../confirmations/hooks/useSendNavigation';
import { InitSendLocation } from '../confirmations/constants/send';
import { isValidAddressInputViaQRCode } from '../../../util/address';
import { derivePredefinedRecipientParams } from '../confirmations/utils/address';
import { getURLProtocol } from '../../../util/general';
import {
  failedSeedPhraseRequirements,
  isValidMnemonic,
} from '../../../util/validators';
import createStyles from './styles';
import { useTheme } from '../../../util/theme';
import { ScanSuccess, StartScan } from '../QRTabSwitcher';
import SDKConnectV2 from '../../../core/SDKConnectV2';
import { ChainType } from '../confirmations/utils/send';
import useMetrics from '../../../components/hooks/useMetrics/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { QRType, QRScannerEventProperties, ScanResult } from './constants';
import { getQRType } from './utils';

const frameImage = require('../../../images/frame.png'); // eslint-disable-line import/no-commonjs

/**
 * View that wraps the QR code scanner screen
 */
const QRScanner = ({
  onScanSuccess,
  onScanError,
  onStartScan,
  origin,
}: {
  onScanSuccess: (data: ScanSuccess, content?: string) => void;
  onStartScan?: (data: StartScan) => Promise<void>;
  onScanError?: (error: string) => void;
  origin?: string;
}) => {
  const navigation = useNavigation();

  const mountedRef = useRef<boolean>(true);
  const shouldReadBarCodeRef = useRef<boolean>(true);
  const [permissionCheckCompleted, setPermissionCheckCompleted] =
    useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);

  const cameraDevice = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const { navigateToSendPage } = useSendNavigation();

  const theme = useTheme();
  const styles = createStyles(theme);
  const { trackEvent, createEventBuilder } = useMetrics();

  const hasTrackedScannerOpened = useRef(false);

  useEffect(() => {
    const checkPermission = async () => {
      if (!hasPermission && !permissionCheckCompleted) {
        try {
          await requestPermission();
        } finally {
          setPermissionCheckCompleted(true);
        }
      } else {
        setPermissionCheckCompleted(true);
      }
    };

    checkPermission();
  }, [hasPermission, requestPermission, permissionCheckCompleted]);

  // Track QR Scanner Opened when permission is granted and camera is available
  useEffect(() => {
    if (
      permissionCheckCompleted &&
      hasPermission &&
      cameraDevice &&
      !hasTrackedScannerOpened.current
    ) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.QR_SCANNER_OPENED).build(),
      );
      hasTrackedScannerOpened.current = true;
    }
  }, [
    permissionCheckCompleted,
    hasPermission,
    cameraDevice,
    trackEvent,
    createEventBuilder,
  ]);

  // Reset camera state when screen is focused (e.g., when navigating back from send screen)
  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      shouldReadBarCodeRef.current = true;
      setIsCameraActive(true);

      return () => {
        mountedRef.current = false;
        shouldReadBarCodeRef.current = false;
        setIsCameraActive(false);
      };
    }, []),
  );

  const end = useCallback(() => {
    mountedRef.current = false;
    navigation.goBack();
  }, [mountedRef, navigation]);

  const showAlertForInvalidAddress = () => {
    Alert.alert(
      strings('qr_scanner.unrecognized_address_qr_code_title'),
      strings('qr_scanner.unrecognized_address_qr_code_desc'),
      [
        {
          text: strings('qr_scanner.ok'),
          onPress: () => null,
          style: 'default',
        },
      ],
    );
  };

  const showAlertForURLRedirection = useCallback(
    (url: string): Promise<boolean> =>
      new Promise((resolve) => {
        mountedRef.current = false;
        navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.MODAL.MODAL_CONFIRMATION,
          params: {
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
            cancelLabel: strings('qr_scanner.cancel'),
            confirmLabel: strings('qr_scanner.continue'),
            isDanger: false,
            title: strings('qr_scanner.url_redirection_alert_title'),
            description: `${url}\n${strings(
              'qr_scanner.url_redirection_alert_desc',
            )}`,
          },
        });
      }),
    [navigation],
  );

  const onBarCodeRead = useCallback(
    async (codes: Code[]) => {
      // Early exit if no codes detected
      if (!codes.length) return;

      /**
       * Barcode read triggers multiple times
       * shouldReadBarCodeRef controls how often the logic below runs
       * Think of this as a allow or disallow bar code reading
       */
      if (!shouldReadBarCodeRef.current || !mountedRef.current) {
        return;
      }

      const response = { data: codes[0].value };
      let content = response.data;

      if (!content) {
        return;
      }

      if (
        origin === Routes.SEND_FLOW.SEND_TO ||
        origin === Routes.SETTINGS.CONTACT_FORM
      ) {
        if (!isValidAddressInputViaQRCode(content)) {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: false,
                [QRScannerEventProperties.QR_TYPE]: QRType.SEND_FLOW,
                [QRScannerEventProperties.SCAN_RESULT]:
                  ScanResult.INVALID_ADDRESS_FORMAT,
              })
              .build(),
          );
          showAlertForInvalidAddress();
          end();
          return;
        }
      }

      if (SDKConnectV2.isMwpDeeplink(response.data)) {
        // SDKConnectV2 handles the connection entirely internally (establishes WebSocket, etc.)
        // and bypasses the standard deeplink saga flow. We don't call onScanSuccess here because
        // parent components don't need to be notified.
        // See: app/core/DeeplinkManager/Handlers/handleDeeplink.ts for details.
        shouldReadBarCodeRef.current = false;
        trackEvent(
          createEventBuilder(MetaMetricsEvents.QR_SCANNED)
            .addProperties({
              [QRScannerEventProperties.SCAN_SUCCESS]: true,
              [QRScannerEventProperties.QR_TYPE]: QRType.DEEPLINK,
              [QRScannerEventProperties.SCAN_RESULT]:
                ScanResult.DEEPLINK_HANDLED,
            })
            .build(),
        );

        SDKConnectV2.handleMwpDeeplink(response.data);
        end();
        return;
      }

      const contentProtocol = getURLProtocol(content);
      const isWalletConnect = content.startsWith(MM_WALLETCONNECT_DEEPLINK);
      const isSDK = content.startsWith(MM_SDK_DEEPLINK);
      if (
        (contentProtocol === PROTOCOLS.HTTP ||
          contentProtocol === PROTOCOLS.HTTPS ||
          contentProtocol === PROTOCOLS.DAPP) &&
        !isWalletConnect &&
        !isSDK
      ) {
        if (contentProtocol === PROTOCOLS.DAPP) {
          content = content.replace(PROTOCOLS.DAPP, PROTOCOLS.HTTPS);
        }
        const redirect = await showAlertForURLRedirection(content);

        if (!redirect) {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: false,
                [QRScannerEventProperties.QR_TYPE]: QRType.URL,
                [QRScannerEventProperties.SCAN_RESULT]:
                  ScanResult.URL_NAVIGATION_CANCELLED,
              })
              .build(),
          );
          navigation.goBack();
          return;
        }
        // User confirmed URL redirection - track as successful URL scan
        trackEvent(
          createEventBuilder(MetaMetricsEvents.QR_SCANNED)
            .addProperties({
              [QRScannerEventProperties.SCAN_SUCCESS]: true,
              [QRScannerEventProperties.QR_TYPE]: QRType.URL,
              [QRScannerEventProperties.SCAN_RESULT]:
                ScanResult.URL_NAVIGATION_CONFIRMED,
            })
            .build(),
        );
        // Open the URL and end the scanner
        await Linking.openURL(content);
        end();
        return;
      }

      let data = {};

      if (content.split('metamask-sync:').length > 1) {
        shouldReadBarCodeRef.current = false;
        data = { content };
        if (onStartScan) {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: QRType.DEEPLINK,
                [QRScannerEventProperties.SCAN_RESULT]:
                  ScanResult.DEEPLINK_HANDLED,
              })
              .build(),
          );
          onStartScan(data).then(() => {
            onScanSuccess(data);
          });
          mountedRef.current = false;
        } else {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: false,
                [QRScannerEventProperties.QR_TYPE]: QRType.DEEPLINK,
                [QRScannerEventProperties.SCAN_RESULT]:
                  ScanResult.UNRECOGNIZED_QR_CODE,
              })
              .build(),
          );
          Alert.alert(
            strings('qr_scanner.error'),
            strings('qr_scanner.attempting_sync_from_wallet_error'),
          );
          mountedRef.current = false;
        }
      } else {
        if (
          !failedSeedPhraseRequirements(content) &&
          isValidMnemonic(content)
        ) {
          shouldReadBarCodeRef.current = false;
          data = { seed: content };
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: QRType.SEED_PHRASE,
                [QRScannerEventProperties.SCAN_RESULT]: ScanResult.COMPLETED,
              })
              .build(),
          );
          end();
          onScanSuccess(data, content);
          return;
        }
        // Check if wallet is unlocked before processing other scan types
        const { KeyringController } = Engine.context as EngineContext;
        const isUnlocked = KeyringController.isUnlocked();

        if (!isUnlocked) {
          const qrType = getQRType(content, origin);
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: false,
                [QRScannerEventProperties.QR_TYPE]: qrType,
                [QRScannerEventProperties.SCAN_RESULT]:
                  ScanResult.WALLET_LOCKED,
              })
              .build(),
          );
          navigation.goBack();
          Alert.alert(
            strings('qr_scanner.error'),
            strings('qr_scanner.attempting_to_scan_with_wallet_locked'),
          );
          mountedRef.current = false;
          return;
        }

        let addressToValidate = content;
        const hasEthereumProtocol =
          content.split(`${PROTOCOLS.ETHEREUM}:`).length > 1;

        let isEthereumUrl = false;
        if (hasEthereumProtocol) {
          try {
            const parsed = parse(content);
            if (!parsed.function_name) {
              isEthereumUrl = true;
              addressToValidate = parsed.target_address;
            }
          } catch {
            isEthereumUrl = false;
          }
        }

        const predefinedRecipient =
          derivePredefinedRecipientParams(addressToValidate);

        if (predefinedRecipient || isEthereumUrl) {
          shouldReadBarCodeRef.current = false;
          setIsCameraActive(false);

          // Handle callback-based origins (ContactForm, SendTo)
          // These origins expect onScanSuccess() with target_address instead of navigation
          if (
            origin === Routes.SEND_FLOW.SEND_TO ||
            origin === Routes.SETTINGS.CONTACT_FORM
          ) {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.QR_SCANNED)
                .addProperties({
                  [QRScannerEventProperties.SCAN_SUCCESS]: true,
                  [QRScannerEventProperties.QR_TYPE]: QRType.SEND_FLOW,
                  [QRScannerEventProperties.SCAN_RESULT]: ScanResult.COMPLETED,
                })
                .build(),
            );
            end();
            onScanSuccess({ target_address: addressToValidate }, content);
            return;
          }

          ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
          // Handle non-EVM addresses when keyring-snaps is enabled (Solana, Bitcoin)
          if (
            predefinedRecipient &&
            predefinedRecipient.chainType !== ChainType.EVM
          ) {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.QR_SCANNED)
                .addProperties({
                  [QRScannerEventProperties.SCAN_SUCCESS]: true,
                  [QRScannerEventProperties.QR_TYPE]: QRType.SEND_FLOW,
                  [QRScannerEventProperties.SCAN_RESULT]: ScanResult.COMPLETED,
                })
                .build(),
            );
            end();
            InteractionManager.runAfterInteractions(() => {
              navigateToSendPage({
                location: InitSendLocation.QRScanner,
                predefinedRecipient,
              });
            });
            return;
          }
          ///: END:ONLY_INCLUDE_IF

          // If non-EVM and keyring-snaps is disabled, show error
          if (
            predefinedRecipient &&
            predefinedRecipient.chainType !== ChainType.EVM
          ) {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.QR_SCANNED)
                .addProperties({
                  [QRScannerEventProperties.SCAN_SUCCESS]: false,
                  [QRScannerEventProperties.QR_TYPE]: QRType.SEND_FLOW,
                  [QRScannerEventProperties.SCAN_RESULT]:
                    ScanResult.ADDRESS_TYPE_NOT_SUPPORTED,
                })
                .build(),
            );
            showAlertForInvalidAddress();
            end();
            return;
          }

          // Handle EVM addresses
          if (
            predefinedRecipient &&
            predefinedRecipient.chainType === ChainType.EVM
          ) {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.QR_SCANNED)
                .addProperties({
                  [QRScannerEventProperties.SCAN_SUCCESS]: true,
                  [QRScannerEventProperties.QR_TYPE]: QRType.SEND_FLOW,
                  [QRScannerEventProperties.SCAN_RESULT]: ScanResult.COMPLETED,
                })
                .build(),
            );

            end();

            InteractionManager.runAfterInteractions(() => {
              navigateToSendPage({
                location: InitSendLocation.QRScanner,
                predefinedRecipient,
              });
            });

            return;
          }

          // Fallback for unknown chain types
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: false,
                [QRScannerEventProperties.QR_TYPE]: QRType.SEND_FLOW,
                [QRScannerEventProperties.SCAN_RESULT]:
                  ScanResult.ADDRESS_TYPE_NOT_SUPPORTED,
              })
              .build(),
          );
          showAlertForInvalidAddress();
          end();
          return;
        }

        const handledByDeeplink = await SharedDeeplinkManager.parse(content, {
          origin: AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
          onHandled: () => {
            const stackNavigation = navigation as {
              pop?: (count: number) => void;
            };
            stackNavigation.pop?.(2);
          },
        });

        if (handledByDeeplink) {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: QRType.DEEPLINK,
                [QRScannerEventProperties.SCAN_RESULT]:
                  ScanResult.DEEPLINK_HANDLED,
              })
              .build(),
          );
          mountedRef.current = false;
          return;
        }

        // I can't be handled by deeplinks, checking other options
        if (
          content.length === 64 ||
          (content.substring(0, 2).toLowerCase() === '0x' &&
            content.length === 66)
        ) {
          shouldReadBarCodeRef.current = false;
          data = {
            private_key: content.length === 64 ? content : content.substr(2),
          };
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: QRType.PRIVATE_KEY,
                [QRScannerEventProperties.SCAN_RESULT]: ScanResult.COMPLETED,
              })
              .build(),
          );
        } else if (content.substring(0, 2).toLowerCase() === '0x') {
          shouldReadBarCodeRef.current = false;
          data = { target_address: content, action: 'send-eth' };
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: QRType.SEND_FLOW,
                [QRScannerEventProperties.SCAN_RESULT]: ScanResult.COMPLETED,
              })
              .build(),
          );
        } else if (content.split('wc:').length > 1) {
          shouldReadBarCodeRef.current = false;
          data = { walletConnectURI: content };
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: QRType.WALLET_CONNECT,
                [QRScannerEventProperties.SCAN_RESULT]: ScanResult.COMPLETED,
              })
              .build(),
          );
        } else {
          // EIP-945 allows scanning arbitrary data
          data = content;
          const qrType = getQRType(content, origin, data as ScanSuccess);
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: false,
                [QRScannerEventProperties.QR_TYPE]: qrType,
                [QRScannerEventProperties.SCAN_RESULT]:
                  ScanResult.UNRECOGNIZED_QR_CODE,
              })
              .build(),
          );
        }
        onScanSuccess(data, content);
      }

      end();
    },
    [
      origin,
      end,
      showAlertForURLRedirection,
      navigation,
      onStartScan,
      onScanSuccess,
      navigateToSendPage,
      trackEvent,
      createEventBuilder,
    ],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: onBarCodeRead,
  });

  const showCameraNotAuthorizedAlert = useCallback(() => {
    Alert.alert(
      strings('qr_scanner.not_allowed_error_title'),
      strings('qr_scanner.not_allowed_error_desc'),
      [
        {
          text: strings('qr_scanner.open_settings'),
          onPress: () => Linking.openSettings(),
        },
        {
          text: strings('qr_scanner.cancel'),
          style: 'cancel',
        },
      ],
    );
  }, []);

  const onError = useCallback(
    (error: Error) => {
      navigation.goBack();
      InteractionManager.runAfterInteractions(() => {
        if (onScanError && error) {
          onScanError(error.message);
        }
      });
    },
    [onScanError, navigation],
  );

  // Only show the camera permission alert if:
  // 1. Permission check has been completed
  // 2. Permission is not granted
  if (permissionCheckCompleted && !hasPermission) {
    showCameraNotAuthorizedAlert();
    return null;
  }

  // Don't render anything if permission check is not completed yet
  if (!permissionCheckCompleted) {
    return null;
  }

  if (!cameraDevice) {
    return (
      <View style={styles.container}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.overlayText}>
          {strings('qr_scanner.camera_not_available')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.preview}
        device={cameraDevice}
        isActive={mountedRef.current && isCameraActive}
        codeScanner={codeScanner}
        torch="off"
        onError={onError}
      />
      <View style={styles.overlayContainerColumn}>
        <View style={styles.overlay} />

        <View style={styles.overlayContainerRow}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.overlayText}>
            {strings('qr_scanner.label')}
          </Text>
          <View style={styles.overlay} />
          <Image source={frameImage} style={styles.frame} />
          <View style={styles.overlay} />
        </View>
        <View style={styles.overlay} />
      </View>
    </View>
  );
};

export default QRScanner;
