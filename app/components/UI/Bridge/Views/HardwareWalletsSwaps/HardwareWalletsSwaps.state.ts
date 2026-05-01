export enum HardwareWalletsSwapsStatus {
  Idle = 'idle',
  Waiting = 'waiting',
  Submitted = 'submitted',
  Rejected = 'rejected',
  Failed = 'failed',
  Disconnected = 'disconnected',
  Cancelled = 'cancelled',
}

export enum HardwareWalletsSwapsStepKind {
  Approval = 'approval',
  Transaction = 'transaction',
}

export type HardwareWalletsSwapsStepStatus =
  | 'waiting'
  | 'signing'
  | 'signed'
  | 'rejected';

export interface HardwareWalletsSwapsStep {
  kind: HardwareWalletsSwapsStepKind;
  status: HardwareWalletsSwapsStepStatus;
}

export interface HardwareWalletsSwapsState {
  status: HardwareWalletsSwapsStatus;
  currentStep: number;
  totalSteps: number;
  steps: HardwareWalletsSwapsStep[];
  disconnectedStep: number | null;
}

export type HardwareWalletsSwapsEvent =
  | { type: 'START'; payload: { totalSteps: number } }
  | {
      type: 'SIGNING' | 'SIGNED' | 'REJECTED';
      payload: { stepKind: HardwareWalletsSwapsStepKind };
    }
  | { type: 'DEVICE_DISCONNECTED' }
  | { type: 'TRANSACTION_FAILED' }
  | { type: 'RETRY' }
  | { type: 'CANCEL' };

export const initialHardwareWalletsSwapsState: HardwareWalletsSwapsState = {
  status: HardwareWalletsSwapsStatus.Idle,
  currentStep: 0,
  totalSteps: 0,
  steps: [],
  disconnectedStep: null,
};

function buildSteps(totalSteps: number): HardwareWalletsSwapsStep[] {
  const hasApproval = totalSteps > 1;
  return Array.from({ length: totalSteps }, (_, index) => ({
    kind:
      hasApproval && index === 0
        ? HardwareWalletsSwapsStepKind.Approval
        : HardwareWalletsSwapsStepKind.Transaction,
    status: 'waiting',
  }));
}

function isCurrentStepKind(
  state: HardwareWalletsSwapsState,
  stepKind: HardwareWalletsSwapsStepKind,
) {
  return state.steps[state.currentStep - 1]?.kind === stepKind;
}

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

export function hardwareWalletsSwapsReducer(
  state: HardwareWalletsSwapsState,
  event: HardwareWalletsSwapsEvent,
): HardwareWalletsSwapsState {
  switch (event.type) {
    case 'START': {
      const totalSteps = Math.max(event.payload.totalSteps, 1);
      return {
        status: HardwareWalletsSwapsStatus.Waiting,
        currentStep: 1,
        totalSteps,
        steps: buildSteps(totalSteps),
        disconnectedStep: null,
      };
    }
    case 'SIGNING':
      if (!isCurrentStepKind(state, event.payload.stepKind)) {
        return state;
      }

      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Waiting,
        steps: updateStepStatus(state, event.payload.stepKind, 'signing'),
      };
    case 'SIGNED': {
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
        steps: updateStepStatus(state, event.payload.stepKind, 'signed'),
      };
    }
    case 'REJECTED':
      if (!isCurrentStepKind(state, event.payload.stepKind)) {
        return state;
      }

      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Rejected,
        steps: updateStepStatus(state, event.payload.stepKind, 'rejected'),
      };
    case 'DEVICE_DISCONNECTED':
      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Disconnected,
        disconnectedStep: state.currentStep,
      };
    case 'TRANSACTION_FAILED':
      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Failed,
      };
    case 'RETRY': {
      const restoredStep = state.disconnectedStep ?? state.currentStep;
      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Waiting,
        currentStep: restoredStep,
        steps: state.steps.map((step, index) =>
          index + 1 === restoredStep ? { ...step, status: 'waiting' } : step,
        ),
        disconnectedStep: null,
      };
    }
    case 'CANCEL':
      return {
        ...state,
        status: HardwareWalletsSwapsStatus.Cancelled,
      };
    default:
      return state;
  }
}
