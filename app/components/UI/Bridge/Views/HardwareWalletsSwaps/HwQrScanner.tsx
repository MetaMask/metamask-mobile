import React, { useCallback, useMemo } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Camera } from 'react-native-vision-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import { stringify as uuidStringify } from 'uuid';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { useAnimatedQrScanner } from '../../../QRHardware/useAnimatedQrScanner';
import { HwQrScannerSelectorsIDs } from './HwQrScanner.testIds';
import { useHardwareWallet } from '../../../../../core/HardwareWallet';
import frameImage from '../../../../../images/frame.png';

const QR_HARDWARE_LEARN_MORE_URL =
  'https://support.metamask.io/more-web3/wallets/hardware-wallet-hub/#qr-codean-gapped-wallets';

const CAMERA_PREVIEW_HEIGHT = 293;
const SCAN_FRAME_SIZE = 220;

const styles = StyleSheet.create({
  cameraPreview: {
    height: CAMERA_PREVIEW_HEIGHT,
    position: 'relative',
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
  },
  progressOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: 'center',
  },
});

interface HwQrScannerRouteParams {
  currentStep: number;
  totalSteps: number;
}

export function HwQrScanner() {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route = useRoute();
  const { qr } = useHardwareWallet();
  const pendingScanRequest = qr.pendingScanRequest;

  const { currentStep = 1, totalSteps = 1 } =
    (route.params as HwQrScannerRouteParams) ?? {};

  const isLastStep = currentStep >= totalSteps;

  const onScanSuccess = useCallback(
    (ur: { type: string; cbor: Buffer }) => {
      const signature = ETHSignature.fromCBOR(ur.cbor);
      const buffer = signature.getRequestId();
      if (buffer) {
        const requestId = uuidStringify(buffer);
        if (pendingScanRequest?.request?.requestId === requestId) {
          Engine.getQrKeyringScanner().resolvePendingScan({
            type: ur.type,
            cbor: Buffer.from(ur.cbor).toString('hex'),
          });
          navigation.goBack();
          return;
        }
      }
      Engine.getQrKeyringScanner().rejectPendingScan(
        new Error('Request ID mismatch'),
      );
      navigation.goBack();
    },
    [pendingScanRequest, navigation],
  );

  const {
    cameraDevice,
    hasPermission,
    codeScanner,
    progress,
    scanError,
    errorTitle,
    reset,
    onError,
  } = useAnimatedQrScanner({
    isActive: true,
    purpose: QrScanRequestType.SIGN,
    onScanSuccess,
  });

  const handleCancel = useCallback(() => {
    Engine.getQrKeyringScanner().rejectPendingScan(new Error('Scan cancelled'));
    navigation.goBack();
  }, [navigation]);

  const stepText = useMemo(() => {
    if (isLastStep) {
      return strings('bridge.hardware_wallet_progress.scanner_last_step_text');
    }
    return strings('bridge.hardware_wallet_progress.scanner_step_text', {
      current: currentStep,
      total: totalSteps,
    });
  }, [isLastStep, currentStep, totalSteps]);

  const renderCameraContent = () => {
    if (scanError) {
      return (
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 px-4"
        >
          {errorTitle ? (
            <Text
              variant={TextVariant.HeadingSm}
              color={TextColor.ErrorDefault}
              twClassName="text-center"
            >
              {errorTitle}
            </Text>
          ) : null}
          {scanError.userMessage ? (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              twClassName="mt-2 text-center"
            >
              {scanError.userMessage}
            </Text>
          ) : null}
          <Box gap={3} twClassName="mt-8 w-full">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonBaseSize.Lg}
              isFullWidth
              testID="hw-qr-scanner-learn-more-button"
              onPress={() => Linking.openURL(QR_HARDWARE_LEARN_MORE_URL)}
            >
              {strings('hardware_wallet.common.learn_more')}
            </Button>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonBaseSize.Lg}
              isFullWidth
              testID="hw-qr-scanner-try-again-button"
              onPress={reset}
            >
              {strings('hardware_wallet.common.try_again')}
            </Button>
          </Box>
        </Box>
      );
    }

    if (!cameraDevice || !hasPermission) {
      return (
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 px-6"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {strings('transaction.no_camera_permission')}
          </Text>
          <Box twClassName="mt-6 w-full">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonBaseSize.Lg}
              isFullWidth
              testID="hw-qr-scanner-open-settings-button"
              onPress={() => Linking.openSettings()}
            >
              {strings('qr_scanner.open_settings')}
            </Button>
          </Box>
        </Box>
      );
    }

    return (
      <>
        <Camera
          style={StyleSheet.absoluteFillObject}
          device={cameraDevice}
          isActive
          codeScanner={codeScanner}
          torch="off"
          onError={onError}
        />
        <View style={styles.overlayCenter}>
          <Image source={frameImage} style={styles.frame} />
        </View>
        {progress > 0 ? (
          <View style={styles.progressOverlay}>
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              {`${strings('qr_scanner.scanning')} ${progress}%`}
            </Text>
          </View>
        ) : null}
      </>
    );
  };

  return (
    <SafeAreaView
      testID={HwQrScannerSelectorsIDs.CONTAINER}
      style={tw`flex-1 bg-default`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        padding={4}
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleCancel}
        />
        <Box twClassName="h-10 w-10" />
      </Box>

      <Box twClassName="flex-1 px-4">
        <Box
          twClassName="w-full overflow-hidden rounded-lg bg-muted"
          style={styles.cameraPreview}
        >
          {renderCameraContent()}
        </Box>

        <Text
          testID={HwQrScannerSelectorsIDs.STEP_TEXT}
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          twClassName="mt-8"
        >
          {stepText}
        </Text>
      </Box>

      <Box padding={4}>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Lg}
          isFullWidth
          testID={HwQrScannerSelectorsIDs.CANCEL_BUTTON}
          onPress={handleCancel}
        >
          {strings('bridge.cancel')}
        </Button>
      </Box>
    </SafeAreaView>
  );
}
