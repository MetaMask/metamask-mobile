import { ApprovalType, ORIGIN_METAMASK } from '@metamask/controller-utils';
import { providerErrors } from '@metamask/rpc-errors';
import Engine from '../../../../core/Engine';
import { cancelInternalTransactionApprovals } from './cancelInternalTransactionApprovals';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      ApprovalController: {
        state: {
          pendingApprovals: {},
        },
      },
    },
    rejectPendingApproval: jest.fn(),
  },
}));

jest.mock('@metamask/rpc-errors', () => ({
  providerErrors: {
    userRejectedRequest: jest.fn(() => new Error('user rejected request')),
  },
}));

const mockRejectPendingApproval = jest.mocked(Engine.rejectPendingApproval);
const mockUserRejectedRequest = jest.mocked(providerErrors.userRejectedRequest);

const setPendingApprovals = (
  pendingApprovals: Record<
    string,
    {
      id: string;
      origin: string;
      type: string;
      time?: number;
      requestData?: Record<string, unknown>;
      requestState?: Record<string, unknown> | null;
      expectsResult?: boolean;
    }
  >,
) => {
  Engine.context.ApprovalController.state.pendingApprovals =
    pendingApprovals as never;
};

describe('cancelInternalTransactionApprovals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPendingApprovals({});
  });

  it('rejects a single internal Transaction approval', () => {
    setPendingApprovals({
      'tx-1': {
        id: 'tx-1',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.Transaction,
      },
    });

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).toHaveBeenCalledTimes(1);
    expect(mockRejectPendingApproval).toHaveBeenCalledWith(
      'tx-1',
      expect.any(Error),
      { ignoreMissing: true, logErrors: false },
    );
    expect(mockUserRejectedRequest).toHaveBeenCalledTimes(1);
  });

  it('rejects multiple internal Transaction and TransactionBatch approvals', () => {
    setPendingApprovals({
      'tx-1': {
        id: 'tx-1',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.Transaction,
      },
      'tx-2': {
        id: 'tx-2',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.TransactionBatch,
      },
      'tx-3': {
        id: 'tx-3',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.Transaction,
      },
    });

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).toHaveBeenCalledTimes(3);
    expect(mockRejectPendingApproval).toHaveBeenCalledWith(
      'tx-1',
      expect.any(Error),
      { ignoreMissing: true, logErrors: false },
    );
    expect(mockRejectPendingApproval).toHaveBeenCalledWith(
      'tx-2',
      expect.any(Error),
      { ignoreMissing: true, logErrors: false },
    );
    expect(mockRejectPendingApproval).toHaveBeenCalledWith(
      'tx-3',
      expect.any(Error),
      { ignoreMissing: true, logErrors: false },
    );
  });

  it('does not reject approvals from non-internal origins', () => {
    setPendingApprovals({
      'tx-dapp': {
        id: 'tx-dapp',
        origin: 'https://uniswap.org',
        type: ApprovalType.Transaction,
      },
      'tx-wc': {
        id: 'tx-wc',
        origin: 'wc:topic@2',
        type: ApprovalType.TransactionBatch,
      },
    });

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).not.toHaveBeenCalled();
  });

  it('does not reject approvals with unrelated types', () => {
    setPendingApprovals({
      'sig-1': {
        id: 'sig-1',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.EthSignTypedData,
      },
      'chain-1': {
        id: 'chain-1',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.AddEthereumChain,
      },
      'snap-1': {
        id: 'snap-1',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.SnapDialogAlert,
      },
    });

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).not.toHaveBeenCalled();
  });

  it('only rejects the internal Transaction approvals when a mixed set is pending', () => {
    setPendingApprovals({
      'internal-tx': {
        id: 'internal-tx',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.Transaction,
      },
      'internal-batch': {
        id: 'internal-batch',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.TransactionBatch,
      },
      'dapp-tx': {
        id: 'dapp-tx',
        origin: 'https://uniswap.org',
        type: ApprovalType.Transaction,
      },
      'internal-sig': {
        id: 'internal-sig',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.PersonalSign,
      },
    });

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).toHaveBeenCalledTimes(2);
    const rejectedIds = mockRejectPendingApproval.mock.calls.map(([id]) => id);
    expect(rejectedIds).toEqual(
      expect.arrayContaining(['internal-tx', 'internal-batch']),
    );
    expect(rejectedIds).not.toContain('dapp-tx');
    expect(rejectedIds).not.toContain('internal-sig');
  });

  it('does not throw when there are no pending approvals', () => {
    setPendingApprovals({});

    expect(() => cancelInternalTransactionApprovals()).not.toThrow();
    expect(mockRejectPendingApproval).not.toHaveBeenCalled();
  });
});
