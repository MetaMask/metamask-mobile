import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import {
  renderHookWithProvider,
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { RootState } from '../../../reducers';
import { useAnalyticsFlowFromApproval } from './useAnalyticsFlowFromApproval';
import { HardwareWalletAnalyticsFlow } from './helpers';

const MOCK_TX_ID = 'tx-id-123';

const createStateWithApproval = (
  approvalType: string,
  transactionType?: TransactionType,
): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      ApprovalController: {
        pendingApprovals: {
          [MOCK_TX_ID]: {
            id: MOCK_TX_ID,
            type: approvalType,
          },
        },
      },
      TransactionController: {
        transactions: transactionType
          ? [{ id: MOCK_TX_ID, type: transactionType }]
          : [],
      },
    },
  },
});

const EMPTY_APPROVAL_STATE: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ApprovalController: {
        pendingApprovals: {},
      },
      TransactionController: {
        transactions: [],
      },
    },
  },
};

describe('useAnalyticsFlowFromApproval', () => {
  it('returns Connection when no pending approvals exist', () => {
    const { result } = renderHookWithProvider(
      () => useAnalyticsFlowFromApproval(),
      { state: EMPTY_APPROVAL_STATE },
    );

    expect(result.current).toBe(HardwareWalletAnalyticsFlow.Connection);
  });

  it('returns Message for personal_sign approval', () => {
    const { result } = renderHookWithProvider(
      () => useAnalyticsFlowFromApproval(),
      { state: createStateWithApproval('personal_sign') },
    );

    expect(result.current).toBe(HardwareWalletAnalyticsFlow.Message);
  });

  it('returns Message for eth_signTypedData approval', () => {
    const { result } = renderHookWithProvider(
      () => useAnalyticsFlowFromApproval(),
      { state: createStateWithApproval('eth_signTypedData') },
    );

    expect(result.current).toBe(HardwareWalletAnalyticsFlow.Message);
  });

  it('returns Send for simpleSend transaction', () => {
    const { result } = renderHookWithProvider(
      () => useAnalyticsFlowFromApproval(),
      {
        state: createStateWithApproval(
          ApprovalType.Transaction,
          TransactionType.simpleSend,
        ),
      },
    );

    expect(result.current).toBe(HardwareWalletAnalyticsFlow.Send);
  });

  it('returns Send for tokenMethodTransfer transaction', () => {
    const { result } = renderHookWithProvider(
      () => useAnalyticsFlowFromApproval(),
      {
        state: createStateWithApproval(
          ApprovalType.Transaction,
          TransactionType.tokenMethodTransfer,
        ),
      },
    );

    expect(result.current).toBe(HardwareWalletAnalyticsFlow.Send);
  });

  it('returns Swaps for swap transaction', () => {
    const { result } = renderHookWithProvider(
      () => useAnalyticsFlowFromApproval(),
      {
        state: createStateWithApproval(
          ApprovalType.Transaction,
          TransactionType.swap,
        ),
      },
    );

    expect(result.current).toBe(HardwareWalletAnalyticsFlow.Swaps);
  });

  it('returns Swaps for bridge transaction', () => {
    const { result } = renderHookWithProvider(
      () => useAnalyticsFlowFromApproval(),
      {
        state: createStateWithApproval(
          ApprovalType.Transaction,
          TransactionType.bridge,
        ),
      },
    );

    expect(result.current).toBe(HardwareWalletAnalyticsFlow.Swaps);
  });

  it('returns Transaction for contractInteraction', () => {
    const { result } = renderHookWithProvider(
      () => useAnalyticsFlowFromApproval(),
      {
        state: createStateWithApproval(
          ApprovalType.Transaction,
          TransactionType.contractInteraction,
        ),
      },
    );

    expect(result.current).toBe(HardwareWalletAnalyticsFlow.Transaction);
  });

  it('returns Connection for unrecognized approval type', () => {
    const { result } = renderHookWithProvider(
      () => useAnalyticsFlowFromApproval(),
      { state: createStateWithApproval('unknown_type') },
    );

    expect(result.current).toBe(HardwareWalletAnalyticsFlow.Connection);
  });
});
