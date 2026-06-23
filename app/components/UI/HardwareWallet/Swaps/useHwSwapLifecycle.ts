import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { ConnectionStatus } from '@metamask/hw-wallet-sdk';
import Logger from '../../../../util/Logger';

import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import {
  resetHardwareWalletsSwaps,
  selectHardwareWalletsSwaps,
  updateHardwareWalletsSwaps,
} from '../../../../core/redux/slices/bridge';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName as ToastIconName } from '../../../../component-library/components/Icons/Icon';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsEventType,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';
import { useHwBatchSignTracker } from './useHwBatchSignTracker';
import { useHwConnectionMonitoring } from './useHwConnectionMonitoring';
import { useHardwareWalletSubmit } from './useHardwareWalletSubmit';
import { type FlowStrategy, CancelTargetType } from './flowStrategy';

/** Connection states from which a retry is allowed. Exclusive of `Disconnected` and unknowns. */
const RETRY_ALLOWED_CONNECTION_STATUSES: ReadonlySet<ConnectionStatus> =
  new Set<ConnectionStatus>([
    ConnectionStatus.Connected,
    ConnectionStatus.Ready,
    ConnectionStatus.AwaitingConfirmation,
    ConnectionStatus.ErrorState,
  ]);

interface UseHwSwapLifecycleInputs {
  strategy: FlowStrategy;
  /** Connection state from `useHardwareWallet()`. Used to gate retry on reconnect. */
  connectionState: { status: ConnectionStatus };
  /** Imperative device-readiness gate from `useHardwareWallet()`. Forwarded to submit. */
  ensureDeviceReady?: (deviceId?: string | null) => Promise<boolean>;
  /** Sets the pending operation address so the provider can derive the wallet type for device connection. Forwarded to submit. */
  setPendingOperationAddress?: (address: string | null) => void;
}

/**
 * Owns the screen's flow state machine: the generation counters, the
 * initial-submit + auto-navigate effects, and the cancel/retry/done actions.
 *
 * Acts as the composition root for the three sibling hooks
 * (`useHwBatchSignTracker`, `useHwConnectionMonitoring`,
 * `useHardwareWalletSubmit`) so the generation refs never leave this module
 * and the screen doesn't wire sibling-hook dependencies together.
 *
 * The screen passes `strategy` (resolved flow), `connectionState`, and
 * `ensureDeviceReady`; it receives only UI-relevant handlers/state in return.
 */
export function useHwSwapLifecycle({
  strategy,
  connectionState,
  ensureDeviceReady,
  setPendingOperationAddress,
}: UseHwSwapLifecycleInputs) {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const toastRef = useContext(ToastContext)?.toastRef;

  const progress = useSelector(selectHardwareWalletsSwaps);
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  });

  // ── Lifecycle refs ───────────────────────────────────────────────
  const submissionGenerationRef = useRef(0);
  const retryGenerationRef = useRef(0);
  const hasAutoNavigatedRef = useRef(false);
  const hasInitialSubmissionRef = useRef(false);
  const retryInProgressRef = useRef(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // ── Sibling hooks (composed here so refs stay local) ─────────────
  const { cancelCurrentBatch, confirmationTxId } = useHwBatchSignTracker({
    fromAddress: strategy.walletAddress,
    isEnabled: Boolean(strategy.walletAddress),
    retryGenerationRef,
    flow: strategy.trackerOptions.flow,
    gasTokenAddress: strategy.trackerOptions.gasTokenAddress,
    deferredApprovalRequestId:
      strategy.trackerOptions.deferredApprovalRequestId,
    expectedBatchTransactionCount:
      strategy.trackerOptions.expectedBatchTransactionCount,
  });

  const { resetHandledError } = useHwConnectionMonitoring({
    isEnabled: Boolean(strategy.walletAddress),
    currentStatus: progress.status,
    hasActiveSigning: Boolean(confirmationTxId),
  });

  const {
    submit: submitWithDeviceReady,
    canRetry,
    clearCachedSubmission,
  } = useHardwareWalletSubmit({
    isSendFlow: strategy.isSendFlow,
    walletAddress: strategy.walletAddress,
    dispatch,
    progressRef,
    submissionGenerationRef,
    preparedTxMeta: strategy.submitOptions.preparedTxMeta,
    approvalRequestId: strategy.submitOptions.approvalRequestId,
    submissionParams: strategy.submitOptions.submissionParams,
    ensureDeviceReady,
    setPendingOperationAddress,
  });

  // ── Derived ──────────────────────────────────────────────────────
  const allStepsSigned = useMemo(
    () =>
      progress.steps.length > 0 &&
      progress.steps.every(
        (step) => step.status === HardwareWalletsSwapsStepStatus.Signed,
      ),
    [progress.steps],
  );

  // ── Flow termination ─────────────────────────────────────────────
  const navigateOnSuccess = useCallback(() => {
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
    // All device signing steps complete AND a submission was started.
    // Fires exactly once (guarded by hasAutoNavigatedRef) to show the
    // success toast, reset HW-swaps state, and navigate to activity view.
    Logger.log('[HW-SendBundle] nav effect', {
      allStepsSigned,
      steps: progress.steps.map((s) => ({ kind: s.kind, status: s.status })),
      hasInitialSubmission: hasInitialSubmissionRef.current,
      hasAutoNavigated: hasAutoNavigatedRef.current,
    });
    if (!allStepsSigned) return;
    if (hasAutoNavigatedRef.current) return;
    if (!hasInitialSubmissionRef.current) return;
    navigateOnSuccess();
  }, [allStepsSigned, navigateOnSuccess]);

  // ── Initial submit (first Waiting) ───────────────────────────────
  useEffect(() => {
    if (progress.status !== HardwareWalletsSwapsStatus.Waiting) return;
    if (hasInitialSubmissionRef.current) return;
    if (hasAutoNavigatedRef.current) return;
    // Bridge gates on cached params; send flow validates inside submitWithDeviceReady.
    if (!strategy.isSendFlow && !canRetry()) {
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      );
      return;
    }

    hasInitialSubmissionRef.current = true;

    // Race closure: if all steps were already signed before this effect ran
    // (e.g., remount mid-flow), the all-steps-signed effect above returned
    // early because the flag was false. Re-check here and navigate straight
    // to success instead of submitting a no-op.
    if (allStepsSigned) {
      navigateOnSuccess();
      return;
    }

    submitWithDeviceReady();
  }, [
    progress.currentStep,
    progress.status,
    dispatch,
    submitWithDeviceReady,
    canRetry,
    strategy.isSendFlow,
    allStepsSigned,
    navigateOnSuccess,
  ]);

  // ── Navigation helper ────────────────────────────────────────────
  const navigateOnCancel = useCallback(() => {
    const target = strategy.cancelTarget;
    if (target.type === CancelTargetType.GoBack) {
      navigation.goBack();
    } else {
      navigation.navigate(target.route as string);
    }
  }, [navigation, strategy.cancelTarget]);

  // ── Actions ──────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    cancelCurrentBatch();
    clearCachedSubmission();
    dispatch(resetHardwareWalletsSwaps());
    navigateOnCancel();
  }, [dispatch, cancelCurrentBatch, navigateOnCancel, clearCachedSubmission]);

  const retryFallback = useCallback(() => {
    // Retry data missing → reset + cancel-navigation (send: goBack, bridge: BRIDGE_VIEW).
    dispatch(resetHardwareWalletsSwaps());
    navigateOnCancel();
  }, [dispatch, navigateOnCancel]);

  const retrySubmission = useCallback(
    async (checkConnection: boolean) => {
      if (retryInProgressRef.current) return;
      if (!canRetry()) {
        retryFallback();
        return;
      }
      retryInProgressRef.current = true;
      setIsRetrying(true);
      hasAutoNavigatedRef.current = false;

      try {
        retryGenerationRef.current += 1;
        await cancelCurrentBatch();

        if (checkConnection) {
          const connectionAllowsRetry = RETRY_ALLOWED_CONNECTION_STATUSES.has(
            connectionState.status,
          );

          if (!connectionAllowsRetry) return;
        }

        submissionGenerationRef.current += 1;
        dispatch(
          updateHardwareWalletsSwaps({
            type: HardwareWalletsSwapsEventType.Retry,
          }),
        );
        await submitWithDeviceReady();
        // Clear the connection-error guard only AFTER the device has
        // reconnected. Clearing it before the Retry dispatch (as before) let
        // the monitoring hook re-fire DeviceDisconnected while the screen was
        // Waiting and the connection was still Disconnected, overriding the
        // Retry → Waiting reset and leaving the screen stuck on Disconnected.
        resetHandledError();
      } finally {
        retryInProgressRef.current = false;
        setIsRetrying(false);
      }
    },
    [
      dispatch,
      cancelCurrentBatch,
      submitWithDeviceReady,
      connectionState.status,
      resetHandledError,
      canRetry,
      retryFallback,
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
    clearCachedSubmission();
    dispatch(resetHardwareWalletsSwaps());
    navigation.navigate(Routes.TRANSACTIONS_VIEW);
  }, [dispatch, navigation, clearCachedSubmission]);

  return {
    isRetrying,
    handleCancel,
    handleTryAgain,
    handleReconnect,
    handleDone,
  };
}
