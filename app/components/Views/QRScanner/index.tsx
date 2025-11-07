/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import { useNavigation } from '@react-navigation/native';
import { parse } from 'eth-url-parser';
import { isValidAddress } from 'ethereumjs-util';
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
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { PROTOCOLS } from '../../../constants/deeplinks';
import Routes from '../../../constants/navigation/Routes';
import {
  MM_SDK_DEEPLINK,
  MM_WALLETCONNECT_DEEPLINK,
} from '../../../constants/urls';
import AppConstants from '../../../core/AppConstants';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';
import Engine from '../../../core/Engine';
import type { EngineContext } from '../../../core/Engine/types';
import { selectChainId } from '../../../selectors/networkController';
import { isValidAddressInputViaQRCode } from '../../../util/address';
import { getURLProtocol } from '../../../util/general';
import {
  failedSeedPhraseRequirements,
  isValidMnemonic,
} from '../../../util/validators';
import createStyles from './styles';
import { useTheme } from '../../../util/theme';
import { ScanSuccess, StartScan } from '../QRTabSwitcher';
import SDKConnectV2 from '../../../core/SDKConnectV2';
import useMetrics from '../../../components/hooks/useMetrics/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { QRType, QRScannerEventProperties } from './constants';
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

  const cameraDevice = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const currentChainId = useSelector(selectChainId);
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

      const response = { data: codes[0].value };
      let content = response.data;
      /**
       * Barcode read triggers multiple times
       * shouldReadBarCodeRef controls how often the logic below runs
       * Think of this as a allow or disallow bar code reading
       */
      if (!shouldReadBarCodeRef.current || !mountedRef.current || !content) {
        return;
      }

      // ============================================================
      // CONDITION 1: Address Validation for Send Flow & Contact Form
      // ============================================================
      // Handles QR codes scanned from:
      // - Send token flow (Routes.SEND_FLOW.SEND_TO)
      // - Contact form (Routes.SETTINGS.CONTACT_FORM)
      // Validates that the scanned content is a valid address
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
              })
              .build(),
          );
          showAlertForInvalidAddress();
          end();
          return;
        }
      }

      // ============================================================
      // CONDITION 2: SDK Connect V2 Deeplink
      // ============================================================
      // Handles SDK connection deeplinks (metamask-sdk://)
      // Establishes WebSocket connection and handles internally
      if (SDKConnectV2.isConnectDeeplink(response.data)) {
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
            })
            .build(),
        );
        SDKConnectV2.handleConnectDeeplink(response.data);
        end();
        return;
      }

      // ============================================================
      // CONDITION 3: Regular URLs (HTTP/HTTPS/DAPP)
      // ============================================================
      // Handles standard web URLs and dapp:// protocol
      // Prompts user for confirmation before opening external URLs
      // Excludes WalletConnect and SDK deeplinks
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
        // Convert dapp:// protocol to https://
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
            })
            .build(),
        );
        // Open the URL and end the scanner
        await Linking.openURL(content);
        end();
        return;
      }

      let data = {};

      // ============================================================
      // CONDITION 4: MetaMask Sync Protocol
      // ============================================================
      // Handles wallet sync QR codes (metamask-sync:)
      // Used for syncing data between MetaMask instances
      if (content.split('metamask-sync:').length > 1) {
        shouldReadBarCodeRef.current = false;
        data = { content };
        if (onStartScan) {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: QRType.DEEPLINK,
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
        // ============================================================
        // CONDITION 5: Seed Phrase/Mnemonic
        // ============================================================
        // Handles 12/24 word seed phrases for wallet import
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
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: false,
                [QRScannerEventProperties.QR_TYPE]: getQRType(content, origin),
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

        // ============================================================
        // CONDITION 6: Ethereum Address (EIP-681)
        // ============================================================
        // Handles ethereum: protocol addresses or plain 0x addresses
        // Examples: ethereum:0x123... or 0x123...
        // Initiates send flow for the scanned address
        if (
          (content.split(`${PROTOCOLS.ETHEREUM}:`).length > 1 &&
            !parse(content).function_name) ||
          (content.startsWith('0x') && isValidAddress(content))
        ) {
          const handledContent = content.startsWith('0x')
            ? `${PROTOCOLS.ETHEREUM}:${content}@${currentChainId}`
            : content;
          shouldReadBarCodeRef.current = false;
          data = parse(handledContent);
          const action = 'send-eth';
          data = { ...data, action };
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: QRType.SEND_FLOW,
              })
              .build(),
          );
          end();
          onScanSuccess(data, handledContent);
          return;
        }

        // ============================================================
        // CONDITION 7: Generic Deeplinks
        // ============================================================
        // Attempts to handle content through SharedDeeplinkManager
        // Handles metamask:// deeplinks and other registered protocols
        const handledByDeeplink = await SharedDeeplinkManager.parse(content, {
          origin: AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
          // TODO: Check is pop is still valid.
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onHandled: () => (navigation as any).pop(2),
        });

        if (handledByDeeplink) {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: QRType.DEEPLINK,
              })
              .build(),
          );
          mountedRef.current = false;
          return;
        }

        // ============================================================
        // CONDITION 8: Private Key Import
        // ============================================================
        // Handles private keys for account import
        // Accepts 64 char hex or 66 char hex (with 0x prefix)
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
              })
              .build(),
          );
        }
        // ============================================================
        // CONDITION 9: Ethereum Address (0x prefix, fallback)
        // ============================================================
        // Fallback handler for 0x addresses that didn't match earlier checks
        // Initiates send flow for the address
        else if (content.substring(0, 2).toLowerCase() === '0x') {
          shouldReadBarCodeRef.current = false;
          data = { target_address: content, action: 'send-eth' };
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: QRType.SEND_FLOW,
              })
              .build(),
          );
        }
        // ============================================================
        // CONDITION 10: WalletConnect URI
        // ============================================================
        // Handles WalletConnect v1/v2 connection URIs (wc:)
        // Initiates WalletConnect pairing
        else if (content.split('wc:').length > 1) {
          shouldReadBarCodeRef.current = false;
          data = { walletConnectURI: content };
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: QRType.WALLET_CONNECT,
              })
              .build(),
          );
        }
        // ============================================================
        // CONDITION 11: Arbitrary Data (EIP-945)
        // ============================================================
        // Fallback for any other QR code content
        // Allows scanning arbitrary data as per EIP-945
        else {
          data = content;
          trackEvent(
            createEventBuilder(MetaMetricsEvents.QR_SCANNED)
              .addProperties({
                [QRScannerEventProperties.SCAN_SUCCESS]: true,
                [QRScannerEventProperties.QR_TYPE]: getQRType(
                  content,
                  origin,
                  data as ScanSuccess,
                ),
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
      currentChainId,
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
        isActive={mountedRef.current}
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
