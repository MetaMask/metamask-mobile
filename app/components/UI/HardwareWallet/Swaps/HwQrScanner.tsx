import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch } from 'react-redux';
import { Image, Linking, StyleSheet, View } from 'react-native';
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
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
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { ToastContext } from '../../../../component-library/components/Toast';
import { completeHwSwapSuccess } from './hwSwapSuccess';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import { UR } from '@ngraveio/bc-ur';
import { stringify as uuidStringify } from 'uuid';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { useAnimatedQrScanner } from './hooks/useAnimatedQrScanner';
import { HwQrScannerSelectorsIDs } from './HwQrScanner.testIds';
import { useHardwareWallet } from '../../../../core/HardwareWallet';
import { useAnalytics } from '../../../../components/hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import frameImage from '../../../../images/frame.png';

const QR_HARDWARE_LEARN_MORE_URL =
  'https://support.metamask.io/more-web3/wallets/hardware-wallet-hub/#qr-codean-gapped-wallets';

const CAMERA_PREVIEW_HEIGHT = 293;
const SCAN_FRAME_SIZE = 220;

const REQUEST_ID_MISMATCH_ANALYTICS_ERROR =
  'received signature request id is not matched with origin request';
const NO_PENDING_SCAN_REQUEST_ANALYTICS_ERROR =
  'no pending scan request found when signature was received';

/** Props for the {@link ScannerRecovery} fallback panel. */
interface ScannerRecoveryProps {
  title?: string | null;
  message?: string | null;
  onLearnMore: () => void;
  onTryAgain: () => void;
}

/**
 * Fallback panel shown by {@link HwQrScanner} when scanning fails or a scanned
 * QR's request id doesn't match the pending request. Offers "Learn more" and
 * "Try again" actions.
 */
function ScannerRecovery({
  title,
  message,
  onLearnMore,
  onTryAgain,
}: ScannerRecoveryProps) {
  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="flex-1 px-4"
    >
      {title ? (
        <Text
          variant={TextVariant.HeadingSm}
          color={TextColor.ErrorDefault}
          twClassName="text-center"
        >
          {title}
        </Text>
      ) : null}
      {message ? (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          twClassName={title ? 'mt-2 text-center' : 'text-center'}
        >
          {message}
        </Text>
      ) : null}
      <Box gap={3} twClassName="mt-8 w-full">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Lg}
          isFullWidth
          testID={HwQrScannerSelectorsIDs.LEARN_MORE_BUTTON}
          onPress={onLearnMore}
        >
          {strings('hardware_wallet.common.learn_more')}
        </Button>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonBaseSize.Lg}
          isFullWidth
          testID={HwQrScannerSelectorsIDs.TRY_AGAIN_BUTTON}
          onPress={onTryAgain}
        >
          {strings('hardware_wallet.common.try_again')}
        </Button>
      </Box>
    </Box>
  );
}

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

/**
 * Route parameters passed to the {@link HwQrScanner} screen.
 *
 * @property currentStep - The current step number in the multi-step signing flow (1-based).
 * @property totalSteps - The total number of steps in the signing flow.
 */
export interface HwQrScannerRouteParams {
  currentStep: number;
  totalSteps: number;
}

/**
 * Screen component that uses the device camera to scan animated QR codes
 * from a QR-based hardware wallet (e.g. Keystone) during a multi-step
 * transaction signing flow.
 *
 * The scanner decodes UR-encoded QR parts, validates the request ID against
 * the pending scan request, and resolves the scan via
 * `Engine.getQrKeyringScanner()` when IDs match. On mismatch, the pending
 * request stays open and the user can scan again.
 *
 * Supported route params: {@link HwQrScannerRouteParams}.
 */
export function HwQrScanner() {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const toastRef = useContext(ToastContext)?.toastRef;
  const hasCompletedOnSuccessRef = useRef(false);
  const { qr } = useHardwareWallet();
  const {
    pendingScanRequest,
    setRequestCompleted,
    cancelQRScanRequestIfPresent,
  } = qr;
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [requestIdMismatchError, setRequestIdMismatchError] = useState<
    string | null
  >(null);

  const { currentStep = 1, totalSteps = 1 } =
    (route.params as HwQrScannerRouteParams) ?? {};

  const isLastStep = currentStep >= totalSteps;

  const onScanSuccess = useCallback(
    (ur: UR): boolean => {
      const signature = ETHSignature.fromCBOR(ur.cbor);
      const buffer = signature.getRequestId();
      if (buffer) {
        const requestId = uuidStringify(buffer);
        if (pendingScanRequest?.request?.requestId === requestId) {
          Engine.getQrKeyringScanner().resolvePendingScan({
            type: ur.type,
            cbor: Buffer.from(ur.cbor).toString('hex'),
          });
          setRequestCompleted();
          // Last-step: complete success here (toast + Redux reset + navigate)
          // instead of goBack()-ing to HardwareWalletsSwaps. Ledger flows do
          // this via `useHwSwapLifecycle.navigateOnSuccess`, which is disabled
          // for QR to avoid two native view insertions in the same frame on
          // Android (addViewAt crash).
          if (isLastStep) {
            if (!hasCompletedOnSuccessRef.current) {
              hasCompletedOnSuccessRef.current = true;
              completeHwSwapSuccess({ dispatch, navigation, toastRef });
            }
          } else {
            navigation.goBack();
          }
          return true;
        }
      }
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
          .addProperties({
            error: pendingScanRequest
              ? REQUEST_ID_MISMATCH_ANALYTICS_ERROR
              : NO_PENDING_SCAN_REQUEST_ANALYTICS_ERROR,
          })
          .build(),
      );
      setRequestIdMismatchError(
        strings('transaction.mismatched_qr_request_id'),
      );
      return false;
    },
    [
      trackEvent,
      createEventBuilder,
      pendingScanRequest,
      setRequestCompleted,
      isLastStep,
      dispatch,
      navigation,
      toastRef,
    ],
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
    isActive: isFocused,
    purpose: QrScanRequestType.SIGN,
    onScanSuccess,
  });

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelQRScanRequestIfPresent();
    } catch {
      // Keep navigation responsive even if QR cleanup has already been handled.
    } finally {
      navigation.goBack();
    }
  }, [cancelQRScanRequestIfPresent, navigation]);

  const handleLearnMore = useCallback(
    () => Linking.openURL(QR_HARDWARE_LEARN_MORE_URL),
    [],
  );

  const handleOpenSettings = useCallback(() => Linking.openSettings(), []);

  const handleRetryAfterRequestIdMismatch = useCallback(() => {
    setRequestIdMismatchError(null);
    reset();
  }, [reset]);

  const recoveryPanel = useMemo(() => {
    if (scanError) {
      return {
        title: errorTitle,
        message: scanError.userMessage ?? null,
        onTryAgain: reset,
      };
    }

    if (requestIdMismatchError) {
      return {
        title: null,
        message: requestIdMismatchError,
        onTryAgain: handleRetryAfterRequestIdMismatch,
      };
    }

    return null;
  }, [
    scanError,
    errorTitle,
    requestIdMismatchError,
    handleRetryAfterRequestIdMismatch,
    reset,
  ]);

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
    if (recoveryPanel) {
      return (
        <ScannerRecovery
          title={recoveryPanel.title}
          message={recoveryPanel.message}
          onLearnMore={handleLearnMore}
          onTryAgain={recoveryPanel.onTryAgain}
        />
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
              testID={HwQrScannerSelectorsIDs.OPEN_SETTINGS_BUTTON}
              onPress={handleOpenSettings}
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
          isActive={isFocused && hasPermission}
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
          onPress={handleGoBack}
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
