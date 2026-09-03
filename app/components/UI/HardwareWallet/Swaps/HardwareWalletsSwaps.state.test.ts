import {
  hardwareWalletsSwapsReducer,
  type HardwareWalletsSwapsEvent,
  type HardwareWalletsSwapsStep,
  type StuckProgressResolution,
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
  HardwareWalletsSwapsEventType,
  initialHardwareWalletsSwapsState,
  buildStartPayload,
  reconcileStuckProgress,
} from './HardwareWalletsSwaps.state';
import { Flow } from './flowStrategy';
import type { TxData } from '@metamask/bridge-controller';

type StartEvent = Extract<
  HardwareWalletsSwapsEvent,
  { type: HardwareWalletsSwapsEventType.Start }
>;

const SENDBUNDLE_START: StartEvent = {
  type: HardwareWalletsSwapsEventType.Start,
  payload: {
    totalSteps: 2,
    flow: Flow.Send,
    gasTokenAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  },
};

const signing = (
  stepKind: HardwareWalletsSwapsStepKind,
): HardwareWalletsSwapsEvent => ({
  type: HardwareWalletsSwapsEventType.Signing,
  payload: { stepKind },
});

const signedEv = (
  stepKind: HardwareWalletsSwapsStepKind,
): HardwareWalletsSwapsEvent => ({
  type: HardwareWalletsSwapsEventType.Signed,
  payload: { stepKind },
});

const signingAt = (
  stepKind: HardwareWalletsSwapsStepKind,
  stepIndex: number,
): HardwareWalletsSwapsEvent => ({
  type: HardwareWalletsSwapsEventType.Signing,
  payload: { stepKind, stepIndex },
});

const signedAt = (
  stepKind: HardwareWalletsSwapsStepKind,
  stepIndex: number,
): HardwareWalletsSwapsEvent => ({
  type: HardwareWalletsSwapsEventType.Signed,
  payload: { stepKind, stepIndex },
});

const rejectedEv = (
  stepKind: HardwareWalletsSwapsStepKind,
): HardwareWalletsSwapsEvent => ({
  type: HardwareWalletsSwapsEventType.Rejected,
  payload: { stepKind },
});

const { Approval, FeeTransfer, Transaction } = HardwareWalletsSwapsStepKind;
const Waiting = HardwareWalletsSwapsStepStatus.Waiting;

// Shared shape-checker for buildSteps tests: dispatches the given Start
// event and asserts the resulting steps match the expected list.
function expectStartBuildsSteps(
  startPayload: StartEvent['payload'],
  expectedSteps: { kind: HardwareWalletsSwapsStepKind; address?: string }[],
) {
  const result = hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
    type: HardwareWalletsSwapsEventType.Start,
    payload: startPayload,
  });
  expect(result.totalSteps).toBe(expectedSteps.length);
  expect(result.currentStep).toBe(0);
  expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
  expect(result.steps).toHaveLength(expectedSteps.length);
  expectedSteps.forEach((step, i) => {
    expect(result.steps[i]).toEqual({
      kind: step.kind,
      status: Waiting,
      ...(step.address !== undefined && { address: step.address }),
    });
  });
  return result;
}

const evmTx = (to: `0x${string}`): TxData => ({
  chainId: 1,
  from: '0x0000000000000000000000000000000000000001',
  to,
  value: '0x0',
  data: '0x',
  gasLimit: 21000,
});

describe('hardwareWalletsSwapsReducer', () => {
  it('starts on the first transaction step', () => {
    const state = initialHardwareWalletsSwapsState;

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Start,
      payload: { totalSteps: 2 },
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(0);
    expect(result.totalSteps).toBe(2);
  });

  it('marks the first step signed and waits for the second transaction', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(1);
    expect(result.steps[0].status).toBe(HardwareWalletsSwapsStepStatus.Signed);
    expect(result.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
  });

  it('submits after the last step is signed', () => {
    const firstSignedState = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 2 },
      }),
      {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      },
    );

    const result = hardwareWalletsSwapsReducer(firstSignedState, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Submitted);
    expect(result.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Signed);
  });

  it('records the rejected step without advancing', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Rejected,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Rejected);
    expect(result.currentStep).toBe(0);
    expect(result.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Rejected,
    );
  });

  it('retries from the rejected step', () => {
    const rejectedState = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 2 },
      }),
      {
        type: HardwareWalletsSwapsEventType.Rejected,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      },
    );

    const result = hardwareWalletsSwapsReducer(rejectedState, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(0);
    expect(result.steps[0].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
  });

  it('retries from step 1 after rejection on step 2', () => {
    const firstSignedState = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 2 },
      }),
      {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      },
    );

    const rejectedState = hardwareWalletsSwapsReducer(firstSignedState, {
      type: HardwareWalletsSwapsEventType.Rejected,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(rejectedState.currentStep).toBe(1);
    expect(rejectedState.steps[1].status).toBe(
      HardwareWalletsSwapsStepStatus.Rejected,
    );

    const result = hardwareWalletsSwapsReducer(rejectedState, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(0);
    expect(result.steps[0].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
    expect(result.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
  });

  it('transitions to disconnected and back via retry', () => {
    const state = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 2 },
      }),
      {
        type: HardwareWalletsSwapsEventType.Signing,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      },
    );

    const disconnected = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });

    expect(disconnected.status).toBe(HardwareWalletsSwapsStatus.Disconnected);
    expect(disconnected.disconnectedStep).toBe(0);

    const retried = hardwareWalletsSwapsReducer(disconnected, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(retried.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(retried.currentStep).toBe(0);
    expect(retried.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Waiting,
    );
    expect(retried.disconnectedStep).toBeNull();
  });

  it('transitions to failed state', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Failed);
  });

  it('retries from failed state', () => {
    const failedState = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 1 },
      }),
      { type: HardwareWalletsSwapsEventType.TransactionFailed },
    );

    const result = hardwareWalletsSwapsReducer(failedState, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
  });

  it('ignores RETRY outside retryable states', () => {
    const waitingState = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 1 } },
    );
    const submittedState = hardwareWalletsSwapsReducer(waitingState, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });
    const cancelledState = hardwareWalletsSwapsReducer(waitingState, {
      type: HardwareWalletsSwapsEventType.Cancel,
    });

    [
      initialHardwareWalletsSwapsState,
      waitingState,
      submittedState,
      cancelledState,
    ].forEach((nonRetryableState) => {
      const result = hardwareWalletsSwapsReducer(nonRetryableState, {
        type: HardwareWalletsSwapsEventType.Retry,
      });

      expect(result).toBe(nonRetryableState);
    });
  });

  it('cancels the active progress flow', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Cancel,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Cancelled);
  });

  it('ignores CANCEL when status is Idle', () => {
    const result = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Cancel },
    );

    expect(result).toBe(initialHardwareWalletsSwapsState);
  });

  it('ignores CANCEL when status is Submitted', () => {
    const started = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 1 } },
    );
    const submittedState = hardwareWalletsSwapsReducer(started, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    const result = hardwareWalletsSwapsReducer(submittedState, {
      type: HardwareWalletsSwapsEventType.Cancel,
    });

    expect(result).toBe(submittedState);
  });

  it('ignores CANCEL when status is already Cancelled', () => {
    const started = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 1 } },
    );
    const cancelledState = hardwareWalletsSwapsReducer(started, {
      type: HardwareWalletsSwapsEventType.Cancel,
    });

    const result = hardwareWalletsSwapsReducer(cancelledState, {
      type: HardwareWalletsSwapsEventType.Cancel,
    });

    expect(result).toBe(cancelledState);
  });

  it('processes Signed event by step kind regardless of current step order', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Signed);
    expect(result.currentStep).toBe(2);
  });

  it('does not overwrite Rejected status with TRANSACTION_FAILED', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const rejected = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Rejected,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    const result = hardwareWalletsSwapsReducer(rejected, {
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Rejected);
  });

  it('clamps totalSteps to 1 when START is called with 0', () => {
    const result = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 0 },
      },
    );

    expect(result.totalSteps).toBe(1);
    expect(result.currentStep).toBe(0);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].kind).toBe(HardwareWalletsSwapsStepKind.Transaction);
  });

  it('rejects the current step when REJECTED has no payload', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Rejected,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Rejected);
    expect(result.currentStep).toBe(0);
    expect(result.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Rejected,
    );
  });

  it('processes Signing event by step kind for any active step', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Signing,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Signing);
    expect(result.currentStep).toBe(1);
  });

  it('transitions from Submitted to Failed on TRANSACTION_FAILED (publish failure)', () => {
    const started = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 1 } },
    );

    const signed = hardwareWalletsSwapsReducer(started, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    const result = hardwareWalletsSwapsReducer(signed, {
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Failed);
  });

  it('does not overwrite Disconnected status with TRANSACTION_FAILED', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const disconnected = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });

    const result = hardwareWalletsSwapsReducer(disconnected, {
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Disconnected);
  });

  it('populates step addresses from START payload', () => {
    const result = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      {
        type: HardwareWalletsSwapsEventType.Start,
        payload: {
          totalSteps: 2,
          spenderAddress: '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
          recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        },
      },
    );

    expect(result.steps[0].address).toBe(
      '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
    );
    expect(result.steps[1].address).toBe(
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    );
  });

  it('omits addresses when not provided in START payload', () => {
    const result = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 2 },
      },
    );

    expect(result.steps[0].address).toBeUndefined();
    expect(result.steps[1].address).toBeUndefined();
  });

  it('assigns recipient address to the only step for single-step flows', () => {
    const result = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      {
        type: HardwareWalletsSwapsEventType.Start,
        payload: {
          totalSteps: 1,
          recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        },
      },
    );

    expect(result.steps[0].address).toBe(
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    );
    expect(result.steps[0].kind).toBe(HardwareWalletsSwapsStepKind.Transaction);
  });

  it('ignores SIGNING when status is Submitted', () => {
    const submittedState = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 1 },
      }),
      {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
      },
    );

    const result = hardwareWalletsSwapsReducer(submittedState, {
      type: HardwareWalletsSwapsEventType.Signing,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result).toBe(submittedState);
  });

  it('ignores SIGNED when status is Submitted', () => {
    const submittedState = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 1 },
      }),
      {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
      },
    );

    expect(submittedState.status).toBe(HardwareWalletsSwapsStatus.Submitted);

    const result = hardwareWalletsSwapsReducer(submittedState, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result).toBe(submittedState);
  });

  it('ignores late REJECTED after the final step has submitted', () => {
    const submittedState = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 1 },
      }),
      {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
      },
    );

    expect(submittedState.status).toBe(HardwareWalletsSwapsStatus.Submitted);
    expect(submittedState.currentStep).toBe(1);

    const result = hardwareWalletsSwapsReducer(submittedState, {
      type: HardwareWalletsSwapsEventType.Rejected,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result).toBe(submittedState);
  });

  it('ignores late REJECTED after the progress flow has been cancelled', () => {
    const cancelledState = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 1 },
      }),
      { type: HardwareWalletsSwapsEventType.Cancel },
    );

    expect(cancelledState.status).toBe(HardwareWalletsSwapsStatus.Cancelled);

    const result = hardwareWalletsSwapsReducer(cancelledState, {
      type: HardwareWalletsSwapsEventType.Rejected,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result).toBe(cancelledState);
  });

  it('REJECTED without payload uses fallback when current step has matching kind', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Rejected,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Rejected);
    expect(result.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Rejected,
    );
  });

  it('REJECTED without payload falls back to current step index map', () => {
    const state: import('./HardwareWalletsSwaps.state').HardwareWalletsSwapsState =
      {
        status: HardwareWalletsSwapsStatus.Waiting,
        currentStep: 1,
        totalSteps: 2,
        steps: [
          {
            kind: HardwareWalletsSwapsStepKind.Approval,
            status: HardwareWalletsSwapsStepStatus.Waiting,
          },
          {
            kind: HardwareWalletsSwapsStepKind.Transaction,
            status: HardwareWalletsSwapsStepStatus.Waiting,
          },
        ],
        disconnectedStep: null,
      };

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Rejected,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Rejected);
    expect(result.steps[1].status).toBe(
      HardwareWalletsSwapsStepStatus.Rejected,
    );
  });

  it('returns state unchanged for unknown event type', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const unknownEvent = {
      type: 'UNKNOWN_EVENT',
    } as unknown as HardwareWalletsSwapsEvent;

    const result = hardwareWalletsSwapsReducer(state, unknownEvent);

    expect(result).toBe(state);
  });

  it('retries from disconnected restores disconnectedStep when set', () => {
    const state = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(
        hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
          type: HardwareWalletsSwapsEventType.Start,
          payload: { totalSteps: 2 },
        }),
        {
          type: HardwareWalletsSwapsEventType.Signing,
          payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
        },
      ),
      { type: HardwareWalletsSwapsEventType.DeviceDisconnected },
    );

    expect(state.disconnectedStep).toBe(0);

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(0);
    expect(result.steps[0].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
    expect(result.disconnectedStep).toBeNull();
  });

  it('retries from disconnected at step 2 resets all steps to waiting', () => {
    const started = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );
    const approvalSigned = hardwareWalletsSwapsReducer(started, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });
    const disconnected = hardwareWalletsSwapsReducer(approvalSigned, {
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });

    expect(disconnected.disconnectedStep).toBe(1);
    expect(disconnected.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Signed,
    );

    const result = hardwareWalletsSwapsReducer(disconnected, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(0);
    expect(result.steps[0].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
    expect(result.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
    expect(result.disconnectedStep).toBeNull();
  });

  it('ignores SIGNING when status is Failed', () => {
    const state = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 2 },
      }),
      { type: HardwareWalletsSwapsEventType.TransactionFailed },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Signing,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    expect(result).toBe(state);
  });

  it('ignores SIGNING when status is Cancelled', () => {
    const state = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 2 },
      }),
      { type: HardwareWalletsSwapsEventType.Cancel },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Signing,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    expect(result).toBe(state);
  });

  it('ignores SIGNED when status is Disconnected', () => {
    const state = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 2 },
      }),
      { type: HardwareWalletsSwapsEventType.DeviceDisconnected },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    expect(result).toBe(state);
  });

  it('builds [Transaction, FeeTransfer] for a sendbundle Start (flow=send, totalSteps=2)', () => {
    expectStartBuildsSteps(SENDBUNDLE_START.payload, [
      {
        kind: Transaction,
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      },
      {
        kind: FeeTransfer,
        address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      },
    ]);
  });

  it('builds [Transaction] for a plain send Start (flow=send, totalSteps=1)', () => {
    expectStartBuildsSteps(
      {
        totalSteps: 1,
        flow: Flow.Send,
        recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      },
      [
        {
          kind: Transaction,
          address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        },
      ],
    );
  });

  it('runs the full sendbundle lifecycle: Start → Signing/Signed Transaction → Signing/Signed FeeTransfer → Submitted', () => {
    const started = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      SENDBUNDLE_START,
    );

    const txSigning = hardwareWalletsSwapsReducer(
      started,
      signing(Transaction),
    );
    expect(txSigning.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Signing,
    );
    expect(txSigning.currentStep).toBe(0);

    // Transaction signed → currentStep advances to FeeTransfer (1).
    const txSigned = hardwareWalletsSwapsReducer(
      txSigning,
      signedEv(Transaction),
    );
    expect(txSigned.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Signed,
    );
    expect(txSigned.steps[1].status).toBe(Waiting);
    expect(txSigned.currentStep).toBe(1);
    expect(txSigned.status).toBe(HardwareWalletsSwapsStatus.Waiting);

    const feeSigning = hardwareWalletsSwapsReducer(
      txSigned,
      signing(FeeTransfer),
    );
    expect(feeSigning.steps[1].status).toBe(
      HardwareWalletsSwapsStepStatus.Signing,
    );
    expect(feeSigning.currentStep).toBe(1);

    // FeeTransfer signed → both Signed, status Submitted.
    const feeSigned = hardwareWalletsSwapsReducer(
      feeSigning,
      signedEv(FeeTransfer),
    );
    expect(feeSigned.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Signed,
    );
    expect(feeSigned.steps[1].status).toBe(
      HardwareWalletsSwapsStepStatus.Signed,
    );
    expect(feeSigned.currentStep).toBe(2);
    expect(feeSigned.status).toBe(HardwareWalletsSwapsStatus.Submitted);
  });

  it('targets repeated sendbundle Transaction steps by stepIndex', () => {
    const started = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      {
        type: HardwareWalletsSwapsEventType.Start,
        payload: {
          totalSteps: 3,
          flow: Flow.Send,
          gasTokenAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
          recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        },
      },
    );

    expect(started.steps.map((step) => step.kind)).toEqual([
      Transaction,
      Transaction,
      FeeTransfer,
    ]);

    const firstTxSigning = hardwareWalletsSwapsReducer(
      started,
      signingAt(Transaction, 0),
    );
    const secondTxSigning = hardwareWalletsSwapsReducer(
      firstTxSigning,
      signingAt(Transaction, 1),
    );

    expect(secondTxSigning.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Signing,
    );
    expect(secondTxSigning.steps[1].status).toBe(
      HardwareWalletsSwapsStepStatus.Signing,
    );

    const firstTxSigned = hardwareWalletsSwapsReducer(
      secondTxSigning,
      signedAt(Transaction, 0),
    );
    expect(firstTxSigned.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Signed,
    );
    expect(firstTxSigned.steps[1].status).toBe(
      HardwareWalletsSwapsStepStatus.Signing,
    );
    expect(firstTxSigned.status).toBe(HardwareWalletsSwapsStatus.Waiting);

    const secondTxSigned = hardwareWalletsSwapsReducer(
      firstTxSigned,
      signedAt(Transaction, 1),
    );
    expect(secondTxSigned.steps[1].status).toBe(
      HardwareWalletsSwapsStepStatus.Signed,
    );
    // Both Transaction steps signed; FeeTransfer (index 2) still pending, so
    // currentStep advances to 2 and status stays Waiting (not Submitted).
    expect(secondTxSigned.steps[2].status).toBe(Waiting);
    expect(secondTxSigned.currentStep).toBe(2);
    expect(secondTxSigned.status).toBe(HardwareWalletsSwapsStatus.Waiting);
  });

  it('advances plain send (flow=send, totalSteps=1) to Submitted after Signing → Signed', () => {
    const started = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 1, flow: Flow.Send },
      },
    );

    const stepSigning = hardwareWalletsSwapsReducer(
      started,
      signing(Transaction),
    );
    expect(stepSigning.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Signing,
    );

    const stepSigned = hardwareWalletsSwapsReducer(
      stepSigning,
      signedEv(Transaction),
    );
    expect(stepSigned.status).toBe(HardwareWalletsSwapsStatus.Submitted);
    expect(stepSigned.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Signed,
    );
  });

  it('retries a mid-batch sendbundle rejection by resetting both steps to Waiting', () => {
    const txSigned = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(
        initialHardwareWalletsSwapsState,
        SENDBUNDLE_START,
      ),
      signedEv(Transaction),
    );
    const rej = hardwareWalletsSwapsReducer(txSigned, rejectedEv(FeeTransfer));
    expect(rej.status).toBe(HardwareWalletsSwapsStatus.Rejected);
    expect(rej.steps[0].status).toBe(HardwareWalletsSwapsStepStatus.Signed);
    expect(rej.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Rejected);

    const retried = hardwareWalletsSwapsReducer(rej, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(retried.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(retried.currentStep).toBe(0);
    expect(retried.steps[0].status).toBe(Waiting);
    expect(retried.steps[1].status).toBe(Waiting);
  });

  it('does NOT produce a FeeTransfer step for a bridge Start that omits flow', () => {
    // Regression gate: bridge Start without `flow` must never emit FeeTransfer.
    const result = expectStartBuildsSteps(
      {
        totalSteps: 2,
        spenderAddress: '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
        recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      },
      [
        {
          kind: Approval,
          address: '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
        },
        {
          kind: Transaction,
          address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        },
      ],
    );
    expect(result.steps.some((s) => s.kind === FeeTransfer)).toBe(false);
  });

  it('does NOT produce a FeeTransfer step for an explicit flow=bridge Start', () => {
    expectStartBuildsSteps(
      {
        totalSteps: 2,
        flow: Flow.Bridge,
        spenderAddress: '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
        recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      },
      [
        {
          kind: Approval,
          address: '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
        },
        {
          kind: Transaction,
          address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        },
      ],
    );
  });

  it('throws when a sendbundle Start (flow=send, totalSteps>1) omits gasTokenAddress', () => {
    // Without gasTokenAddress the tracker cannot identify the FeeTransfer tx
    // (it matches by `txParams.to === gasTokenAddress`), so the flow would
    // hang. The reducer fails loudly instead.
    expect(() =>
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: {
          totalSteps: 2,
          flow: Flow.Send,
          recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        },
      }),
    ).toThrow(/gasTokenAddress/);
  });

  it('does not require gasTokenAddress for a plain send Start (flow=send, totalSteps=1)', () => {
    expect(() =>
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 1, flow: Flow.Send },
      }),
    ).not.toThrow();
  });

  it('does not require gasTokenAddress for a bridge Start without flow', () => {
    expect(() =>
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: HardwareWalletsSwapsEventType.Start,
        payload: { totalSteps: 2 },
      }),
    ).not.toThrow();
  });
});

describe('buildStartPayload', () => {
  it('builds single-step payload without approval', () => {
    const result = buildStartPayload({
      trade: evmTx('0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc'),
    }) as StartEvent;

    expect(result.type).toBe(HardwareWalletsSwapsEventType.Start);
    expect(result.payload.totalSteps).toBe(1);
    expect(result.payload.spenderAddress).toBeUndefined();
    expect(result.payload.recipientAddress).toBe(
      '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    );
  });

  it('builds two-step payload with approval addresses', () => {
    const result = buildStartPayload({
      approval: evmTx('0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc'),
      trade: evmTx('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'),
    }) as StartEvent;

    expect(result.type).toBe(HardwareWalletsSwapsEventType.Start);
    expect(result.payload.totalSteps).toBe(2);
    expect(result.payload.spenderAddress).toBe(
      '0x3C44CdDdB6a900fa2b585dd29e6B6F907B4c6CDc',
    );
    expect(result.payload.recipientAddress).toBe(
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    );
  });
});

describe('reconcileStuckProgress', () => {
  const step = (
    kind: HardwareWalletsSwapsStepKind,
    status: HardwareWalletsSwapsStepStatus,
  ): HardwareWalletsSwapsStep => ({ kind, status });

  it('returns a navigate resolution when every step is Signed', () => {
    const steps = [
      step(
        HardwareWalletsSwapsStepKind.Approval,
        HardwareWalletsSwapsStepStatus.Signed,
      ),
      step(
        HardwareWalletsSwapsStepKind.Transaction,
        HardwareWalletsSwapsStepStatus.Signed,
      ),
    ];

    const resolution = reconcileStuckProgress(steps);

    expect(resolution).toEqual<StuckProgressResolution>({ action: 'navigate' });
  });

  it('dispatches Signed for the only unsigned step when exactly one step is unsigned', () => {
    const steps = [
      step(
        HardwareWalletsSwapsStepKind.Approval,
        HardwareWalletsSwapsStepStatus.Signed,
      ),
      step(
        HardwareWalletsSwapsStepKind.Transaction,
        HardwareWalletsSwapsStepStatus.Waiting,
      ),
    ];

    const resolution = reconcileStuckProgress(steps);

    expect(resolution).toEqual<StuckProgressResolution>({
      action: 'dispatch',
      event: {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: {
          stepKind: HardwareWalletsSwapsStepKind.Transaction,
          stepIndex: 1,
        },
      },
    });
  });

  it('dispatches Signed for a lone unsigned step regardless of position', () => {
    const steps = [
      step(
        HardwareWalletsSwapsStepKind.Approval,
        HardwareWalletsSwapsStepStatus.Waiting,
      ),
      step(
        HardwareWalletsSwapsStepKind.Transaction,
        HardwareWalletsSwapsStepStatus.Signed,
      ),
    ];

    const resolution = reconcileStuckProgress(steps);

    expect(resolution).toEqual<StuckProgressResolution>({
      action: 'dispatch',
      event: {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: {
          stepKind: HardwareWalletsSwapsStepKind.Approval,
          stepIndex: 0,
        },
      },
    });
  });

  it('dispatches TransactionFailed when more than one step is unsigned', () => {
    // Regression: previously the safety net dispatched Signed for only the
    // last unsigned step, flipping overall status to Submitted while an
    // earlier step stayed Waiting. allStepsSigned then never became true,
    // so success navigation never fired and the flow hung permanently.
    // Multiple missed events means the "missed the final event" premise no
    // longer holds, so fail explicitly instead of half-completing.
    const steps = [
      step(
        HardwareWalletsSwapsStepKind.Approval,
        HardwareWalletsSwapsStepStatus.Waiting,
      ),
      step(
        HardwareWalletsSwapsStepKind.Transaction,
        HardwareWalletsSwapsStepStatus.Waiting,
      ),
    ];

    const resolution = reconcileStuckProgress(steps);

    expect(resolution).toEqual<StuckProgressResolution>({
      action: 'dispatch',
      event: { type: HardwareWalletsSwapsEventType.TransactionFailed },
    });
  });

  it('dispatches TransactionFailed when two of three steps are unsigned', () => {
    const steps = [
      step(
        HardwareWalletsSwapsStepKind.Approval,
        HardwareWalletsSwapsStepStatus.Signed,
      ),
      step(
        HardwareWalletsSwapsStepKind.Transaction,
        HardwareWalletsSwapsStepStatus.Waiting,
      ),
      step(
        HardwareWalletsSwapsStepKind.FeeTransfer,
        HardwareWalletsSwapsStepStatus.Waiting,
      ),
    ];

    const resolution = reconcileStuckProgress(steps);

    expect(resolution).toEqual<StuckProgressResolution>({
      action: 'dispatch',
      event: { type: HardwareWalletsSwapsEventType.TransactionFailed },
    });
  });

  it('treats a Signing step as the single unsigned step', () => {
    const steps = [
      step(
        HardwareWalletsSwapsStepKind.Approval,
        HardwareWalletsSwapsStepStatus.Signed,
      ),
      step(
        HardwareWalletsSwapsStepKind.Transaction,
        HardwareWalletsSwapsStepStatus.Signing,
      ),
    ];

    const resolution = reconcileStuckProgress(steps);

    expect(resolution).toEqual<StuckProgressResolution>({
      action: 'dispatch',
      event: {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: {
          stepKind: HardwareWalletsSwapsStepKind.Transaction,
          stepIndex: 1,
        },
      },
    });
  });
});
