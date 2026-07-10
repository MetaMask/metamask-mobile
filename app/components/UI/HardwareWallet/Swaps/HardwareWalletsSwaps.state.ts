import { isEvmTxData, type QuoteResponse } from '@metamask/bridge-controller';
import { Flow } from './flowStrategy';

/**
 * Status of the hardware wallet swap flow state machine.
 * Transitions: Idle → Waiting → Submitted | Rejected | Failed | Disconnected | Cancelled
 */
export enum HardwareWalletsSwapsStatus {
  Idle = 'idle',
  Waiting = 'waiting',
  Submitted = 'submitted',
  Rejected = 'rejected',
  Failed = 'failed',
  Disconnected = 'disconnected',
  Cancelled = 'cancelled',
}

/** Kind of a signing step. `FeeTransfer` is send-only  — distinct from `Transaction` so a Sendbundle's two same-typed txs can advance by kind. */
export enum HardwareWalletsSwapsStepKind {
  Approval = 'approval',
  Transaction = 'transaction',
  FeeTransfer = 'feeTransfer',
}

/**
 * Lifecycle status of a single step within the swap flow.
 * Transitions: Waiting → Signing → Signed | Rejected
 */
export enum HardwareWalletsSwapsStepStatus {
  Waiting = 'waiting',
  Signing = 'signing',
  Signed = 'signed',
  Rejected = 'rejected',
}

/**
 * Discriminant values for {@link HardwareWalletsSwapsEvent}.
 * Used in switch statements and event dispatch for type-safe state transitions.
 */
export enum HardwareWalletsSwapsEventType {
  Start = 'START',
  Signing = 'SIGNING',
  Signed = 'SIGNED',
  Rejected = 'REJECTED',
  DeviceDisconnected = 'DEVICE_DISCONNECTED',
  TransactionFailed = 'TRANSACTION_FAILED',
  Retry = 'RETRY',
  Cancel = 'CANCEL',
}

/**
 * A single step in the hardware wallet signing flow.
 * For multi-step flows, the first step is an Approval and the second is the Transaction.
 */
export interface HardwareWalletsSwapsStep {
  kind: HardwareWalletsSwapsStepKind;
  status: HardwareWalletsSwapsStepStatus;
  address?: string;
}

/**
 * Shape of the hardware wallet swap signing state machine.
 *
 * The reducer tracks the overall flow status, the current and total step
 * indices, the ordered list of steps, and — when the device disconnects —
 * the step index at which the disconnect occurred so the UI can resume there.
 */
export interface HardwareWalletsSwapsState {
  /** Overall lifecycle status of the signing flow (idle, waiting, submitted, etc.). */
  status: HardwareWalletsSwapsStatus;
  /** Zero-based index of the step currently awaiting or undergoing signing. */
  currentStep: number;
  /** Total number of steps in the flow (1 = trade only; 2 = approval + trade). */
  totalSteps: number;
  /** Ordered steps, each tracking its kind, per-step status, and target address. */
  steps: HardwareWalletsSwapsStep[];
  /** Index of the step in progress when the device disconnected, or null if it hasn't. */
  disconnectedStep: number | null;
}

/**
 * Discriminated union of all events accepted by {@link hardwareWalletsSwapsReducer}.
 * Each variant carries only the payload relevant to its transition.
 */
export type HardwareWalletsSwapsEvent =
  | {
      type: HardwareWalletsSwapsEventType.Start;
      payload: {
        totalSteps: number;
        spenderAddress?: string;
        recipientAddress?: string;
        /** Signing origin. `Flow.Send` produces a Sendbundle `[Transaction, FeeTransfer]` (or `[Transaction]` for plain send); default `Flow.Bridge`. */
        flow?: Flow;
        /** Sendbundle only: gas-fee-token address backing the `FeeTransfer` step. Tracker matches it against `txParams.to`. */
        gasTokenAddress?: string;
      };
    }
  | {
      type:
        | HardwareWalletsSwapsEventType.Signing
        | HardwareWalletsSwapsEventType.Signed;
      payload: {
        stepKind: HardwareWalletsSwapsStepKind;
        stepIndex?: number;
      };
    }
  | {
      type: HardwareWalletsSwapsEventType.Rejected;
      payload?: {
        stepKind: HardwareWalletsSwapsStepKind;
        stepIndex?: number;
      };
    }
  | { type: HardwareWalletsSwapsEventType.DeviceDisconnected }
  | { type: HardwareWalletsSwapsEventType.TransactionFailed }
  | { type: HardwareWalletsSwapsEventType.Retry }
  | { type: HardwareWalletsSwapsEventType.Cancel };

type QuoteWithTxData = Pick<QuoteResponse, 'approval' | 'trade'>;

/**
 * Resolution emitted by the safety-net effect in `useHwSwapLifecycle` when the
 * state machine is still in a non-terminal status after the safety-net
 * timeout. Pure over the step list so it can be tested independently of
 * timers, the redux dispatch, and React navigation.
 *
 * `navigate` means every step is Signed but the flow never reached success
 * navigation, so navigate directly. `dispatch` means emit the carried event:
 * terminal `Signed` for the single remaining unsigned step (the "tracker
 * missed the final event" case), or `TransactionFailed` when more than one
 * step is still unsigned.
 */
export type StuckProgressResolution =
  | { readonly action: 'navigate' }
  | { readonly action: 'dispatch'; readonly event: HardwareWalletsSwapsEvent };

/**
 * Builds the `Start` event that initializes the swap signing flow from an
 * active bridge/swap quote.
 *
 * Determines the step count from whether an approval is required: two steps
 * (approval + trade) when `approval` is present, otherwise one (trade only).
 * Extracts the spender (`approval.to`) and recipient (`trade.to`) addresses,
 * guarded by the bridge controller's `isEvmTxData` so non-EVM quote shapes are
 * safely skipped.
 *
 * @param activeQuote - The selected quote, containing optional `approval` and
 * `trade` transaction data.
 * @returns A `Start` event for {@link hardwareWalletsSwapsReducer}.
 */
export function buildStartPayload(
  activeQuote: QuoteWithTxData,
): HardwareWalletsSwapsEvent {
  const { approval, trade } = activeQuote;
  return {
    type: HardwareWalletsSwapsEventType.Start,
    payload: {
      totalSteps: approval ? 2 : 1,
      spenderAddress:
        approval && isEvmTxData(approval) ? approval.to : undefined,
      recipientAddress: trade && isEvmTxData(trade) ? trade.to : undefined,
    },
  };
}

/**
 * Initial idle state for {@link hardwareWalletsSwapsReducer} — no steps and
 * nothing in flight, ready to receive a `Start` event.
 */
export const initialHardwareWalletsSwapsState: HardwareWalletsSwapsState = {
  status: HardwareWalletsSwapsStatus.Idle,
  currentStep: 0,
  totalSteps: 0,
  steps: [],
  disconnectedStep: null,
};

/** Builds the step array. Bridge/default: step 0 is `Approval` when totalSteps>1. Send: `[Transaction × N, FeeTransfer]` (N sends + 1 fee) when totalSteps>1, else `[Transaction]` — the device signs the sends first, then the fee transfer.  */
function buildSteps(
  totalSteps: number,
  spenderAddress?: string,
  recipientAddress?: string,
  flow: Flow = Flow.Bridge,
  gasTokenAddress?: string,
): HardwareWalletsSwapsStep[] {
  if (flow === Flow.Send) {
    return Array.from({ length: totalSteps }, (_, index) => {
      const isFeeTransfer = totalSteps > 1 && index === totalSteps - 1;
      return {
        kind: isFeeTransfer
          ? HardwareWalletsSwapsStepKind.FeeTransfer
          : HardwareWalletsSwapsStepKind.Transaction,
        status: HardwareWalletsSwapsStepStatus.Waiting,
        address: isFeeTransfer ? gasTokenAddress : recipientAddress,
      };
    });
  }

  const hasApproval = totalSteps > 1;
  return Array.from({ length: totalSteps }, (_, index) => ({
    kind:
      hasApproval && index === 0
        ? HardwareWalletsSwapsStepKind.Approval
        : HardwareWalletsSwapsStepKind.Transaction,
    status: HardwareWalletsSwapsStepStatus.Waiting,
    address: hasApproval && index === 0 ? spenderAddress : recipientAddress,
  }));
}

/**
 * Checks whether the current active step matches the given step kind.
 * Used to guard against events targeting a step that is not currently active.
 */
function isCurrentStepKind(
  state: HardwareWalletsSwapsState,
  stepKind: HardwareWalletsSwapsStepKind,
) {
  return state.steps[state.currentStep]?.kind === stepKind;
}

/**
 * Finds the index of the first actionable step matching the given kind.
 *
 * "Actionable" means the step is not yet in a terminal per-step state
 * (`Signed` or `Rejected`), so it can still transition to `Signing`/`Signed`.
 *
 * @returns The matching step index, or `-1` if none is found.
 */
function findStepIndexByKind(
  steps: HardwareWalletsSwapsStep[],
  stepKind: HardwareWalletsSwapsStepKind,
  stepIndex?: number,
): number {
  if (
    stepIndex !== undefined &&
    steps[stepIndex]?.kind === stepKind &&
    steps[stepIndex].status !== HardwareWalletsSwapsStepStatus.Signed &&
    steps[stepIndex].status !== HardwareWalletsSwapsStepStatus.Rejected
  ) {
    return stepIndex;
  }

  return steps.findIndex(
    (step) =>
      step.kind === stepKind &&
      step.status !== HardwareWalletsSwapsStepStatus.Signed &&
      step.status !== HardwareWalletsSwapsStepStatus.Rejected,
  );
}

/**
 * Returns a new steps array with the first actionable step of the given kind
 * updated to `status`. If no actionable matching step exists, the original
 * array is returned unchanged.
 */
function updateStepStatusByKind(
  steps: HardwareWalletsSwapsStep[],
  stepKind: HardwareWalletsSwapsStepKind,
  status: HardwareWalletsSwapsStepStatus,
  stepIndex?: number,
): HardwareWalletsSwapsStep[] {
  const targetIndex = findStepIndexByKind(steps, stepKind, stepIndex);
  if (targetIndex < 0) return steps;

  return steps.map((step, index) =>
    index === targetIndex ? { ...step, status } : step,
  );
}

/**
 * Pure reducer driving the hardware wallet swap signing state machine.
 * Handles step transitions, terminal guards, and retry logic.
 */
export function hardwareWalletsSwapsReducer(
  state: HardwareWalletsSwapsState,
  event: HardwareWalletsSwapsEvent,
): HardwareWalletsSwapsState {
  switch (event.type) {
    case HardwareWalletsSwapsEventType.Start: {
      const totalSteps = Math.max(event.payload.totalSteps, 1);
      // A Sendbundle's FeeTransfer step is matched by the batch-sign tracker
      // against `txParams.to === gasTokenAddress`; without it the fee step
      // would never resolve and the flow would hang on Waiting indefinitely.
      // Enforce the producer contract here so a misbuilt Start fails loudly
      // instead of stalling the UI.
      if (
        event.payload.flow === Flow.Send &&
        totalSteps > 1 &&
        !event.payload.gasTokenAddress
      ) {
        throw new Error(
          'HardwareWalletsSwaps: a Sendbundle Start with more than one step requires gasTokenAddress',
        );
      }
      return {
        status: HardwareWalletsSwapsStatus.Waiting,
        currentStep: 0,
        totalSteps,
        steps: buildSteps(
          totalSteps,
          event.payload.spenderAddress,
          event.payload.recipientAddress,
          event.payload.flow,
          event.payload.gasTokenAddress,
        ),
        disconnectedStep: null,
      };
    }
    case HardwareWalletsSwapsEventType.Signing: {
      if (
        state.status === HardwareWalletsSwapsStatus.Rejected ||
        state.status === HardwareWalletsSwapsStatus.Submitted ||
        state.status === HardwareWalletsSwapsStatus.Failed ||
        state.status === HardwareWalletsSwapsStatus.Disconnected ||
        state.status === HardwareWalletsSwapsStatus.Cancelled
      ) {
        return state;
      }
      if (state.steps.length === 0) return state;
      const signingIndex = findStepIndexByKind(
        state.steps,
        event.payload.stepKind,
        event.payload.stepIndex,
      );
      if (signingIndex < 0) return state;
      const signingStep = state.steps[signingIndex];
      if (
        signingStep.status !== HardwareWalletsSwapsStepStatus.Waiting &&
        signingStep.status !== HardwareWalletsSwapsStepStatus.Signing
      ) {
        return state;
      }

      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Waiting,
        currentStep: signingIndex,
        steps: updateStepStatusByKind(
          state.steps,
          event.payload.stepKind,
          HardwareWalletsSwapsStepStatus.Signing,
          event.payload.stepIndex,
        ),
      };
    }
    case HardwareWalletsSwapsEventType.Signed: {
      if (
        state.status === HardwareWalletsSwapsStatus.Rejected ||
        state.status === HardwareWalletsSwapsStatus.Failed ||
        state.status === HardwareWalletsSwapsStatus.Disconnected ||
        state.status === HardwareWalletsSwapsStatus.Cancelled
      ) {
        return state;
      }
      if (state.steps.length === 0) return state;
      const signedIndex = findStepIndexByKind(
        state.steps,
        event.payload.stepKind,
        event.payload.stepIndex,
      );
      if (signedIndex < 0) return state;

      const nextStep = signedIndex + 1;
      return {
        ...state,
        status:
          nextStep >= state.totalSteps
            ? HardwareWalletsSwapsStatus.Submitted
            : HardwareWalletsSwapsStatus.Waiting,
        currentStep: nextStep,
        steps: updateStepStatusByKind(
          state.steps,
          event.payload.stepKind,
          HardwareWalletsSwapsStepStatus.Signed,
          event.payload.stepIndex,
        ),
      };
    }
    case HardwareWalletsSwapsEventType.Rejected: {
      if (state.status !== HardwareWalletsSwapsStatus.Waiting) {
        return state;
      }

      const stepKind =
        event.payload?.stepKind ?? state.steps[state.currentStep]?.kind;
      const stepIndex = event.payload?.stepIndex;
      const isValidTarget =
        stepKind &&
        (stepIndex === undefined
          ? isCurrentStepKind(state, stepKind)
          : state.steps[stepIndex]?.kind === stepKind);
      if (!isValidTarget) {
        return state;
      }

      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Rejected,
        steps: stepKind
          ? updateStepStatusByKind(
              state.steps,
              stepKind,
              HardwareWalletsSwapsStepStatus.Rejected,
              stepIndex,
            )
          : state.steps.map((step, index) =>
              index === state.currentStep
                ? {
                    ...step,
                    status: HardwareWalletsSwapsStepStatus.Rejected,
                  }
                : step,
            ),
      };
    }
    case HardwareWalletsSwapsEventType.DeviceDisconnected:
      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Disconnected,
        disconnectedStep: state.currentStep,
      };
    case HardwareWalletsSwapsEventType.TransactionFailed:
      // A swap has two phases: SIGNING (status = Waiting, while the user
      // confirms each step on the hardware device) and BROADCAST (status =
      // Submitted, once everything is signed and the Smart Transactions / STX
      // backend publishes it on-chain). Both phases can fail: a step can fail
      // during signing, and the STX backend can fail to publish even after
      // signing succeeded. Both are accepted here; excluding Submitted would
      // drop those post-signing failures and leave the UI stuck on
      // "Submitted" indefinitely.
      if (
        state.status !== HardwareWalletsSwapsStatus.Waiting &&
        state.status !== HardwareWalletsSwapsStatus.Submitted
      ) {
        return state;
      }
      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Failed,
      };
    case HardwareWalletsSwapsEventType.Retry: {
      if (
        state.status !== HardwareWalletsSwapsStatus.Disconnected &&
        state.status !== HardwareWalletsSwapsStatus.Rejected &&
        state.status !== HardwareWalletsSwapsStatus.Failed
      ) {
        return state;
      }
      // All retry paths fully reset: the batch sign tracker invalidates
      // all in-flight state and re-submits the entire batch, so every
      // step must return to Waiting and currentStep restarts at 0.
      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Waiting,
        currentStep: 0,
        steps: state.steps.map((step) => ({
          ...step,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        })),
        disconnectedStep: null,
      };
    }
    case HardwareWalletsSwapsEventType.Cancel:
      if (
        state.status === HardwareWalletsSwapsStatus.Idle ||
        state.status === HardwareWalletsSwapsStatus.Submitted ||
        state.status === HardwareWalletsSwapsStatus.Cancelled
      ) {
        return state;
      }
      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Cancelled,
      };
    default:
      return state;
  }
}

/**
 * Decides what the safety-net timeout should do given the current step list.
 *
 * The premise is "the tracker missed the final signing event." That holds
 * only when a single step remains unsigned. When two or more are unsigned the
 * flow cannot be reconciled to a consistent terminal state by advancing one
 * step, so it fails explicitly rather than flipping overall status to
 * Submitted while earlier steps are still Waiting — which previously left
 * `allStepsSigned` false and the success navigation permanently stuck.
 *
 * A step counts as unsigned when it is neither Signed nor Rejected, matching
 * the reducer's notion of an actionable step (see {@link findStepIndexByKind}).
 */
export function reconcileStuckProgress(
  steps: HardwareWalletsSwapsStep[],
): StuckProgressResolution {
  const unsignedSteps = steps.filter(
    (step) =>
      step.status !== HardwareWalletsSwapsStepStatus.Signed &&
      step.status !== HardwareWalletsSwapsStepStatus.Rejected,
  );

  if (unsignedSteps.length === 0) {
    return { action: 'navigate' };
  }

  if (unsignedSteps.length === 1) {
    const unsignedStep = unsignedSteps[0];
    const stepIndex = steps.indexOf(unsignedStep);
    return {
      action: 'dispatch',
      event: {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: unsignedStep.kind, stepIndex },
      },
    };
  }

  return {
    action: 'dispatch',
    event: { type: HardwareWalletsSwapsEventType.TransactionFailed },
  };
}
