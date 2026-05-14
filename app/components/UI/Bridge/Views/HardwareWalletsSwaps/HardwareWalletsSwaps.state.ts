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

/**
 * Identifies whether a step is a token approval or the actual bridge/swap transaction.
 */
export enum HardwareWalletsSwapsStepKind {
  Approval = 'approval',
  Transaction = 'transaction',
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

export interface HardwareWalletsSwapsState {
  status: HardwareWalletsSwapsStatus;
  currentStep: number;
  totalSteps: number;
  steps: HardwareWalletsSwapsStep[];
  disconnectedStep: number | null;
}

export type HardwareWalletsSwapsEvent =
  | {
      type: HardwareWalletsSwapsEventType.Start;
      payload: {
        totalSteps: number;
        spenderAddress?: string;
        recipientAddress?: string;
      };
    }
  | {
      type:
        | HardwareWalletsSwapsEventType.Signing
        | HardwareWalletsSwapsEventType.Signed;
      payload: { stepKind: HardwareWalletsSwapsStepKind };
    }
  | {
      type: HardwareWalletsSwapsEventType.Rejected;
      payload?: { stepKind: HardwareWalletsSwapsStepKind };
    }
  | { type: HardwareWalletsSwapsEventType.DeviceDisconnected }
  | { type: HardwareWalletsSwapsEventType.TransactionFailed }
  | { type: HardwareWalletsSwapsEventType.Retry }
  | { type: HardwareWalletsSwapsEventType.Cancel };

export const initialHardwareWalletsSwapsState: HardwareWalletsSwapsState = {
  status: HardwareWalletsSwapsStatus.Idle,
  currentStep: 0,
  totalSteps: 0,
  steps: [],
  disconnectedStep: null,
};

/**
 * Builds the step array for a hardware wallet swap flow.
 * For multi-step flows (totalSteps > 1), the first step is an Approval;
 * all other steps are Transactions.
 */
function buildSteps(
  totalSteps: number,
  spenderAddress?: string,
  recipientAddress?: string,
): HardwareWalletsSwapsStep[] {
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
  return state.steps[state.currentStep - 1]?.kind === stepKind;
}

/**
 * Returns a new steps array with the matching step's status updated.
 * Finds the step at the current position matching the given kind,
 * or falls back to the step at the current index.
 */
function updateStepStatus(
  state: HardwareWalletsSwapsState,
  stepKind: HardwareWalletsSwapsStepKind,
  status: HardwareWalletsSwapsStepStatus,
): HardwareWalletsSwapsStep[] {
  const targetIndex = state.steps.findIndex(
    (step, index) => step.kind === stepKind && index + 1 === state.currentStep,
  );
  const fallbackIndex = Math.max(state.currentStep - 1, 0);
  const indexToUpdate = targetIndex >= 0 ? targetIndex : fallbackIndex;

  return state.steps.map((step, index) =>
    index === indexToUpdate ? { ...step, status } : step,
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
      return {
        status: HardwareWalletsSwapsStatus.Waiting,
        currentStep: 1,
        totalSteps,
        steps: buildSteps(
          totalSteps,
          event.payload.spenderAddress,
          event.payload.recipientAddress,
        ),
        disconnectedStep: null,
      };
    }
    case HardwareWalletsSwapsEventType.Signing:
      if (
        state.status === HardwareWalletsSwapsStatus.Rejected ||
        state.status === HardwareWalletsSwapsStatus.Submitted ||
        state.status === HardwareWalletsSwapsStatus.Failed ||
        state.status === HardwareWalletsSwapsStatus.Disconnected ||
        state.status === HardwareWalletsSwapsStatus.Cancelled
      ) {
        return state;
      }
      if (!isCurrentStepKind(state, event.payload.stepKind)) {
        return state;
      }

      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Waiting,
        steps: updateStepStatus(
          state,
          event.payload.stepKind,
          HardwareWalletsSwapsStepStatus.Signing,
        ),
      };
    case HardwareWalletsSwapsEventType.Signed: {
      if (
        state.status === HardwareWalletsSwapsStatus.Rejected ||
        state.status === HardwareWalletsSwapsStatus.Failed ||
        state.status === HardwareWalletsSwapsStatus.Disconnected ||
        state.status === HardwareWalletsSwapsStatus.Cancelled
      ) {
        return state;
      }
      if (!isCurrentStepKind(state, event.payload.stepKind)) {
        return state;
      }

      const nextStep = state.currentStep + 1;
      return {
        ...state,
        status:
          nextStep > state.totalSteps
            ? HardwareWalletsSwapsStatus.Submitted
            : HardwareWalletsSwapsStatus.Waiting,
        currentStep: Math.min(nextStep, state.totalSteps),
        steps: updateStepStatus(
          state,
          event.payload.stepKind,
          HardwareWalletsSwapsStepStatus.Signed,
        ),
      };
    }
    case HardwareWalletsSwapsEventType.Rejected: {
      const stepKind =
        event.payload?.stepKind ?? state.steps[state.currentStep - 1]?.kind;
      if (stepKind && !isCurrentStepKind(state, stepKind)) {
        return state;
      }

      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Rejected,
        steps: stepKind
          ? updateStepStatus(
              state,
              stepKind,
              HardwareWalletsSwapsStepStatus.Rejected,
            )
          : state.steps.map((step, index) =>
              index + 1 === state.currentStep
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
      if (state.status !== HardwareWalletsSwapsStatus.Waiting) {
        return state;
      }
      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Failed,
      };
    case HardwareWalletsSwapsEventType.Retry: {
      if (state.status === HardwareWalletsSwapsStatus.Disconnected) {
        const restoredStep = state.disconnectedStep ?? state.currentStep;
        return {
          ...state,
          status: HardwareWalletsSwapsStatus.Waiting,
          currentStep: restoredStep,
          steps: state.steps.map((step, index) =>
            index + 1 === restoredStep
              ? { ...step, status: HardwareWalletsSwapsStepStatus.Waiting }
              : step,
          ),
          disconnectedStep: null,
        };
      }
      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Waiting,
        currentStep: 1,
        steps: state.steps.map((step) => ({
          ...step,
          status: HardwareWalletsSwapsStepStatus.Waiting,
        })),
        disconnectedStep: null,
      };
    }
    case HardwareWalletsSwapsEventType.Cancel:
      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Cancelled,
      };
    default:
      return state;
  }
}
