import {
  hardwareWalletsSwapsReducer,
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  initialHardwareWalletsSwapsState,
} from './HardwareWalletsSwaps.state';

describe('hardwareWalletsSwapsReducer', () => {
  it('starts on the first transaction step', () => {
    const state = initialHardwareWalletsSwapsState;

    const result = hardwareWalletsSwapsReducer(state, {
      type: 'START',
      payload: { totalSteps: 2 },
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(1);
    expect(result.totalSteps).toBe(2);
  });

  it('marks the first step signed and waits for the second transaction', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: 'START', payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: 'SIGNED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(2);
    expect(result.steps[0].status).toBe('signed');
    expect(result.steps[1].status).toBe('waiting');
  });

  it('submits after the last step is signed', () => {
    const firstSignedState = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: 'START',
        payload: { totalSteps: 2 },
      }),
      {
        type: 'SIGNED',
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      },
    );

    const result = hardwareWalletsSwapsReducer(firstSignedState, {
      type: 'SIGNED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Submitted);
    expect(result.steps[1].status).toBe('signed');
  });

  it('records the rejected step without advancing', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: 'START', payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: 'REJECTED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Rejected);
    expect(result.currentStep).toBe(1);
    expect(result.steps[0].status).toBe('rejected');
  });

  it('retries from the rejected step', () => {
    const rejectedState = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: 'START',
        payload: { totalSteps: 2 },
      }),
      {
        type: 'REJECTED',
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      },
    );

    const result = hardwareWalletsSwapsReducer(rejectedState, {
      type: 'RETRY',
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(1);
    expect(result.steps[0].status).toBe('waiting');
  });

  it('transitions to disconnected and back via retry', () => {
    const state = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: 'START',
        payload: { totalSteps: 2 },
      }),
      {
        type: 'SIGNING',
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      },
    );

    const disconnected = hardwareWalletsSwapsReducer(state, {
      type: 'DEVICE_DISCONNECTED',
    });

    expect(disconnected.status).toBe(HardwareWalletsSwapsStatus.Disconnected);
    expect(disconnected.disconnectedStep).toBe(1);

    const retried = hardwareWalletsSwapsReducer(disconnected, {
      type: 'RETRY',
    });

    expect(retried.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(retried.currentStep).toBe(1);
    expect(retried.steps[0].status).toBe('waiting');
    expect(retried.disconnectedStep).toBeNull();
  });

  it('transitions to failed state', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: 'START', payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: 'TRANSACTION_FAILED',
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Failed);
  });

  it('retries from failed state', () => {
    const failedState = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
        type: 'START',
        payload: { totalSteps: 1 },
      }),
      { type: 'TRANSACTION_FAILED' },
    );

    const result = hardwareWalletsSwapsReducer(failedState, {
      type: 'RETRY',
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
  });

  it('cancels the active progress flow', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: 'START', payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: 'CANCEL',
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Cancelled);
  });

  it('ignores events for a step kind that is not current', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: 'START', payload: { totalSteps: 2 } },
    );

    const result = hardwareWalletsSwapsReducer(state, {
      type: 'SIGNED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result).toBe(state);
  });

  it('does not overwrite Rejected status with TRANSACTION_FAILED', () => {
    const state = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: 'START', payload: { totalSteps: 2 } },
    );

    const rejected = hardwareWalletsSwapsReducer(state, {
      type: 'REJECTED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    const result = hardwareWalletsSwapsReducer(rejected, {
      type: 'TRANSACTION_FAILED',
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Rejected);
  });

  it('does not overwrite Submitted status with TRANSACTION_FAILED', () => {
    const started = hardwareWalletsSwapsReducer(
      initialHardwareWalletsSwapsState,
      { type: 'START', payload: { totalSteps: 1 } },
    );

    const signed = hardwareWalletsSwapsReducer(started, {
      type: 'SIGNED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    const result = hardwareWalletsSwapsReducer(signed, {
      type: 'TRANSACTION_FAILED',
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Submitted);
  });
});
