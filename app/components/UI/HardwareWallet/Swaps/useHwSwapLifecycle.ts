import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
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

/**
 * Safety-net timeout: if the state machine is stuck in a non-terminal status
 * after this delay, dispatch terminal Signed for the last unsigned step.
 * Needed because acceptPendingApproval resolves before batch signing finishes.
 */
const SAFETY_NET_TIMEOUT_MS = 120_000;

interface UseHwSwapLifecycleInputs {
  strategy: FlowStrategy;
  /** Imperative device-readiness gate from `useHardwareWallet()`. Forwarded to submit. */
  ensureDeviceReady?: (deviceId?: string | null) => Promise<boolean>;
  /** Sets the pending operation address so the provider can derive the wallet type for device connection. Forwarded to submit. */
  setPendingOperationAddress?: (address: string | null) => void;
  /** True when the active wallet is a QR hardware wallet. Disables BLE connection monitoring (QR has no persistent transport). */
  isQrHardwareWallet?: boolean;
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
  ensureDeviceReady,
  setPendingOperationAddress,
  isQrHardwareWallet,
}: UseHwSwapLifecycleInputs) {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
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
    isEnabled: Boolean(strategy.walletAddress) && !isQrHardwareWallet,
    currentStatus: progress.status,
    hasActiveSigning: Boolean(confirmationTxId),
    monitorDisconnectedStatus: !strategy.isSendFlow,
    retryInProgressRef,
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
    if (!allStepsSigned) return;
    // For QR wallets the HwQrScanner screen handles final navigation
    // directly (it navigates to TRANSACTIONS_VIEW on the last scan
    // instead of calling goBack()).  Letting this effect also fire would
    // produce two native view insertions in the same frame, colliding
    // on Android (java.lang.IllegalStateException / addViewAt).
    if (isQrHardwareWallet) return;
    if (!isFocused) return;
    if (hasAutoNavigatedRef.current) return;
    if (!hasInitialSubmissionRef.current) return;
    navigateOnSuccess();
  }, [allStepsSigned, isQrHardwareWallet, isFocused, navigateOnSuccess]);

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

  // ── Safety-net dispatch ──────────────────────────────────────────
  // If the state machine is stuck in a non-terminal status after the
  // safety-net timeout, the tracker likely missed the final signing
  // event. Dispatch terminal Signed for the last unsigned step. The
  // reducer's guard clauses make this a no-op if the tracker already
  // dispatched it (status would be Submitted → effect returned early).
  useEffect(() => {
    if (!hasInitialSubmissionRef.current) return;
    if (hasAutoNavigatedRef.current) return;

    const status = progress.status;
    if (
      status === HardwareWalletsSwapsStatus.Submitted ||
      status === HardwareWalletsSwapsStatus.Failed ||
      status === HardwareWalletsSwapsStatus.Rejected ||
      status === HardwareWalletsSwapsStatus.Cancelled ||
      status === HardwareWalletsSwapsStatus.Disconnected
    ) {
      return;
    }

    const timeout = setTimeout(() => {
      const current = progressRef.current;
      if (
        current.status === HardwareWalletsSwapsStatus.Submitted ||
        current.status === HardwareWalletsSwapsStatus.Failed ||
        current.status === HardwareWalletsSwapsStatus.Rejected ||
        current.status === HardwareWalletsSwapsStatus.Cancelled ||
        hasAutoNavigatedRef.current
      ) {
        return;
      }

      // Find the last unsigned step
      let lastUnsignedIndex = -1;
      for (let i = current.steps.length - 1; i >= 0; i--) {
        if (current.steps[i].status !== HardwareWalletsSwapsStepStatus.Signed) {
          lastUnsignedIndex = i;
          break;
        }
      }

      if (lastUnsignedIndex < 0) {
        // All signed but status hasn't transitioned — navigate directly
        navigateOnSuccess();
        return;
      }

      const step = current.steps[lastUnsignedIndex];
      Logger.log('[HW-SafetyNet] dispatching terminal Signed', {
        stepKind: step.kind,
        stepIndex: lastUnsignedIndex,
        status: current.status,
        stepStatuses: current.steps.map((s) => s.status),
      });

      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.Signed,
          payload: { stepKind: step.kind, stepIndex: lastUnsignedIndex },
        }),
      );
    }, SAFETY_NET_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [progress.status, progress.steps, dispatch, navigateOnSuccess]);

  // ── Navigation helper ────────────────────────────────────────────
  const navigateOnCancel = useCallback(() => {
    const target = strategy.cancelTarget;
    if (target.type === CancelTargetType.GoBack) {
      navigation.goBack();
    } else if (target.params) {
      navigation.navigate(target.route as string, target.params);
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
    async () => {
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

        submissionGenerationRef.current += 1;
        hasInitialSubmissionRef.current = true;
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
      resetHandledError,
      canRetry,
      retryFallback,
    ],
  );

  const handleTryAgain = useCallback(
    () => retrySubmission(),
    [retrySubmission],
  );

  const handleReconnect = useCallback(
    () => retrySubmission(),
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
