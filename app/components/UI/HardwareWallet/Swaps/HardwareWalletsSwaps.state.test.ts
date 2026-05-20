import {
  hardwareWalletsSwapsReducer,
  type HardwareWalletsSwapsEvent,
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
  HardwareWalletsSwapsEventType,
  initialHardwareWalletsSwapsState,
  buildStartPayload,
} from './HardwareWalletsSwaps.state';

function startSwap(
  totalSteps = 2,
  payload?: { spenderAddress?: string; recipientAddress?: string },
) {
  return hardwareWalletsSwapsReducer(initialHardwareWalletsSwapsState, {
    type: HardwareWalletsSwapsEventType.Start,
    payload: { totalSteps, ...payload },
  });
}

function startAndSignApproval(totalSteps = 2) {
  return hardwareWalletsSwapsReducer(startSwap(totalSteps), {
    type: HardwareWalletsSwapsEventType.Signed,
    payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
  });
}

function startAndSubmitSingleStep() {
  return hardwareWalletsSwapsReducer(startSwap(1), {
    type: HardwareWalletsSwapsEventType.Signed,
    payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
  });
}

describe('hardwareWalletsSwapsReducer', () => {
  it('starts on the first transaction step', () => {
    const result = startSwap(2);

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(1);
    expect(result.totalSteps).toBe(2);
  });

  it('marks the first step signed and waits for the second transaction', () => {
    const result = hardwareWalletsSwapsReducer(startSwap(2), {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(2);
    expect(result.steps[0].status).toBe(HardwareWalletsSwapsStepStatus.Signed);
    expect(result.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
  });

  it('submits after the last step is signed', () => {
    const result = hardwareWalletsSwapsReducer(startAndSignApproval(), {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Submitted);
    expect(result.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Signed);
  });

  it('records the rejected step without advancing', () => {
    const result = hardwareWalletsSwapsReducer(startSwap(), {
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
    const rejectedState = hardwareWalletsSwapsReducer(startSwap(), {
      type: HardwareWalletsSwapsEventType.Rejected,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    const result = hardwareWalletsSwapsReducer(rejectedState, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(1);
    expect(result.steps[0].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
  });

  it('retries from step 1 after rejection on step 2', () => {
    const rejectedState = hardwareWalletsSwapsReducer(startAndSignApproval(), {
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
    const state = hardwareWalletsSwapsReducer(startSwap(), {
      type: HardwareWalletsSwapsEventType.Signing,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

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
    const result = hardwareWalletsSwapsReducer(startSwap(), {
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Failed);
  });

  it('retries from failed state', () => {
    const failedState = hardwareWalletsSwapsReducer(startSwap(1), {
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });

    const result = hardwareWalletsSwapsReducer(failedState, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
  });

  it('cancels the active progress flow', () => {
    const result = hardwareWalletsSwapsReducer(startSwap(), {
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
    const submittedState = startAndSubmitSingleStep();
    expect(submittedState.status).toBe(HardwareWalletsSwapsStatus.Submitted);

    const result = hardwareWalletsSwapsReducer(submittedState, {
      type: HardwareWalletsSwapsEventType.Cancel,
    });

    expect(result).toBe(submittedState);
  });

  it('ignores CANCEL when status is already Cancelled', () => {
    const cancelledState = hardwareWalletsSwapsReducer(startSwap(), {
      type: HardwareWalletsSwapsEventType.Cancel,
    });

    const result = hardwareWalletsSwapsReducer(cancelledState, {
      type: HardwareWalletsSwapsEventType.Cancel,
    });

    expect(result).toBe(cancelledState);
  });

  it('processes Signed event by step kind regardless of current step order', () => {
    const result = hardwareWalletsSwapsReducer(startSwap(), {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Signed);
    expect(result.currentStep).toBe(2);
  });

  it('does not overwrite Rejected status with TRANSACTION_FAILED', () => {
    const rejected = hardwareWalletsSwapsReducer(startSwap(), {
      type: HardwareWalletsSwapsEventType.Rejected,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    const result = hardwareWalletsSwapsReducer(rejected, {
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Rejected);
  });

  it('clamps totalSteps to 1 when START is called with 0', () => {
    const result = startSwap(0);

    expect(result.totalSteps).toBe(1);
    expect(result.currentStep).toBe(1);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].kind).toBe(HardwareWalletsSwapsStepKind.Transaction);
  });

  it('rejects the current step when REJECTED has no payload', () => {
    const result = hardwareWalletsSwapsReducer(startSwap(), {
      type: HardwareWalletsSwapsEventType.Rejected,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Rejected);
    expect(result.currentStep).toBe(1);
    expect(result.steps[0].status).toBe(
      HardwareWalletsSwapsStepStatus.Rejected,
    );
  });

  it('processes Signing event by step kind for any active step', () => {
    const result = hardwareWalletsSwapsReducer(startSwap(), {
      type: HardwareWalletsSwapsEventType.Signing,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Signing);
    expect(result.currentStep).toBe(2);
  });

  it('transitions from Submitted to Failed on TRANSACTION_FAILED (publish failure)', () => {
    const signed = hardwareWalletsSwapsReducer(startSwap(1), {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    const result = hardwareWalletsSwapsReducer(signed, {
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Failed);
  });

  it('does not overwrite Disconnected status with TRANSACTION_FAILED', () => {
    const disconnected = hardwareWalletsSwapsReducer(startSwap(), {
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });

    const result = hardwareWalletsSwapsReducer(disconnected, {
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Disconnected);
  });

  it('populates step addresses from START payload', () => {
    const result = startSwap(2, {
      spenderAddress: '0xSpender',
      recipientAddress: '0xRecipient',
    });

    expect(result.steps[0].address).toBe('0xSpender');
    expect(result.steps[1].address).toBe('0xRecipient');
  });

  it('omits addresses when not provided in START payload', () => {
    const result = startSwap(2);

    expect(result.steps[0].address).toBeUndefined();
    expect(result.steps[1].address).toBeUndefined();
  });

  it('assigns recipient address to the only step for single-step flows', () => {
    const result = startSwap(1, { recipientAddress: '0xRecipient' });

    expect(result.steps[0].address).toBe('0xRecipient');
    expect(result.steps[0].kind).toBe(HardwareWalletsSwapsStepKind.Transaction);
  });

  it.each([
    {
      label: 'SIGNING when status is Submitted',
      buildState: () => startAndSubmitSingleStep(),
      event: {
        type: HardwareWalletsSwapsEventType.Signing,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
      } as HardwareWalletsSwapsEvent,
    },
    {
      label: 'SIGNING when status is Failed',
      buildState: () =>
        hardwareWalletsSwapsReducer(startSwap(), {
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      event: {
        type: HardwareWalletsSwapsEventType.Signing,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      } as HardwareWalletsSwapsEvent,
    },
    {
      label: 'SIGNING when status is Cancelled',
      buildState: () =>
        hardwareWalletsSwapsReducer(startSwap(), {
          type: HardwareWalletsSwapsEventType.Cancel,
        }),
      event: {
        type: HardwareWalletsSwapsEventType.Signing,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      } as HardwareWalletsSwapsEvent,
    },
    {
      label: 'SIGNED when status is Submitted',
      buildState: () => startAndSubmitSingleStep(),
      event: {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
      } as HardwareWalletsSwapsEvent,
    },
    {
      label: 'SIGNED when status is Disconnected',
      buildState: () =>
        hardwareWalletsSwapsReducer(startSwap(), {
          type: HardwareWalletsSwapsEventType.DeviceDisconnected,
        }),
      event: {
        type: HardwareWalletsSwapsEventType.Signed,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      } as HardwareWalletsSwapsEvent,
    },
  ])('ignores $label', ({ buildState, event }) => {
    const state = buildState();
    const result = hardwareWalletsSwapsReducer(state, event);
    expect(result).toBe(state);
  });

  it('ignores late REJECTED after the final step has submitted', () => {
    const submittedState = startAndSubmitSingleStep();

    expect(submittedState.status).toBe(HardwareWalletsSwapsStatus.Submitted);
    expect(submittedState.currentStep).toBe(1);

    const result = hardwareWalletsSwapsReducer(submittedState, {
      type: HardwareWalletsSwapsEventType.Rejected,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result).toBe(submittedState);
  });

  it('ignores late REJECTED after the progress flow has been cancelled', () => {
    const cancelledState = hardwareWalletsSwapsReducer(startSwap(1), {
      type: HardwareWalletsSwapsEventType.Cancel,
    });

    expect(cancelledState.status).toBe(HardwareWalletsSwapsStatus.Cancelled);

    const result = hardwareWalletsSwapsReducer(cancelledState, {
      type: HardwareWalletsSwapsEventType.Rejected,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result).toBe(cancelledState);
  });

  it('REJECTED without payload falls back to current step index map', () => {
    const state: import('./HardwareWalletsSwaps.state').HardwareWalletsSwapsState =
      {
        status: HardwareWalletsSwapsStatus.Waiting,
        currentStep: 3,
        totalSteps: 3,
        steps: [
          {
            kind: HardwareWalletsSwapsStepKind.Approval,
            status: HardwareWalletsSwapsStepStatus.Signed,
          },
          {
            kind: HardwareWalletsSwapsStepKind.Transaction,
            status: HardwareWalletsSwapsStepStatus.Signed,
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
    expect(result.steps[2].status).toBe(
      HardwareWalletsSwapsStepStatus.Rejected,
    );
  });

  it('returns state unchanged for unknown event type', () => {
    const state = startSwap();

    const unknownEvent = {
      type: 'UNKNOWN_EVENT',
    } as unknown as HardwareWalletsSwapsEvent;

    const result = hardwareWalletsSwapsReducer(state, unknownEvent);

    expect(result).toBe(state);
  });

  it('retries from disconnected restores disconnectedStep when set', () => {
    const state = hardwareWalletsSwapsReducer(
      hardwareWalletsSwapsReducer(startSwap(), {
        type: HardwareWalletsSwapsEventType.Signing,
        payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
      }),
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

  it('retries from disconnected at step 2 resets all steps to waiting', () => {
    let state = startSwap();
    state = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Signing,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });
    state = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });
    state = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Signing,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });
    state = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.DeviceDisconnected,
    });

    expect(state.disconnectedStep).toBe(2);
    expect(state.steps[0].status).toBe(HardwareWalletsSwapsStepStatus.Signed);

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Retry,
    });

    expect(result.status).toBe(HardwareWalletsSwapsStatus.Waiting);
    expect(result.currentStep).toBe(1);
    expect(result.steps[0].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
    expect(result.steps[1].status).toBe(HardwareWalletsSwapsStepStatus.Waiting);
    expect(result.disconnectedStep).toBeNull();
  });

  it('ignores REJECTED with mismatched stepKind', () => {
    const state = startSwap();

    const result = hardwareWalletsSwapsReducer(state, {
      type: HardwareWalletsSwapsEventType.Rejected,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });

    expect(result).toBe(state);
  });

  it('returns state unchanged when currentStep is 0 for Signed', () => {
    const state = startSwap();

    const stateWithZeroStep: import('./HardwareWalletsSwaps.state').HardwareWalletsSwapsState =
      {
        ...state,
        currentStep: 0,
      };

    const result = hardwareWalletsSwapsReducer(stateWithZeroStep, {
      type: HardwareWalletsSwapsEventType.Signed,
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });

    expect(result.steps).toBe(stateWithZeroStep.steps);
  });
});

describe('buildStartPayload', () => {
  it('builds single-step payload without approval', () => {
    const result = buildStartPayload({
      trade: { to: '0xTrade' },
    });

    expect(result.type).toBe(HardwareWalletsSwapsEventType.Start);
    expect(result.payload.totalSteps).toBe(1);
    expect(result.payload.spenderAddress).toBeUndefined();
    expect(result.payload.recipientAddress).toBe('0xTrade');
  });

  it('builds two-step payload with approval addresses', () => {
    const result = buildStartPayload({
      approval: { to: '0xSpender' },
      trade: { to: '0xRecipient' },
    });

    expect(result.type).toBe(HardwareWalletsSwapsEventType.Start);
    expect(result.payload.totalSteps).toBe(2);
    expect(result.payload.spenderAddress).toBe('0xSpender');
    expect(result.payload.recipientAddress).toBe('0xRecipient');
  });

  it('omits addresses when trade.to is missing', () => {
    const result = buildStartPayload({
      trade: {},
    });

    expect(result.payload.recipientAddress).toBeUndefined();
  });

  it('builds two-step payload for non-EVM approval without spender address', () => {
    const result = buildStartPayload({
      approval: { raw_data_hex: '0xabc' },
      trade: { to: '0xRecipient' },
    });

    expect(result.payload.totalSteps).toBe(2);
    expect(result.payload.spenderAddress).toBeUndefined();
    expect(result.payload.recipientAddress).toBe('0xRecipient');
  });
});
