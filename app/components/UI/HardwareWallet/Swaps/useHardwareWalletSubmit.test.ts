import { renderHook, act, waitFor } from '@testing-library/react-native';
import type { Dispatch, AnyAction } from 'redux';
import { type TransactionMeta } from '@metamask/transaction-controller';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsEventType,
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
  type HardwareWalletsSwapsState,
} from './HardwareWalletsSwaps.state';
import { useHardwareWalletSubmit } from './useHardwareWalletSubmit';

const mockAcceptPendingApproval = jest.fn();
const mockSubmitBridgeTx = jest.fn();
const mockShowHardwareWalletError = jest.fn();
const mockDispatch = jest.fn((action: unknown) => action);

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    acceptPendingApproval: (...args: unknown[]) =>
      mockAcceptPendingApproval(...args),
    controllerMessenger: {
      call: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
    context: {},
  },
}));

jest.mock('../../../../core/HardwareWallet', () => ({
  useHardwareWallet: () => ({
    showHardwareWalletError: mockShowHardwareWalletError,
  }),
}));

jest.mock('../../../../core/HardwareWallet/helpers', () => ({
  getDeviceIdForAddress: jest.fn().mockResolvedValue('device-1'),
  getHardwareWalletTypeName: jest.fn(() => 'Ledger'),
}));

jest.mock('../../../Views/confirmations/hooks/useApprovalRequest', () => ({
  __esModule: true,
  default: () => ({
    approvalRequest: {
      id: 'approval-1',
      requestData: { from: '0xabc' },
    },
  }),
}));

jest.mock('../../../../util/bridge/hooks/useSubmitBridgeTx', () => ({
  __esModule: true,
  default: () => ({ submitBridgeTx: mockSubmitBridgeTx }),
}));

jest.mock('../../Bridge/utils/postTradeNotifications', () => ({
  withPostTradeNotificationSuppression: jest.fn(async (fn) => fn()),
  showPostTradeNotificationSurface: jest.fn(),
  hidePostTradeNotificationSurface: jest.fn(),
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  updateHardwareWalletsSwaps: jest.fn((event) => event),
}));

const preparedTxMeta = {
  id: 'tx-1',
  txParams: { from: '0xfrom' },
} as unknown as TransactionMeta;

const waitingProgressState: HardwareWalletsSwapsState = {
  status: HardwareWalletsSwapsStatus.Waiting,
  currentStep: 0,
  totalSteps: 1,
  steps: [
    {
      kind: HardwareWalletsSwapsStepKind.Transaction,
      status: HardwareWalletsSwapsStepStatus.Waiting,
    },
  ],
  disconnectedStep: null,
};

const submittedProgressState: HardwareWalletsSwapsState = {
  status: HardwareWalletsSwapsStatus.Submitted,
  currentStep: 1,
  totalSteps: 1,
  steps: [
    {
      kind: HardwareWalletsSwapsStepKind.Transaction,
      status: HardwareWalletsSwapsStepStatus.Signed,
    },
  ],
  disconnectedStep: null,
};

/** Renders the hook exactly as production wires it: send via approval accept, bridge via submitBridgeTx. */
function renderSubmitHook(isSendFlow: boolean) {
  const progressRef = { current: waitingProgressState };
  const hook = renderHook(() =>
    useHardwareWalletSubmit({
      isSendFlow,
      walletAddress: '0xfrom',
      dispatch: mockDispatch as unknown as Dispatch<AnyAction>,
      progressRef,
      submissionGenerationRef: { current: 0 },
      preparedTxMeta,
      approvalRequestId: 'approval-1',
      submissionParams: { quoteResponse: {} } as never,
      ensureDeviceReady: jest.fn().mockResolvedValue(true),
      setPendingOperationAddress: jest.fn(),
    }),
  );

  return { ...hook, progressRef };
}

describe('useHardwareWalletSubmit (unified device-rejection handling)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('send flow: dispatches Rejected (inline state, NO error sheet) for a raw TransportStatusError 0x6985', async () => {
    const deviceRejection = Object.assign(
      new Error('Ledger device: Action cancelled by user (0x6985)'),
      { name: 'TransportStatusError', statusCode: 27013 },
    );
    mockAcceptPendingApproval.mockRejectedValue(deviceRejection);

    const { result } = renderSubmitHook(true);

    await act(async () => {
      await result.current.submit();
    });

    // Inline-only UX: the rejection is surfaced by the Rejected state on the
    // progress screen; the error sheet must NOT be shown.
    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();

    // The flow state must be Rejected, not the generic TransactionFailed.
    expect(mockDispatch).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Rejected,
    });
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });
  });

  it('send flow: detects user cancellation from the error message alone', async () => {
    mockAcceptPendingApproval.mockRejectedValue(
      new Error('Ledger device: Action cancelled by user'),
    );

    const { result } = renderSubmitHook(true);

    await act(async () => {
      await result.current.submit();
    });

    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Rejected,
    });
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });
  });

  it("send flow: internal 'Batch cancelled' abort signal is NOT a device rejection", async () => {
    mockAcceptPendingApproval.mockRejectedValue(new Error('Batch cancelled'));

    const { result } = renderSubmitHook(true);

    await act(async () => {
      await result.current.submit();
    });

    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Rejected,
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });
  });

  it('send flow: non-cancellation errors keep the generic TransactionFailed handling', async () => {
    mockAcceptPendingApproval.mockRejectedValue(
      new Error('Some transport blowup'),
    );

    const { result } = renderSubmitHook(true);

    await act(async () => {
      await result.current.submit();
    });

    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Rejected,
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });
  });

  it('bridge flow: non-cancellation submitBridgeTx errors dispatch TransactionFailed without a sheet', async () => {
    // Bridge submitFn rejections are broadcast/publish errors; plain ones
    // must stay on the generic failure path.
    mockSubmitBridgeTx.mockRejectedValue(new Error('Broadcast failed'));

    const { result } = renderSubmitHook(false);

    await act(async () => {
      await result.current.submit();
    });

    expect(mockSubmitBridgeTx).toHaveBeenCalledTimes(1);
    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Rejected,
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });
  });

  it('bridge flow: dispatches TransactionFailed for rejection-shaped broadcast errors after signing', async () => {
    let rejectBroadcast!: (reason?: unknown) => void;
    mockSubmitBridgeTx.mockImplementation(
      () =>
        new Promise<never>((_, reject) => {
          rejectBroadcast = reject;
        }),
    );

    const { result, progressRef } = renderSubmitHook(false);
    let submitPromise!: Promise<void>;

    act(() => {
      submitPromise = result.current.submit();
    });
    await waitFor(() => {
      expect(mockSubmitBridgeTx).toHaveBeenCalledTimes(1);
    });
    progressRef.current = submittedProgressState;

    await act(async () => {
      rejectBroadcast(new Error('Broadcast rejected by provider'));
      await submitPromise;
    });

    expect(mockSubmitBridgeTx).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Rejected,
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });
  });

  it('bridge flow: IF a cancellation-shaped error reaches the unified path, it gets Rejected inline, no sheet (unified behavior)', async () => {
    // Bridge signing errors normally never reach runSubmit's catch (the
    // batch tracker consumes them), but if a device-rejection-shaped error
    // ever rejects submitBridgeTx, the unified branch handles it like send.
    mockSubmitBridgeTx.mockRejectedValue(
      Object.assign(
        new Error('Ledger device: Action cancelled by user (0x6985)'),
        { name: 'TransportStatusError', statusCode: 27013 },
      ),
    );

    const { result } = renderSubmitHook(false);

    await act(async () => {
      await result.current.submit();
    });

    expect(mockSubmitBridgeTx).toHaveBeenCalledTimes(1);
    expect(mockShowHardwareWalletError).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Rejected,
    });
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.TransactionFailed,
    });
  });
});
