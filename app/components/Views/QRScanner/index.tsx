/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import { useNavigation } from '@react-navigation/native';
import { parse } from 'eth-url-parser';
import { isValidAddress } from 'ethereumjs-util';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { CaipChainId } from '@metamask/utils';
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
import { useDispatch, useSelector } from 'react-redux';
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
import {
  selectChainId,
  selectNativeCurrencyByChainId,
} from '../../../selectors/networkController';
import { useSendNavigation } from '../confirmations/hooks/useSendNavigation';
import { InitSendLocation } from '../confirmations/constants/send';
import { newAssetTransaction } from '../../../actions/transaction';
import { getEther } from '../../../util/transactions';
import { RootState } from '../../../reducers';
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
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { useSendNonEvmAsset } from '../../hooks/useSendNonEvmAsset';
import { ChainType } from '../confirmations/utils/send';
///: END:ONLY_INCLUDE_IF

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

  const currentChainId = useSelector(selectChainId);
  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, currentChainId),
  );
  const dispatch = useDispatch();
  const { navigateToSendPage } = useSendNavigation();

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  // Hook for handling non-EVM asset sending (Solana, Bitcoin, etc.)
  const {
    sendNonEvmAsset,
  }: { sendNonEvmAsset: (location: string) => Promise<boolean> } =
    useSendNonEvmAsset({
      asset: {
        chainId: currentChainId as CaipChainId,
        address: undefined,
      },
    });
  ///: END:ONLY_INCLUDE_IF

  const theme = useTheme();
  const styles = createStyles(theme);

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
          navigation.goBack();
          return;
        }
      }

      let data = {};

      if (content.split('metamask-sync:').length > 1) {
        shouldReadBarCodeRef.current = false;
        data = { content };
        if (onStartScan) {
          onStartScan(data).then(() => {
            onScanSuccess(data);
          });
          mountedRef.current = false;
        } else {
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
          end();
          onScanSuccess(data, content);
          return;
        }
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { KeyringController } = Engine.context as any;
        const isUnlocked = KeyringController.isUnlocked();

        if (!isUnlocked) {
          navigation.goBack();
          Alert.alert(
            strings('qr_scanner.error'),
            strings('qr_scanner.attempting_to_scan_with_wallet_locked'),
          );
          mountedRef.current = false;
          return;
        }
        // Handle plain addresses and ethereum: URLs by using home screen send flow
        // Also handle non-EVM addresses like Solana
        if (
          (content.split(`${PROTOCOLS.ETHEREUM}:`).length > 1 &&
            !parse(content).function_name) ||
          (content.startsWith('0x') && isValidAddress(content)) ||
          isSolanaAddress(content)
        ) {
          // Immediately stop barcode scanning to prevent multiple triggers
          shouldReadBarCodeRef.current = false;
          setIsCameraActive(false);

          ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
          // Try non-EVM first (Solana, Bitcoin, etc.), if handled, return early
          if (isSolanaAddress(content)) {
            const wasHandledAsNonEvm = await sendNonEvmAsset(
              InitSendLocation.QRScanner,
            );

            if (wasHandledAsNonEvm) {
              // Close QR scanner modal first
              end();

              // Navigate to send flow after modal closes
              InteractionManager.runAfterInteractions(() => {
                navigateToSendPage({
                  location: InitSendLocation.QRScanner,
                  predefinedRecipient: {
                    address: content,
                    chainType: ChainType.SOLANA,
                  },
                });
              });

              return;
            }

            // Solana address was not handled by sendNonEvmAsset, show error
            showAlertForInvalidAddress();
            end();
            return;
          }
          ///: END:ONLY_INCLUDE_IF

          // Skip Ethereum processing for Solana addresses when keyring-snaps is disabled
          if (isSolanaAddress(content)) {
            // Show error for unsupported Solana addresses when keyring-snaps is disabled
            showAlertForInvalidAddress();
            end();
            return;
          }

          // Extract recipient address from QR code
          const recipientAddress = content.startsWith('0x')
            ? content
            : parse(content).target_address;

          // Initialize transaction with native currency (same as home screen send button)
          if (nativeCurrency) {
            dispatch(newAssetTransaction(getEther(nativeCurrency)));
          } else {
            // Fallback to ETH if native currency not available
            dispatch(newAssetTransaction(getEther('ETH')));
          }

          // Close QR scanner modal first
          end();

          // Navigate to send flow after modal closes
          InteractionManager.runAfterInteractions(() => {
            navigateToSendPage({
              location: InitSendLocation.QRScanner,
              predefinedRecipient: {
                address: recipientAddress,
                chainType: ChainType.EVM,
              },
            });
          });

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
        } else if (content.substring(0, 2).toLowerCase() === '0x') {
          shouldReadBarCodeRef.current = false;
          data = { target_address: content, action: 'send-eth' };
        } else if (content.split('wc:').length > 1) {
          shouldReadBarCodeRef.current = false;
          data = { walletConnectURI: content };
        } else {
          // EIP-945 allows scanning arbitrary data
          data = content;
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
      dispatch,
      navigateToSendPage,
      nativeCurrency,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      sendNonEvmAsset,
      ///: END:ONLY_INCLUDE_IF
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
