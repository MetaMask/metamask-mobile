import { act, renderHook } from '@testing-library/react-native';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';

let mockDispatch: jest.Mock;
let mockNavigate: jest.Mock;
let mockApprovalRequestId: string | undefined;
let mockGasTokenAddress: string | undefined;
let mockDisplayAmount: string | undefined;
let mockDisplaySymbol: string | undefined;
let mockIsHardwareAccount: boolean;

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../util/address', () => ({
  isHardwareAccount: () => mockIsHardwareAccount,
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  resetHardwareWalletsSwaps: jest.fn(),
  updateHardwareWalletsSwaps: jest.fn((action) => action),
}));

jest.mock('../../../Views/confirmations/hooks/gas/useGasFeeToken', () => ({
  useSelectedGasFeeToken: () => ({ tokenAddress: mockGasTokenAddress }),
}));

jest.mock('../../../Views/confirmations/hooks/useTokenAmount', () => ({
  useTokenAmount: () => ({ amount: mockDisplayAmount }),
}));

jest.mock('../../../Views/confirmations/hooks/useTokenAsset', () => ({
  useTokenAsset: () => ({ displayName: mockDisplaySymbol }),
}));

jest.mock('../../../Views/confirmations/hooks/useApprovalRequest', () => ({
  __esModule: true,
  default: () => ({ approvalRequest: { id: mockApprovalRequestId } }),
}));

import { useHandleHwSend } from './useHandleHwSend';
import {
  resetHardwareWalletsSwaps,
  updateHardwareWalletsSwaps,
} from '../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsEventType } from './HardwareWalletsSwaps.state';
import { Flow } from './flowStrategy';
import Routes from '../../../../constants/navigation/Routes';

const mockReset = resetHardwareWalletsSwaps as unknown as jest.Mock;
const mockUpdate = updateHardwareWalletsSwaps as unknown as jest.Mock;

// ---------- Test fixture ----------

function buildMetadata(
  overrides: Partial<TransactionMeta> & {
    txParams?: Partial<TransactionMeta['txParams']>;
    batchTransactions?: TransactionMeta['batchTransactions'];
  } = {},
): TransactionMeta {
  const { txParams, batchTransactions, ...rest } = overrides;
  return {
    id: 'tx-1',
    txParams: {
      from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      data: '0x',
      gas: '0x5208',
      maxFeePerGas: '0x1',
      maxPriorityFeePerGas: '0x1',
      ...txParams,
    },
    type: TransactionType.simpleSend,
    ...(batchTransactions !== undefined ? { batchTransactions } : {}),
    ...rest,
  } as unknown as TransactionMeta;
}

function applyHwSend(
  api: ReturnType<typeof useHandleHwSend>,
  meta: TransactionMeta,
): boolean {
  const matches = api.shouldDefer(meta);
  if (matches) api.defer(meta);
  return matches;
}

describe('useHandleHwSend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsHardwareAccount = true;
    mockGasTokenAddress = undefined;
    mockDisplayAmount = undefined;
    mockDisplaySymbol = undefined;
    mockApprovalRequestId = 'approval-1';
    mockDispatch = jest.fn();
    mockNavigate = jest.fn();
  });

  it('guard: returns false and skips dispatch/navigate for non-HW accounts', () => {
    mockIsHardwareAccount = false;
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(result.current, buildMetadata());
    });

    expect(handled).toBe(false);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('guard: returns false for contractInteraction tx type (dapp-typed txn rejected)', () => {
    mockIsHardwareAccount = true;
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(
        result.current,
        buildMetadata({ type: TransactionType.contractInteraction }),
      );
    });

    expect(handled).toBe(false);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('guard: returns false for bridge tx type (bridge uses a different path)', () => {
    mockIsHardwareAccount = true;
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(
        result.current,
        buildMetadata({ type: TransactionType.bridge }),
      );
    });

    expect(handled).toBe(false);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('native simpleSend happy path: dispatches Start(totalSteps=1) and navigates', () => {
    // defaults: HW account, simpleSend, no gas token, no batch.
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(result.current, buildMetadata());
    });

    expect(handled).toBe(true);
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Start,
      payload: {
        flow: Flow.Send,
        totalSteps: 1,
        recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        gasTokenAddress: undefined,
      },
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BRIDGE.HARDWARE_WALLETS_SWAPS,
      expect.objectContaining({
        flow: Flow.Send,
        gasTokenAddress: undefined,
      }),
    );
  });

  it('ERC-20 transfer (tokenMethodTransfer) passes the guard with totalSteps=1', () => {
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(
        result.current,
        buildMetadata({ type: TransactionType.tokenMethodTransfer }),
      );
    });

    expect(handled).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ totalSteps: 1 }),
      }),
    );
  });

  it('totalSteps=2 when gas token is set AND batchTransactions is non-empty', () => {
    mockGasTokenAddress = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(
        result.current,
        buildMetadata({
          batchTransactions: [{} as unknown as TransactionMeta],
        }),
      );
    });

    expect(handled).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Start,
      payload: expect.objectContaining({
        totalSteps: 2,
        gasTokenAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      }),
    });
    const [, navParams] = mockNavigate.mock.calls[0] as [
      string,
      { gasTokenAddress?: string },
    ];
    expect(navParams.gasTokenAddress).toBe(
      '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    );
  });

  it('totalSteps includes every bundled child transaction plus the root send', () => {
    mockGasTokenAddress = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(
        result.current,
        buildMetadata({
          batchTransactions: [
            {} as unknown as TransactionMeta,
            {} as unknown as TransactionMeta,
          ],
        }),
      );
    });

    expect(handled).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Start,
      payload: expect.objectContaining({
        totalSteps: 3,
        gasTokenAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      }),
    });
  });

  it('totalSteps=1 when gas token is set but batchTransactions is empty (gas token alone must NOT produce totalSteps=2)', () => {
    mockGasTokenAddress = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(result.current, buildMetadata());
    });

    expect(handled).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      type: HardwareWalletsSwapsEventType.Start,
      payload: expect.objectContaining({
        totalSteps: 1,
        gasTokenAddress: undefined,
      }),
    });
    const [, navParams] = mockNavigate.mock.calls[0] as [
      string,
      { gasTokenAddress?: string },
    ];
    expect(navParams.gasTokenAddress).toBeUndefined();
  });

  it('forwards displayContext (amount, tokenSymbol, recipient) to the navigate params', () => {
    mockDisplayAmount = '1.5';
    mockDisplaySymbol = 'USDC';
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(result.current, buildMetadata());
    });

    expect(handled).toBe(true);
    const [, navParams] = mockNavigate.mock.calls[0] as [
      string,
      {
        displayContext: {
          amount?: string;
          tokenSymbol?: string;
          recipient?: string;
        };
      },
    ];
    expect(navParams.displayContext).toEqual({
      amount: '1.5',
      tokenSymbol: 'USDC',
      recipient: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    });
  });

  it('forwards approvalRequestId to the navigate params (WALLET SAFETY: lets the signing screen assert it accepts the same pending approval)', () => {
    mockApprovalRequestId = 'approval-42';
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(result.current, buildMetadata());
    });

    expect(handled).toBe(true);
    const [, navParams] = mockNavigate.mock.calls[0] as [
      string,
      { approvalRequestId?: string },
    ];
    expect(navParams.approvalRequestId).toBe('approval-42');
  });

  it('forwards the exact preparedTxMeta object reference (identity)', () => {
    const metaRef = buildMetadata();
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(result.current, metaRef);
    });

    // same object reference, not a deep clone.
    expect(handled).toBe(true);
    const [, navParams] = mockNavigate.mock.calls[0] as [
      string,
      { preparedTxMeta?: TransactionMeta },
    ];
    expect(navParams.preparedTxMeta).toBe(metaRef);
  });

  it('dispatches reset BEFORE update (Start must land on a clean state)', () => {
    const { result } = renderHook(() => useHandleHwSend());

    act(() => {
      applyHwSend(result.current, buildMetadata());
    });

    const resetOrder = mockReset.mock.invocationCallOrder[0];
    const updateOrder = mockUpdate.mock.invocationCallOrder[0];
    expect(resetOrder).toBeDefined();
    expect(updateOrder).toBeDefined();
    expect(resetOrder).toBeLessThan(updateOrder);
  });

  it('handles a missing approvalRequest id gracefully (approvalRequestId is undefined)', () => {
    mockApprovalRequestId = undefined;
    const { result } = renderHook(() => useHandleHwSend());

    let handled: boolean = false;
    act(() => {
      handled = applyHwSend(result.current, buildMetadata());
    });

    // no crash, and the param is undefined.
    expect(handled).toBe(true);
    const [, navParams] = mockNavigate.mock.calls[0] as [
      string,
      { approvalRequestId?: string },
    ];
    expect(navParams.approvalRequestId).toBeUndefined();
  });
});
