import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { ScrollView, StyleSheet } from 'react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';

import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
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
  HardwareWalletsSwapsEventType,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSubmitBridgeTx from '../../../../util/bridge/hooks/useSubmitBridgeTx';
import type {
  QuoteMetadata,
  QuoteResponse,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';

import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import { selectSourceWalletAddress } from '../../../../selectors/bridge';
import { useHwBatchSignTracker } from './useHwBatchSignTracker';
import { useHardwareWallet } from '../../../../core/HardwareWallet';

import { useHwConnectionMonitoring } from './useHwConnectionMonitoring';
import { useHwQrState } from './hooks/useHwQrState';
import { ConnectionStatus, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { StepRow } from './StepRow';

interface SubmissionParams {
  quoteResponse: QuoteResponse & QuoteMetadata;
  location?: MetaMetricsSwapsEventSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

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

const STATUS_TO_RIVE_TRIGGER: Record<string, string> = {
  [HardwareWalletsSwapsStatus.Submitted]: HardwareWalletRiveTrigger.Found,
  [HardwareWalletsSwapsStatus.Rejected]: HardwareWalletRiveTrigger.Error,
  [HardwareWalletsSwapsStatus.Failed]: HardwareWalletRiveTrigger.Error,
  [HardwareWalletsSwapsStatus.Disconnected]:
    HardwareWalletRiveTrigger.WalletDisconnected,
  [HardwareWalletsSwapsStatus.Cancelled]:
    HardwareWalletRiveTrigger.WalletDisconnected,
  [HardwareWalletsSwapsStatus.Idle]: HardwareWalletRiveTrigger.NotFound,
};

/**
 * Determines the appropriate Rive animation trigger based on the current
 * swap flow state. Terminal statuses map to dedicated triggers; otherwise
 * the active step's status is inspected to choose between wallet-locked
 * (signing in progress) and reset (idle/awaiting input).
 *
 * @param progress - The current hardware wallet swap flow state.
 * @returns The Rive state-machine trigger string to fire.
 */
function getHardwareWalletRiveTrigger(progress: HardwareWalletsSwapsState) {
  // Terminal/known statuses have a direct 1:1 mapping to a Rive trigger.
  const mapped = STATUS_TO_RIVE_TRIGGER[progress.status];
  if (mapped) return mapped;

  // For non-terminal statuses, choose the animation based on the current step.
  // Signing → wallet-locked; anything else (e.g. between steps) → reset.
  const activeStep = progress.steps[progress.currentStep];
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

  const { connectionState, setForceHideBottomSheet, walletType } =
    useHardwareWallet();

  const isLedgerHardwareWallet = useMemo(
    () => walletType === HardwareWalletType.Ledger,
    [walletType],
  );

  useEffect(() => {
    if (isLedgerHardwareWallet) return;
    setForceHideBottomSheet?.(true);
    return () => {
      setForceHideBottomSheet?.(false);
    };
  }, [isLedgerHardwareWallet, isQrHardwareWallet, setForceHideBottomSheet]);

  const { submitBridgeTx } = useSubmitBridgeTx();
  const { params: routeParams } = useRoute();
  const routeSubmissionParams = useMemo(
    () =>
      (routeParams as { submissionParams?: SubmissionParams })
        ?.submissionParams ?? null,
    [routeParams],
  );
  const cachedSubmissionParams = useRef<SubmissionParams | null>(
    routeSubmissionParams,
  );
  useEffect(() => {
    if (routeSubmissionParams && !cachedSubmissionParams.current) {
      cachedSubmissionParams.current = routeSubmissionParams;
    }
  }, [routeSubmissionParams]);
  const toastRef = useContext(ToastContext)?.toastRef;
  const hasAutoNavigatedRef = useRef(false);
  const hasInitialSubmissionRef = useRef(false);
  const retryInProgressRef = useRef(false);
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
  // doesn't un-hide the sheet right before unmount. Only clear on unmount
  // if signing never reached the latched force-hide state.
  const forceHideLatchedRef = useRef(false);
  useEffect(() => {
    if (isQrHardwareWallet) return;
    forceHideLatchedRef.current = false;
    setForceHideBottomSheet?.(false);
    return () => {
      if (forceHideLatchedRef.current) return;
      setForceHideBottomSheet?.(false);
    };
  }, [isQrHardwareWallet, setForceHideBottomSheet]);
  useEffect(() => {
    if (isQrHardwareWallet) return;
    if (!allStepsSigned) return;
    if (forceHideLatchedRef.current) return;
    forceHideLatchedRef.current = true;
    setForceHideBottomSheet?.(true);
  }, [allStepsSigned, isQrHardwareWallet, setForceHideBottomSheet]);

  useEffect(() => {
    // ── Flow termination ──────────────────────────────────────────────
    // All device signing steps are complete AND a submission was started.
    // This fires exactly once (guarded by hasAutoNavigatedRef) to show the
    // success toast, reset hardware-wallet-swaps state, and navigate to the
    // activity / transactions view. This is where the swaps signing flow ends.
    // ──────────────────────────────────────────────────────────────────
    if (!allStepsSigned) return;
    if (hasAutoNavigatedRef.current) return;
    if (!hasInitialSubmissionRef.current) return;
    navigateToTransactions();
  }, [allStepsSigned, navigateToTransactions]);

  const submitBridgeTxRef = useRef(submitBridgeTx);
  submitBridgeTxRef.current = submitBridgeTx;

  const submitWithDeviceReady = useCallback(async () => {
    if (!cachedSubmissionParams.current || !walletAddress) {
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      );
      return;
    }

    // Stale-submission guard: capture the current generation before submitting.
    // If a retry is triggered while this submission is in-flight, the generation
    // counter is bumped (see retrySubmission). On error, we check whether our
    // generation is still current — if not, a newer submission has already taken
    // over and we must not dispatch a TransactionFailed
    const myGeneration = submissionGenerationRef.current;
    try {
      await submitBridgeTxRef.current(cachedSubmissionParams.current);
    } catch (error) {
      if (submissionGenerationRef.current !== myGeneration) {
        return;
      }
      const currentProgress = progressRef.current;
      // We can't use isSigning here because it would skip transaction failed when it isn't signing.
      // 1. Early throw — submitBridgeTx fails before signing starts (step status still Waiting, overall status Waiting).
      // 2. Post-signing throw — all steps signed (status Submitted, step status Signed), then broadcast fails.
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
  }, [dispatch, walletAddress]);

  useEffect(() => {
    if (progress.status !== HardwareWalletsSwapsStatus.Waiting) return;
    if (hasInitialSubmissionRef.current) return;
    if (hasAutoNavigatedRef.current) return;
    if (!cachedSubmissionParams.current) {
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
    const activeStep = progress.steps[progress.currentStep];
    return activeStep?.status === HardwareWalletsSwapsStepStatus.Signing;
  }, [progress.currentStep, progress.status, progress.steps]);

  const signingTitle = useMemo(() => {
    const totalSteps = progress.totalSteps || 1;
    return strings('bridge.hardware_wallet_progress.confirm_title', {
      current: (progress.currentStep || 0) + 1,
      total: totalSteps,
    });
  }, [progress.currentStep, progress.totalSteps]);

  const title = useMemo(() => {
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
  }, [progress.status, signingTitle]);

  const handleCancel = useCallback(() => {
    cancelCurrentBatch();
    cachedSubmissionParams.current = null;
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.BRIDGE.BRIDGE_VIEW);
  }, [dispatch, navigation, cancelCurrentBatch]);

  const retrySubmission = useCallback(
    async (checkConnection: boolean) => {
      if (retryInProgressRef.current) return;
      if (!cachedSubmissionParams.current) {
        dispatch(resetHardwareWalletsSwaps());
        navigation.navigate(Routes.BRIDGE.BRIDGE_VIEW);
        return;
      }
      retryInProgressRef.current = true;
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

        submissionGenerationRef.current += 1;
        resetHandledError();
        dispatch(
          updateHardwareWalletsSwaps({
            type: HardwareWalletsSwapsEventType.Retry,
          }),
        );
        await submitWithDeviceReady();
      } finally {
        retryInProgressRef.current = false;
        setIsRetrying(false);
      }
    },
    [
      dispatch,
      navigation,
      cancelCurrentBatch,
      submitWithDeviceReady,
      connectionState.status,
      resetHandledError,
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
    cachedSubmissionParams.current = null;
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  }, [dispatch, navigation]);

  const handleHeaderClose =
    progress.status === HardwareWalletsSwapsStatus.Submitted
      ? handleDone
      : handleCancel;

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
          onPress={handleHeaderClose}
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
          />
        </Box>

        <Text
          testID={HardwareWalletsSwapsSelectorsIDs.TITLE}
          variant={TextVariant.HeadingLg}
          twClassName="mb-8"
        >
          {title}
        </Text>

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
              // The +1 is for the title because its 1 based.
              navigation.navigate(Routes.BRIDGE.HW_QR_SCANNER, {
                currentStep: progress.currentStep + 1,
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
