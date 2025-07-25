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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modal: {
      margin: 0,
    },
    container: {
      width: '100%',
      height: '100%',
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
      color: theme.brandColors.white,
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
      color: theme.brandColors.black,
      textAlign: 'center',
      fontSize: 16,
      ...fontStyles.normal,
    },
    bold: {
      ...fontStyles.bold,
    },
  });

const frameImage = require('../../../images/frame.png'); // eslint-disable-line import/no-commonjs

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
  const theme = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(theme);

  const cameraDevice = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  let expectedURTypes: string[];
  if (purpose === 'sync') {
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
        <Text style={styles.bold}>
          {strings(
            purpose === 'sync'
              ? 'connect_qr_hardware.purpose_connect'
              : 'connect_qr_hardware.purpose_sign',
          )}
        </Text>
      </Text>
    ),
    [purpose, styles],
  );

  const onError = useCallback(
    (error: Error) => {
      if (onScanError && error) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
            .addProperties({ purpose, error: error.message })
            .build(),
        );
        onScanError(error.message);
      }
    },
    [purpose, onScanError, trackEvent, createEventBuilder],
  );

  const onBarCodeRead = useCallback(
    (codes: Code[]) => {
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
        if (urDecoder.isError()) {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
              .addProperties({ purpose, error: urDecoder.resultError() })
              .build(),
          );
          onScanError(strings('transaction.unknown_qr_code'));
        } else if (urDecoder.isSuccess()) {
          const ur = urDecoder.resultUR();
          if (expectedURTypes.includes(ur.type)) {
            onScanSuccess(ur);
            setProgress(0);
            setURDecoder(new URRegistryDecoder());
          } else if (purpose === 'sync') {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
                .addProperties({
                  purpose,
                  received_ur_type: ur.type,
                  error: 'invalid `sync` qr code',
                })
                .build(),
            );
            onScanError(strings('transaction.invalid_qr_code_sync'));
          } else {
            trackEvent(
              createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
                .addProperties({
                  purpose,
                  received_ur_type: ur.type,
                  error: 'invalid `sign` qr code',
                })
                .build(),
            );
            onScanError(strings('transaction.invalid_qr_code_sign'));
          }
        }
      } catch (e) {
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
            <SafeAreaView style={styles.innerView}>
              <TouchableOpacity style={styles.closeIcon} onPress={hideModal}>
                {<Icon name={IconName.Close} size={IconSize.Xl} />}
              </TouchableOpacity>
              <Image source={frameImage} style={styles.frame} />
              <Text style={styles.text}>{`${strings('qr_scanner.scanning')} ${
                progress ? `${progress.toString()}%` : ''
              }`}</Text>
            </SafeAreaView>
          </>
        ) : (
          <SafeAreaView style={styles.innerView}>
            <TouchableOpacity style={styles.closeIcon} onPress={hideModal}>
              {<Icon name={IconName.Close} size={IconSize.Xl} />}
            </TouchableOpacity>
            <Text style={styles.text}>
              {strings('transaction.no_camera_permission')}
            </Text>
          </SafeAreaView>
        )}
        <View style={styles.hint}>{hintText}</View>
      </View>
    </Modal>
  );
};

export default AnimatedQRScannerModal;
