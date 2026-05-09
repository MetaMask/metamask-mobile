import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  type HardwareWalletsSwapsState,
} from '../HardwareWalletsSwaps.state';

export interface HwSwapsDebugSnapshot {
  label: string;
  state: HardwareWalletsSwapsState;
}

export const HW_SWAPS_DEBUG_SNAPSHOTS: HwSwapsDebugSnapshot[] = [
  {
    label: 'Idle',
    state: {
      status: HardwareWalletsSwapsStatus.Idle,
      currentStep: 0,
      totalSteps: 0,
      steps: [],
      disconnectedStep: null,
    },
  },
  {
    label: 'Waiting',
    state: {
      status: HardwareWalletsSwapsStatus.Waiting,
      currentStep: 1,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'waiting' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'waiting' },
      ],
      disconnectedStep: null,
    },
  },
  {
    label: 'Signing',
    state: {
      status: HardwareWalletsSwapsStatus.Waiting,
      currentStep: 1,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'signing' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'waiting' },
      ],
      disconnectedStep: null,
    },
  },
  {
    label: 'Submitted',
    state: {
      status: HardwareWalletsSwapsStatus.Submitted,
      currentStep: 2,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'signed' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'signed' },
      ],
      disconnectedStep: null,
    },
  },
  {
    label: 'Rejected',
    state: {
      status: HardwareWalletsSwapsStatus.Rejected,
      currentStep: 2,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'signed' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'rejected' },
      ],
      disconnectedStep: null,
    },
  },
  {
    label: 'Failed',
    state: {
      status: HardwareWalletsSwapsStatus.Failed,
      currentStep: 2,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'signed' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'waiting' },
      ],
      disconnectedStep: null,
    },
  },
  {
    label: 'Disconnected',
    state: {
      status: HardwareWalletsSwapsStatus.Disconnected,
      currentStep: 1,
      totalSteps: 2,
      steps: [
        { kind: HardwareWalletsSwapsStepKind.Approval, status: 'signing' },
        { kind: HardwareWalletsSwapsStepKind.Transaction, status: 'waiting' },
      ],
      disconnectedStep: 1,
    },
  },
  {
    label: 'Cancelled',
    state: {
      status: HardwareWalletsSwapsStatus.Cancelled,
      currentStep: 0,
      totalSteps: 0,
      steps: [],
      disconnectedStep: null,
    },
  },
];
