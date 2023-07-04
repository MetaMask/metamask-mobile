/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

'use strict';
import React, { useCallback, useMemo, useState } from 'react';
import {
  SafeAreaView,
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import { colors, fontStyles } from '../../../styles/common';
import Icon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../locales/i18n';
import { URRegistryDecoder } from '@keystonehq/ur-decoder';
import Modal from 'react-native-modal';
import { UR } from '@ngraveio/bc-ur';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import { SUPPORTED_UR_TYPE } from '../../../constants/qr';

const styles = StyleSheet.create({
  modal: {
    margin: 0,
  },
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.black,
  },
  preview: {
    flex: 1,
  },
  innerView: {
    flex: 1,
  },
  closeIcon: {
    marginTop: 20,
    marginRight: 20,
    width: 40,
    alignSelf: 'flex-end',
  },
  frame: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    justifyContent: 'center',
    marginTop: 100,
    opacity: 0.5,
  },
  text: {
    flex: 1,
    fontSize: 17,
    color: colors.white,
    textAlign: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  hint: {
    backgroundColor: colors.whiteTransparent,
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    width: 240,
    maxWidth: '80%',
    color: colors.black,
    textAlign: 'center',
    fontSize: 16,
    ...fontStyles.normal,
  },
  bold: {
    ...fontStyles.bold,
  },
});

const frameImage = require('images/frame.png'); // eslint-disable-line import/no-commonjs

interface AnimatedQRScannerProps {
  visible: boolean;
  purpose: 'sync' | 'sign';
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

  let expectedURTypes: string[];
  if (purpose === 'sync') {
    expectedURTypes = [
      SUPPORTED_UR_TYPE.CRYPTO_HDKEY,
      SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT,
    ];
  } else {
    expectedURTypes = [SUPPORTED_UR_TYPE.ETH_SIGNATURE];
  }

  const reset = useCallback(() => {
    setURDecoder(new URRegistryDecoder());
    setProgress(0);
  }, []);

  const hintText = useMemo(
    () => (
      <Text style={styles.hintText}>
        {strings('connect_qr_hardware.hint_text')}
        <Text style={styles.bold}>
          {strings(
            purpose === 'sync'
              ? 'connect_qr_hardware.purpose_connect'
              : 'connect_qr_hardware.purpose_sign',
          )}
        </Text>
      </Text>
    ),
    [purpose],
  );

  const onError = useCallback(
    (error) => {
      if (onScanError && error) {
        AnalyticsV2.trackEvent(MetaMetricsEvents.HARDWARE_WALLET_ERROR, {
          purpose,
          error,
        });
        onScanError(error.message);
      }
    },
    [purpose, onScanError],
  );

  const onBarCodeRead = useCallback(
    (response) => {
      if (!visible) {
        return;
      }
      if (!response.data) {
        return;
      }
      try {
        const content = response.data;
        urDecoder.receivePart(content);
        setProgress(Math.ceil(urDecoder.getProgress() * 100));
        if (urDecoder.isError()) {
          AnalyticsV2.trackEvent(MetaMetricsEvents.HARDWARE_WALLET_ERROR, {
            purpose,
            error: urDecoder.resultError(),
          });
          onScanError(strings('transaction.unknown_qr_code'));
        } else if (urDecoder.isSuccess()) {
          const ur = urDecoder.resultUR();
          if (expectedURTypes.includes(ur.type)) {
            onScanSuccess(ur);
            setProgress(0);
            setURDecoder(new URRegistryDecoder());
          } else if (purpose === 'sync') {
            AnalyticsV2.trackEvent(MetaMetricsEvents.HARDWARE_WALLET_ERROR, {
              purpose,
              received_ur_type: ur.type,
              error: 'invalid `sync` qr code',
            });
            onScanError(strings('transaction.invalid_qr_code_sync'));
          } else {
            AnalyticsV2.trackEvent(MetaMetricsEvents.HARDWARE_WALLET_ERROR, {
              purpose,
              received_ur_type: ur.type,
              error: 'invalid `sign` qr code',
            });
            onScanError(strings('transaction.invalid_qr_code_sign'));
          }
        }
      } catch (e) {
        onScanError(strings('transaction.unknown_qr_code'));
      }
    },
    [visible, urDecoder, onScanError, expectedURTypes, purpose, onScanSuccess],
  );

  const onStatusChange = useCallback(
    (event) => {
      if (event.cameraStatus === 'NOT_AUTHORIZED') {
        onScanError(strings('transaction.no_camera_permission'));
      }
    },
    [onScanError],
  );

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
            <TouchableOpacity style={styles.closeIcon} onPress={hideModal}>
              <Icon name={'ios-close'} size={50} color={'white'} />
            </TouchableOpacity>
            <Image source={frameImage} style={styles.frame} />
            <Text style={styles.text}>{`${strings('qr_scanner.scanning')} ${
              progress ? `${progress.toString()}%` : ''
            }`}</Text>
          </SafeAreaView>
        </RNCamera>
        <View style={styles.hint}>{hintText}</View>
      </View>
    </Modal>
  );
};

export default AnimatedQRScannerModal;
