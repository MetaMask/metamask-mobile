import { act, renderHook } from '@testing-library/react-native';
import { TransactionStatus, TransactionType } from '@metamask/transaction-controller';
import { useHwBatchSignTracker } from './useHwBatchSignTracker';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsStepKind } from '../Views/HardwareWalletsSwaps/HardwareWalletsSwaps.state';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  updateHardwareWalletsSwaps: jest.fn((action) => action),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn((action) => action),
  useSelector: jest.fn(),
}));

import Engine from '../../../../core/Engine';

const mockSubscribe = Engine.controllerMessenger.subscribe as jest.Mock;
const mockUnsubscribe = Engine.controllerMessenger.unsubscribe as jest.Mock;

const FROM_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

function makeTransactionMeta(
  type: TransactionType,
  status: TransactionStatus,
  from = FROM_ADDRESS,
) {
  return {
    id: `${type}-${status}-${Date.now()}`,
    type,
    status,
    txParams: { from },
  } as any;
}

describe('useHwBatchSignTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not subscribe when disabled', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: false }),
    );

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('does not subscribe when fromAddress is undefined', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: undefined, isEnabled: true }),
    );

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('subscribes to TransactionController events when enabled', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionStatusUpdated',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionRejected',
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionFailed',
      expect.any(Function),
    );
  });

  it('unsubscribes on cleanup', () => {
    const { unmount } = renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(3);
  });

  it('dispatches SIGNING when approval tx is approved', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridgeApproval,
          TransactionStatus.approved,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'SIGNING',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });
  });

  it('dispatches SIGNING with Transaction stepKind for bridge tx', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridge,
          TransactionStatus.approved,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'SIGNING',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });
  });

  it('dispatches SIGNED when approval tx is signed', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridgeApproval,
          TransactionStatus.signed,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'SIGNED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });
  });

  it('dispatches SIGNED with Transaction stepKind for bridge tx', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridge,
          TransactionStatus.signed,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'SIGNED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Transaction },
    });
  });

  it('dispatches REJECTED when transaction is rejected', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionRejected',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridgeApproval,
          TransactionStatus.rejected,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'REJECTED',
      payload: { stepKind: HardwareWalletsSwapsStepKind.Approval },
    });
  });

  it('dispatches TRANSACTION_FAILED when transaction fails', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionFailed',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridge,
          TransactionStatus.failed,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledWith({
      type: 'TRANSACTION_FAILED',
    });
  });

  it('ignores events from a different address', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.bridge,
          TransactionStatus.signed,
          '0xdifferentAddress0000000000000000000000000',
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('ignores non-bridge/swap transaction types', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionStatusUpdated',
    )?.[1];

    act(() => {
      handler!({
        transactionMeta: makeTransactionMeta(
          TransactionType.simpleSend,
          TransactionStatus.signed,
        ),
      });
    });

    expect(updateHardwareWalletsSwaps).not.toHaveBeenCalled();
  });

  it('does not dispatch REJECTED twice for the same transaction', () => {
    renderHook(() =>
      useHwBatchSignTracker({ fromAddress: FROM_ADDRESS, isEnabled: true }),
    );

    const handler = mockSubscribe.mock.calls.find(
      ([event]: [string]) =>
        event === 'TransactionController:transactionRejected',
    )?.[1];

    const txMeta = makeTransactionMeta(
      TransactionType.bridgeApproval,
      TransactionStatus.rejected,
    );

    act(() => {
      handler!({ transactionMeta: txMeta });
      handler!({ transactionMeta: txMeta });
    });

    expect(updateHardwareWalletsSwaps).toHaveBeenCalledTimes(1);
  });
});
