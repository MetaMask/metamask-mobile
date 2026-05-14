import {
  hardwareWalletsSwapsReducer,
  type HardwareWalletsSwapsEvent,
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
  HardwareWalletsSwapsEventType,
  initialHardwareWalletsSwapsState,
} from './HardwareWalletsSwaps.state';

describe('hardwareWalletsSwapsReducer', () => {
  it('starts on the first transaction step', () => {
    const state = initialHardwareWalletsSwapsState;

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Start,
      payload: { totalSteps: 2 },
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(1);
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
    expect(result.currentStep).toBe(2);
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
    expect(result.currentStep).toBe(1);
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
    expect(result.currentStep).toBe(1);
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

    expect(rejectedState.currentStep).toBe(2);
    expect(rejectedState.steps[1].status).toBe(
      HardwareWalletsSwapsStepStatus.Rejected,
    );

    const result = hardwareWalletsSwapsReducer(rejectedState, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(1);
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
    expect(disconnected.disconnectedStep).toBe(1);

    const retried = hardwareWalletsSwapsReducer(disconnected, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(retried.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(retried.currentStep).toBe(1);
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

  it('ignores events for a step kind that is not current', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result).toBe(state);
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
    expect(result.currentStep).toBe(1);
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
    expect(result.currentStep).toBe(1);
    expect(result.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Rejected,
    );
  });

  it('ignores SIGNING for a step kind that is not current', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: HardwareWalletsSwapsEventType.Start, payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Signing,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result).toBe(state);
  });

  it('does not overwrite Submitted status with TRANSACTION_FAILED', () => {
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

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Submitted);
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
          spenderAddress: '0xSpender',
          recipientAddress: '0xRecipient',
        },
      },
    );

    expect(result.steps[0].address).toBe('0xSpender');
    expect(result.steps[1].address).toBe('0xRecipient');
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
          recipientAddress: '0xRecipient',
        },
      },
    );

    expect(result.steps[0].address).toBe('0xRecipient');
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
    expect(result.steps[0].status).toBe(
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

    expect(state.disconnectedStep).toBe(1);

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(1);
    expect(result.steps[0].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
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
});
