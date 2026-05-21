import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
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
import { ScrollView, StyleSheet } from 'react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';

import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import genericHardwareWalletRiveFile from '../../../../animations/generic_hardware_wallet.riv';
import {
  resetHardwareWalletsSwaps,
  selectHardwareWalletsSwaps,
  selectSourceAmount,
  selectSourceToken,
  updateHardwareWalletsSwaps,
} from '../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsState,
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsEventType,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSubmitBridgeTx from '../../../../util/bridge/hooks/useSubmitBridgeTx';
import {
  getBridgeSubmissionCache,
  clearBridgeSubmissionCache,
  setBridgeSubmissionCache,
} from '../../Bridge/hooks/bridgeSubmissionCache';
import { useFreshQuoteForRetry } from './hooks/useFreshQuoteForRetry';
import { isRetryQuoteAcceptable } from './retryQuoteSafety';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import { selectSourceWalletAddress } from '../../../../selectors/bridge';
import { useHwBatchSignTracker } from '../../Bridge/hooks/useHwBatchSignTracker';
import { useHardwareWallet } from '../../../../core/HardwareWallet';

import { useHwConnectionMonitoring } from './hooks/useHwConnectionMonitoring';
import { useHwQrState } from './hooks/useHwQrState';
import { ConnectionStatus } from '@metamask/hw-wallet-sdk';
import { StepRow } from './StepRow';

const HARDWARE_WALLET_RIVE_ARTBOARD = 'Generic';
const HARDWARE_WALLET_RIVE_STATE_MACHINE = 'wallet_states';
const styles = StyleSheet.create({
  riveAnimation: {
    height: 112,
    width: 112,
  },
});

const HardwareWalletRiveTrigger = {
  Reset: 'reset',
  WalletLocked: 'wallet_locked',
  WalletDisconnected: 'wallet_disconnected',
  Error: 'error',
  Found: 'found',
  NotFound: 'not_found',
} as const;

function getHardwareWalletRiveTrigger(progress: HardwareWalletsSwapsState) {
  if (progress.status === HardwareWalletsSwapsStatus.Submitted) {
    return HardwareWalletRiveTrigger.Found;
  }

  if (progress.status === HardwareWalletsSwapsStatus.Rejected) {
    return HardwareWalletRiveTrigger.Error;
  }

  if (progress.status === HardwareWalletsSwapsStatus.Failed) {
    return HardwareWalletRiveTrigger.Error;
  }

  if (progress.status === HardwareWalletsSwapsStatus.Disconnected) {
    return HardwareWalletRiveTrigger.WalletDisconnected;
  }

  if (progress.status === HardwareWalletsSwapsStatus.Cancelled) {
    return HardwareWalletRiveTrigger.WalletDisconnected;
  }

  if (progress.status === HardwareWalletsSwapsStatus.Idle) {
    return HardwareWalletRiveTrigger.NotFound;
  }

  const activeStep = progress.steps[progress.currentStep - 1];
  return activeStep?.status === HardwareWalletsSwapsStepStatus.Signing
    ? HardwareWalletRiveTrigger.WalletLocked
    : HardwareWalletRiveTrigger.Reset;
}

export function HardwareWalletsSwaps() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const riveRef = useRef<RiveRef>(null);
  const [isRivePlaying, setIsRivePlaying] = useState(false);
  const progress = useSelector(selectHardwareWalletsSwaps);
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  });
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const submissionGenerationRef = useRef(0);
  const retryGenerationRef = useRef(0);
  const { cancelCurrentBatch, confirmationTxId } = useHwBatchSignTracker({
    fromAddress: walletAddress ?? undefined,
    isEnabled: Boolean(walletAddress),
    retryGenerationRef,
  });

  const { resetHandledError } = useHwConnectionMonitoring({
    isEnabled: Boolean(walletAddress),
    currentStatus: progress.status,
    hasActiveSigning: Boolean(confirmationTxId),
  });

  const { isQrHardwareWallet, showInlineQrSigning, pendingScanRequest } =
    useHwQrState({
      isEnabled: Boolean(walletAddress),
      currentStatus: progress.status,
    });

  const { connectionState, setForceHideBottomSheet } = useHardwareWallet();

  useEffect(() => {
    if (!isQrHardwareWallet) return;
    setForceHideBottomSheet?.(true);
    return () => {
      setForceHideBottomSheet?.(false);
    };
  }, [isQrHardwareWallet, setForceHideBottomSheet]);

  const { submitBridgeTx } = useSubmitBridgeTx();
  const { fetchFreshQuote } = useFreshQuoteForRetry();
  const toastRef = useContext(ToastContext)?.toastRef;
  const hasAutoNavigatedRef = useRef(false);
  const hasInitialSubmissionRef = useRef(false);
  const retryingMutexRef = useRef(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const navigateToTransactions = useCallback(() => {
    if (hasAutoNavigatedRef.current) return;
    hasAutoNavigatedRef.current = true;
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: ToastIconName.Check,
      hasNoTimeout: false,
      labelOptions: [
        {
          label: strings('bridge.hardware_wallet_progress.submitted_title'),
        },
      ],
    });
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  }, [dispatch, navigation, toastRef]);

  useEffect(() => {
    if (!isRivePlaying) {
      return;
    }

    const trigger = getHardwareWalletRiveTrigger(progress);
    riveRef.current?.fireState(HARDWARE_WALLET_RIVE_STATE_MACHINE, trigger);
  }, [progress, isRivePlaying]);

  const allStepsSigned = useMemo(
    () =>
      progress.steps.length > 0 &&
      progress.steps.every(
        (step) => step.status === HardwareWalletsSwapsStepStatus.Signed,
      ),
    [progress.steps],
  );

  // For non-QR (Ledger) hardware wallets, the provider's shared
  // "confirm on device" bottom sheet otherwise stays open until
  // executeHardwareWalletOperation's await chain — which blocks on
  // publishBatch's STX polling — resolves. That can take seconds after
  // the device is already done signing, leaving the sheet orphaned on
  // top of the activity screen post-navigation. Force-hide the sheet
  // once all device-signing steps are complete; we deliberately do NOT
  // call hideAwaitingConfirmation here because it disconnects the BLE
  // adapter, which breaks publishHook error propagation mid-flight.
  // The provider runs its own hide-and-disconnect when publishBatch
  // finally resolves.
  //
  // Reset on mount so a prior session's latched force-hide doesn't
  // block this signing operation; latch once allStepsSigned so the
  // subsequent navigateToTransactions → resetHardwareWalletsSwaps
  // (which clears steps and flips allStepsSigned back to false)
  // doesn't un-hide the sheet right before unmount.
  const forceHideLatchedRef = useRef(false);
  useEffect(() => {
    forceHideLatchedRef.current = false;
    setForceHideBottomSheet?.(false);
  }, [setForceHideBottomSheet]);
  useEffect(() => {
    if (isQrHardwareWallet) return;
    if (!allStepsSigned) return;
    if (forceHideLatchedRef.current) return;
    forceHideLatchedRef.current = true;
    setForceHideBottomSheet?.(true);
  }, [allStepsSigned, isQrHardwareWallet, setForceHideBottomSheet]);

  useEffect(() => {
    if (!allStepsSigned) return;
    if (hasAutoNavigatedRef.current) return;
    if (!hasInitialSubmissionRef.current) return;
    navigateToTransactions();
  }, [allStepsSigned, navigateToTransactions]);

  const submitWithDeviceReady = useCallback(async () => {
    const cachedParams = getBridgeSubmissionCache();
    if (!cachedParams) {
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      );
      return;
    }
    if (!walletAddress) {
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      );
      return;
    }
    const myGeneration = submissionGenerationRef.current;
    try {
      await submitBridgeTx(cachedParams);
    } catch (error) {
      if (submissionGenerationRef.current !== myGeneration) {
        return;
      }
      Logger.error(
        error as Error,
        `HardwareWalletsSwaps: submission failed: ${JSON.stringify(error)}`,
      );
      const currentProgress = progressRef.current;
      if (
        currentProgress.status === HardwareWalletsSwapsStatus.Waiting ||
        currentProgress.status === HardwareWalletsSwapsStatus.Submitted
      ) {
        dispatch(
          updateHardwareWalletsSwaps({
            type: HardwareWalletsSwapsEventType.TransactionFailed,
          }),
        );
      }
    }
  }, [dispatch, submitBridgeTx, walletAddress]);

  useEffect(() => {
    if (progress.status !== HardwareWalletsSwapsStatus.Waiting) return;
    if (hasInitialSubmissionRef.current) return;
    if (hasAutoNavigatedRef.current) return;
    if (!getBridgeSubmissionCache()) {
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      );
      return;
    }

    hasInitialSubmissionRef.current = true;
    submitWithDeviceReady();
  }, [progress.currentStep, progress.status, dispatch, submitWithDeviceReady]);

  const isSigning = useMemo(() => {
    if (
      progress.status !== HardwareWalletsSwapsStatus.Waiting &&
      progress.status !== HardwareWalletsSwapsStatus.Submitted
    ) {
      return false;
    }
    const activeStep = progress.steps[progress.currentStep - 1];
    return activeStep?.status === HardwareWalletsSwapsStepStatus.Signing;
  }, [progress.currentStep, progress.status, progress.steps]);

  const signingTitle = useMemo(() => {
    const totalSteps = progress.totalSteps || 1;
    return strings('bridge.hardware_wallet_progress.confirm_title', {
      current: progress.currentStep || 1,
      total: totalSteps,
    });
  }, [progress.currentStep, progress.totalSteps]);

  const title = useMemo(() => {
    if (isSigning) return null;
    switch (progress.status) {
      case HardwareWalletsSwapsStatus.Submitted:
        return strings('bridge.hardware_wallet_progress.submitted_title');
      case HardwareWalletsSwapsStatus.Rejected:
        return strings('bridge.hardware_wallet_progress.rejected_title');
      case HardwareWalletsSwapsStatus.Failed:
        return strings('bridge.hardware_wallet_progress.failed_title');
      case HardwareWalletsSwapsStatus.Disconnected:
        return strings('bridge.hardware_wallet_progress.disconnected_title');
      case HardwareWalletsSwapsStatus.Waiting:
        return signingTitle;
      default:
        return null;
    }
  }, [isSigning, progress.status, signingTitle]);

  const handleCancel = useCallback(() => {
    cancelCurrentBatch();
    clearBridgeSubmissionCache();
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.BRIDGE.BRIDGE_VIEW);
  }, [dispatch, navigation, cancelCurrentBatch]);

  const bounceToBridgeView = useCallback(() => {
    clearBridgeSubmissionCache();
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.BRIDGE.BRIDGE_VIEW);
  }, [dispatch, navigation]);

  const retrySubmission = useCallback(
    async (checkConnection: boolean) => {
      if (retryingMutexRef.current) return;
      const cachedParams = getBridgeSubmissionCache();
      if (!cachedParams) {
        bounceToBridgeView();
        return;
      }
      retryingMutexRef.current = true;
      setIsRetrying(true);
      hasAutoNavigatedRef.current = false;

      try {
        retryGenerationRef.current += 1;
        await cancelCurrentBatch();

        if (checkConnection) {
          const canRetry =
            connectionState.status === ConnectionStatus.Connected ||
            connectionState.status === ConnectionStatus.Ready ||
            connectionState.status === ConnectionStatus.AwaitingConfirmation ||
            connectionState.status === ConnectionStatus.ErrorState;

          if (!canRetry) return;
        }

        // Refetch quote before retrying. The cached quote's calldata embeds a
        // slippage-protected min-out; replaying it after the market moves
        // results in STX simulation reverts (would_revert) that never mine.
        // Only proceed in-place when the fresh quote's min-out is at least
        // as good as the user's originally approved terms; otherwise bounce
        // back to BRIDGE_VIEW so the user sees the new rate.
        const freshQuote = await fetchFreshQuote();
        if (!freshQuote) {
          bounceToBridgeView();
          return;
        }
        if (!isRetryQuoteAcceptable(cachedParams.quoteResponse, freshQuote)) {
          bounceToBridgeView();
          return;
        }
        setBridgeSubmissionCache({
          ...cachedParams,
          quoteResponse: freshQuote,
        });

        submissionGenerationRef.current += 1;
        resetHandledError();
        dispatch(
          updateHardwareWalletsSwaps({
            type: HardwareWalletsSwapsEventType.Retry,
          }),
        );
        await submitWithDeviceReady();
      } finally {
        retryingMutexRef.current = false;
        setIsRetrying(false);
      }
    },
    [
      dispatch,
      cancelCurrentBatch,
      submitWithDeviceReady,
      connectionState.status,
      resetHandledError,
      fetchFreshQuote,
      bounceToBridgeView,
    ],
  );

  const handleTryAgain = useCallback(
    () => retrySubmission(false),
    [retrySubmission],
  );

  const handleReconnect = useCallback(
    () => retrySubmission(true),
    [retrySubmission],
  );

  const handleDone = useCallback(() => {
    clearBridgeSubmissionCache();
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  }, [dispatch, navigation]);

  const showRejectedActions =
    progress.status === HardwareWalletsSwapsStatus.Rejected ||
    progress.status === HardwareWalletsSwapsStatus.Failed;
  const showReconnect =
    progress.status === HardwareWalletsSwapsStatus.Disconnected;
  const showCancel = progress.status !== HardwareWalletsSwapsStatus.Submitted;
  const showDone = progress.status === HardwareWalletsSwapsStatus.Submitted;

  return (
    <SafeAreaView
      testID={HardwareWalletsSwapsSelectorsIDs.CONTAINER}
      style={tw`flex-1 bg-default`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        padding={4}
      >
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          onPress={handleCancel}
        />
        <Box twClassName="h-10 w-10" />
      </Box>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-4 pb-4`}
        showsVerticalScrollIndicator={false}
      >
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-32"
        >
          <Rive
            ref={riveRef}
            testID={HardwareWalletsSwapsSelectorsIDs.RIVE_ANIMATION}
            source={genericHardwareWalletRiveFile}
            artboardName={HARDWARE_WALLET_RIVE_ARTBOARD}
            stateMachineName={HARDWARE_WALLET_RIVE_STATE_MACHINE}
            autoplay
            fit={Fit.Contain}
            alignment={Alignment.Center}
            style={styles.riveAnimation}
            onPlay={() => setIsRivePlaying(true)}
            onError={(riveError) => {
              Logger.error(
                new Error(riveError.message),
                `HardwareWalletsSwaps: Rive error: ${JSON.stringify(riveError)}`,
              );
            }}
          />
        </Box>

        {isSigning ? (
          <Text
            testID={HardwareWalletsSwapsSelectorsIDs.TITLE}
            variant={TextVariant.HeadingLg}
            twClassName="mb-8"
          >
            {signingTitle}
          </Text>
        ) : (
          <Text
            testID={HardwareWalletsSwapsSelectorsIDs.TITLE}
            variant={TextVariant.HeadingLg}
            twClassName="mb-8"
          >
            {title}
          </Text>
        )}

        <Box>
          {progress.steps.map((step, index) => (
            <StepRow
              key={`${step.kind}-${index}`}
              step={step}
              index={index}
              isLast={index === progress.steps.length - 1}
              amount={sourceAmount}
              tokenSymbol={sourceToken?.symbol}
              isQrWallet={
                isQrHardwareWallet &&
                step.status === HardwareWalletsSwapsStepStatus.Signing
              }
              pendingScanRequest={
                step.status === HardwareWalletsSwapsStepStatus.Signing
                  ? pendingScanRequest
                  : undefined
              }
            />
          ))}
        </Box>
      </ScrollView>

      <Box gap={4} padding={4}>
        {showInlineQrSigning && isSigning ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            testID={HardwareWalletsSwapsSelectorsIDs.SCAN_NEXT_QR_BUTTON}
            onPress={() =>
              navigation.navigate(Routes.BRIDGE.HW_QR_SCANNER, {
                currentStep: progress.currentStep,
                totalSteps: progress.totalSteps,
              })
            }
          >
            {strings('bridge.hardware_wallet_progress.scan_next_qr_code')}
          </Button>
        ) : null}
        {showRejectedActions ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            isDisabled={isRetrying}
            testID={HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON}
            onPress={handleTryAgain}
          >
            {strings('hardware_wallet.common.try_again')}
          </Button>
        ) : null}
        {showReconnect ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            isDisabled={isRetrying}
            testID={HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON}
            onPress={handleReconnect}
          >
            {strings('bridge.hardware_wallet_progress.reconnect')}
          </Button>
        ) : null}
        {showDone ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            testID={HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON}
            onPress={handleDone}
          >
            {strings('bridge.hardware_wallet_progress.done')}
          </Button>
        ) : null}
        {showCancel ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonBaseSize.Lg}
            isFullWidth
            testID={HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON}
            onPress={handleCancel}
          >
            {strings('hardware_wallet.common.cancel')}
          </Button>
        ) : null}
      </Box>
    </SafeAreaView>
  );
}
