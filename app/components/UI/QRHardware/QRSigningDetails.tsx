import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Engine from '../../../core/Engine';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  // eslint-disable-next-line react-native/split-platform-components
  PermissionsAndroid,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { strings } from '../../../../locales/i18n';
import AnimatedQRCode from './AnimatedQRCode';
import AnimatedQRScannerModal from './AnimatedQRScanner';
import { fontStyles } from '../../../styles/common';
import AccountInfoCard from '../AccountInfoCard';
import ActionView from '../ActionView';
import { IQRState } from './types';
import { UR } from '@ngraveio/bc-ur';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import { stringify as uuidStringify } from 'uuid';
import Alert, { AlertType } from '../../Base/Alert';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import Device from '../../../util/device';

interface IQRSigningDetails {
  QRState: IQRState;
  successCallback?: () => void;
  failureCallback?: (error: string) => void;
  cancelCallback?: () => void;
  confirmButtonMode?: 'normal' | 'sign' | 'confirm';
  showCancelButton?: boolean;
  tighten?: boolean;
  showHint?: boolean;
  shouldStartAnimated?: boolean;
  bypassAndroidCameraAccessCheck?: boolean;
  fromAddress: string;
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    container: {
      flex: 1,
      width: '100%',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    accountInfoCardWrapper: {
      paddingHorizontal: 24,
      paddingBottom: 12,
    },
    containerTighten: {
      paddingHorizontal: 8,
    },
    title: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 54,
      marginBottom: 30,
    },
    titleTighten: {
      marginTop: 12,
      marginBottom: 6,
    },
    titleText: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.default,
    },
    description: {
      marginVertical: 24,
      alignItems: 'center',
      ...fontStyles.normal,
      fontSize: 14,
    },
    descriptionTighten: {
      marginVertical: 12,
    },
    padding: {
      height: 40,
    },
    descriptionText: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.default,
    },
    descriptionTextTighten: {
      fontSize: 12,
    },
    errorText: {
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.error.default,
    },
    alert: {
      marginHorizontal: 16,
      marginTop: 12,
    },
  });

const QRSigningDetails = ({
  QRState,
  successCallback,
  failureCallback,
  cancelCallback,
  confirmButtonMode = 'confirm',
  showCancelButton = false,
  tighten = false,
  showHint = true,
  shouldStartAnimated = true,
  bypassAndroidCameraAccessCheck = true,
  fromAddress,
}: IQRSigningDetails) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const KeyringController = useMemo(() => {
    const { KeyringController: keyring } = Engine.context as any;
    return keyring;
  }, []);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shouldPause, setShouldPause] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // ios handled camera perfectly in this situation, we just need to check permission with android.
  const [hasCameraPermission, setCameraPermission] = useState(
    Device.isIos() || bypassAndroidCameraAccessCheck,
  );

  const checkAndroidCamera = useCallback(() => {
    if (Device.isAndroid() && !hasCameraPermission) {
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA).then(
        (_hasPermission) => {
          setCameraPermission(_hasPermission);
          if (!_hasPermission) {
            setCameraError(strings('transaction.no_camera_permission_android'));
          } else {
            setCameraError('');
          }
        },
      );
    }
  }, [hasCameraPermission]);

  const handleAppState = useCallback(
    (appState: AppStateStatus) => {
      if (appState === 'active') {
        checkAndroidCamera();
      }
    },
    [checkAndroidCamera],
  );

  useEffect(() => {
    checkAndroidCamera();
  }, [checkAndroidCamera]);

  useEffect(() => {
    AppState.addEventListener('change', handleAppState);
    return () => {
      AppState.removeEventListener('change', handleAppState);
    };
  }, [handleAppState]);

  const [hasSentOrCanceled, setSentOrCanceled] = useState(false);

  useEffect(() => {
    navigation.addListener('beforeRemove', (e) => {
      if (hasSentOrCanceled) {
        return;
      }
      e.preventDefault();
      KeyringController.cancelQRSignRequest().then(() => {
        navigation.dispatch(e.data.action);
      });
    });
  }, [KeyringController, hasSentOrCanceled, navigation]);

  const resetError = () => {
    setErrorMessage('');
  };

  const showScanner = () => {
    setScannerVisible(true);
    resetError();
  };

  const hideScanner = () => {
    setScannerVisible(false);
  };

  const onCancel = useCallback(async () => {
    await KeyringController.cancelQRSignRequest();
    setSentOrCanceled(true);
    hideScanner();
    cancelCallback?.();
  }, [KeyringController, cancelCallback]);

  const onScanSuccess = useCallback(
    (ur: UR) => {
      hideScanner();
      const signature = ETHSignature.fromCBOR(ur.cbor);
      const buffer = signature.getRequestId();
      const requestId = uuidStringify(buffer);
      if (QRState.sign.request?.requestId === requestId) {
        KeyringController.submitQRSignature(
          QRState.sign.request?.requestId as string,
          ur.cbor.toString('hex'),
        );
        setSentOrCanceled(true);
        successCallback?.();
      } else {
        AnalyticsV2.trackEvent(MetaMetricsEvents.HARDWARE_WALLET_ERROR, {
          error:
            'received signature request id is not matched with origin request',
        });
        setErrorMessage(strings('transaction.mismatched_qr_request_id'));
        failureCallback?.(strings('transaction.mismatched_qr_request_id'));
      }
    },
    [
      KeyringController,
      QRState.sign.request?.requestId,
      failureCallback,
      successCallback,
    ],
  );
  const onScanError = useCallback(
    (_errorMessage: string) => {
      hideScanner();
      setErrorMessage(_errorMessage);
      failureCallback?.(_errorMessage);
    },
    [failureCallback],
  );

  const renderAlert = () =>
    errorMessage !== '' && (
      <Alert type={AlertType.Error} onPress={resetError} style={styles.alert}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </Alert>
    );

  const renderCameraAlert = () =>
    cameraError !== '' && (
      <Alert
        type={AlertType.Error}
        style={styles.alert}
        onPress={Linking.openSettings}
      >
        <Text style={styles.errorText}>{cameraError}</Text>
      </Alert>
    );

  return (
    <Fragment>
      {QRState?.sign?.request && (
        <ScrollView contentContainerStyle={styles.wrapper}>
          <ActionView
            confirmDisabled={!hasCameraPermission}
            showCancelButton={showCancelButton}
            confirmButtonMode={confirmButtonMode}
            cancelText={strings('transaction.reject')}
            confirmText={strings('transactions.sign_get_signature')}
            onCancelPress={onCancel}
            onConfirmPress={showScanner}
          >
            <View
              style={[
                styles.container,
                tighten ? styles.containerTighten : undefined,
              ]}
            >
              <View style={styles.accountInfoCardWrapper}>
                <AccountInfoCard
                  showFiatBalance={false}
                  fromAddress={fromAddress}
                />
              </View>
              {renderAlert()}
              {renderCameraAlert()}
              <View
                style={[
                  styles.title,
                  tighten ? styles.titleTighten : undefined,
                ]}
              >
                <Text style={styles.titleText}>
                  {strings('transactions.sign_title_scan')}
                </Text>
                <Text style={styles.titleText}>
                  {strings('transactions.sign_title_device')}
                </Text>
              </View>
              <AnimatedQRCode
                cbor={QRState.sign.request.payload.cbor}
                type={QRState.sign.request.payload.type}
                shouldPause={
                  scannerVisible || !shouldStartAnimated || shouldPause
                }
              />
              {showHint ? (
                <View
                  style={[
                    styles.description,
                    tighten ? styles.descriptionTighten : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.descriptionText,
                      tighten ? styles.descriptionTextTighten : undefined,
                    ]}
                  >
                    {strings('transactions.sign_description_1')}
                  </Text>
                  <Text
                    style={[
                      styles.descriptionText,
                      tighten ? styles.descriptionTextTighten : undefined,
                    ]}
                  >
                    {strings('transactions.sign_description_2')}
                  </Text>
                </View>
              ) : !tighten ? (
                <View style={styles.padding} />
              ) : null}
            </View>
          </ActionView>
        </ScrollView>
      )}
      <AnimatedQRScannerModal
        pauseQRCode={setShouldPause}
        visible={scannerVisible}
        purpose={'sign'}
        onScanSuccess={onScanSuccess}
        onScanError={onScanError}
        hideModal={hideScanner}
      />
    </Fragment>
  );
};

export default QRSigningDetails;
