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
import { QRType, QRTypeValue, QRScannerEventProperties } from './constants';

const frameImage = require('../../../images/frame.png'); // eslint-disable-line import/no-commonjs

/**
 * Determines the QR type based on the scanned content
 */
const getQRType = (
  content: string,
  origin?: string,
  data?: ScanSuccess,
): QRTypeValue => {
  // Check for seed phrase
  if (
    data?.seed ||
    (!failedSeedPhraseRequirements(content) && isValidMnemonic(content))
  ) {
    return QRType.SEED_PHRASE;
  }

  // Check for private key
  if (
    data?.private_key ||
    content.length === 64 ||
    (content.substring(0, 2).toLowerCase() === '0x' && content.length === 66)
  ) {
    return QRType.PRIVATE_KEY;
  }

  // Check for send flow
  if (
    origin === Routes.SEND_FLOW.SEND_TO ||
    origin === Routes.SETTINGS.CONTACT_FORM ||
    data?.action === 'send-eth' ||
    (content.startsWith('0x') && isValidAddress(content)) ||
    content.split(`${PROTOCOLS.ETHEREUM}:`).length > 1
  ) {
    return QRType.SEND_FLOW;
  }

  // Check for wallet connect
  if (
    data?.walletConnectURI ||
    content.startsWith(MM_WALLETCONNECT_DEEPLINK) ||
    content.split('wc:').length > 1
  ) {
    return QRType.WALLET_CONNECT;
  }

  // Check for deeplink
  if (
    content.startsWith(MM_SDK_DEEPLINK) ||
    content.split('metamask-sync:').length > 1 ||
    SDKConnectV2.isConnectDeeplink(content)
  ) {
    return QRType.DEEPLINK;
  }

  // Check for URL
  const contentProtocol = getURLProtocol(content);
  if (
    contentProtocol === PROTOCOLS.HTTP ||
    contentProtocol === PROTOCOLS.HTTPS ||
    contentProtocol === PROTOCOLS.DAPP
  ) {
    return QRType.URL;
  }

  // Default to deeplink for other cases (EIP-945 arbitrary data)
  return QRType.DEEPLINK;
};

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
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { KeyringController } = Engine.context as any;
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
        // Let ethereum:address and address go forward
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

        // Checking if it can be handled like deeplinks
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
              })
              .build(),
          );
        } else {
          // EIP-945 allows scanning arbitrary data
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
