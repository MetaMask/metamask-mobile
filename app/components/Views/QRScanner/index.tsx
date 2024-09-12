/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import { useNavigation } from '@react-navigation/native';
import { parse } from 'eth-url-parser';
import { isValidAddress } from 'ethereumjs-util';
import React, { useCallback, useRef } from 'react';
import {
  Alert,
  Image,
  InteractionManager,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { PROTOCOLS } from '../../../constants/deeplinks';
import Routes from '../../../constants/navigation/Routes';
import { MM_SDK_DEEPLINK } from '../../../constants/urls';
import AppConstants from '../../../core/AppConstants';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';
import Engine from '../../../core/Engine';
import { selectChainId } from '../../../selectors/networkController';
import { isValidAddressInputViaQRCode } from '../../../util/address';
import { getURLProtocol } from '../../../util/general';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import {
  failedSeedPhraseRequirements,
  isValidMnemonic,
} from '../../../util/validators';
import createStyles from './styles';
import { useTheme } from '../../../util/theme';

const frameImage = require('../../../images/frame.png'); // eslint-disable-line import/no-commonjs

export interface QRScannerParams {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onScanSuccess: (data: any, content?: string) => void;
  onScanError?: (error: string) => void;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onStartScan?: (data: any) => Promise<void>;
  origin?: string;
}

export const createQRScannerNavDetails =
  createNavigationDetails<QRScannerParams>(Routes.QR_SCANNER);

/**
 * View that wraps the QR code scanner screen
 */
const QRScanner = () => {
  const navigation = useNavigation();
  const { onScanError, onScanSuccess, onStartScan, origin } =
    useParams<QRScannerParams>();

  const mountedRef = useRef<boolean>(true);
  const shouldReadBarCodeRef = useRef<boolean>(true);

  const currentChainId = useSelector(selectChainId);
  const theme = useTheme();
  const styles = createStyles(theme);

  const goBack = useCallback(() => {
    navigation.goBack();
    try {
      onScanError?.('USER_CANCELLED');
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.warn(`Error setting onScanError: ${error.message}`);
    }
  }, [onScanError, navigation]);

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
    async (response) => {
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
          showAlertForInvalidAddress();
          end();
          return;
        }
      }

      const contentProtocol = getURLProtocol(content);
      if (
        (contentProtocol === PROTOCOLS.HTTP ||
          contentProtocol === PROTOCOLS.HTTPS ||
          contentProtocol === PROTOCOLS.DAPP) &&
        !content.startsWith(MM_SDK_DEEPLINK)
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
          end();
          onScanSuccess(data, handledContent);
          return;
        }

        // Checking if it can be handled like deeplinks
        const handledByDeeplink = SharedDeeplinkManager.parse(content, {
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
      currentChainId,
    ],
  );

  const showCameraNotAuthorizedAlert = () =>
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

  const onError = useCallback(
    (error) => {
      navigation.goBack();
      InteractionManager.runAfterInteractions(() => {
        if (onScanError && error) {
          onScanError(error.message);
        }
      });
    },
    [onScanError, navigation],
  );

  const onStatusChange = useCallback(
    (event) => {
      if (event.cameraStatus === 'NOT_AUTHORIZED') {
        showCameraNotAuthorizedAlert();
        navigation.goBack();
      }
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      <RNCamera
        onMountError={onError}
        captureAudio={false}
        style={styles.preview}
        type={RNCamera.Constants.Type.back}
        onBarCodeRead={onBarCodeRead}
        flashMode={RNCamera.Constants.FlashMode.auto}
        androidCameraPermissionOptions={{
          title: strings('qr_scanner.allow_camera_dialog_title'),
          message: strings('qr_scanner.allow_camera_dialog_message'),
          buttonPositive: strings('qr_scanner.ok'),
          buttonNegative: strings('qr_scanner.cancel'),
        }}
        onStatusChange={onStatusChange}
      >
        <SafeAreaView style={styles.innerView}>
          <TouchableOpacity style={styles.closeIcon} onPress={goBack}>
            <Icon name="ios-close" size={50} color={styles.closeIcon.color} />
          </TouchableOpacity>
          <Image source={frameImage} style={styles.frame} />
          <Text style={styles.text}>{strings('qr_scanner.scanning')}</Text>
        </SafeAreaView>
      </RNCamera>
    </View>
  );
};

export default QRScanner;
