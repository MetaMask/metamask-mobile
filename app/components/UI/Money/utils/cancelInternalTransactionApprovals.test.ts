import { ApprovalType, ORIGIN_METAMASK } from '@metamask/controller-utils';
import { providerErrors } from '@metamask/rpc-errors';
import {
  TransactionMeta,
  TransactionBatchMeta,
  TransactionType,
} from '@metamask/transaction-controller';
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
      TransactionController: {
        state: {
          transactions: [],
          transactionBatches: [],
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

const setTransactions = (transactions: Partial<TransactionMeta>[]) => {
  Engine.context.TransactionController.state.transactions =
    transactions as never;
};

const setTransactionBatches = (
  transactionBatches: Partial<TransactionBatchMeta>[],
) => {
  Engine.context.TransactionController.state.transactionBatches =
    transactionBatches as never;
};

describe('cancelInternalTransactionApprovals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPendingApprovals({});
    setTransactions([]);
    setTransactionBatches([]);
  });

  it('rejects a single internal money-deposit Transaction approval', () => {
    setPendingApprovals({
      'tx-1': {
        id: 'tx-1',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.Transaction,
      },
    });
    setTransactions([
      { id: 'tx-1', type: TransactionType.moneyAccountDeposit },
    ]);

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).toHaveBeenCalledTimes(1);
    expect(mockRejectPendingApproval).toHaveBeenCalledWith(
      'tx-1',
      expect.any(Error),
      { ignoreMissing: true, logErrors: false },
    );
    expect(mockUserRejectedRequest).toHaveBeenCalledTimes(1);
  });

  it('rejects a money-deposit TransactionBatch approval', () => {
    setPendingApprovals({
      'batch-1': {
        id: 'batch-1',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.TransactionBatch,
      },
    });
    setTransactionBatches([
      {
        id: 'batch-1',
        transactions: [
          { type: TransactionType.tokenMethodApprove },
          { type: TransactionType.moneyAccountDeposit },
        ],
      },
    ]);

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).toHaveBeenCalledTimes(1);
    expect(mockRejectPendingApproval).toHaveBeenCalledWith(
      'batch-1',
      expect.any(Error),
      { ignoreMissing: true, logErrors: false },
    );
  });

  it('rejects money-deposit identified via nested transactions on a Transaction approval', () => {
    setPendingApprovals({
      'tx-nested': {
        id: 'tx-nested',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.Transaction,
      },
    });
    setTransactions([
      {
        id: 'tx-nested',
        type: TransactionType.batch,
        nestedTransactions: [
          { type: TransactionType.tokenMethodApprove },
          { type: TransactionType.moneyAccountDeposit },
        ],
      },
    ]);

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).toHaveBeenCalledTimes(1);
    expect(mockRejectPendingApproval).toHaveBeenCalledWith(
      'tx-nested',
      expect.any(Error),
      { ignoreMissing: true, logErrors: false },
    );
  });

  it('does not reject internal swap Transaction approvals', () => {
    setPendingApprovals({
      'swap-tx': {
        id: 'swap-tx',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.Transaction,
      },
    });
    setTransactions([{ id: 'swap-tx', type: TransactionType.swap }]);

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).not.toHaveBeenCalled();
  });

  it('does not reject internal non-deposit TransactionBatch approvals', () => {
    setPendingApprovals({
      'swap-batch': {
        id: 'swap-batch',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.TransactionBatch,
      },
    });
    setTransactionBatches([
      {
        id: 'swap-batch',
        transactions: [
          { type: TransactionType.tokenMethodApprove },
          { type: TransactionType.swap },
        ],
      },
    ]);

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).not.toHaveBeenCalled();
  });

  it('does not reject a money-deposit Transaction approval from a non-internal origin', () => {
    setPendingApprovals({
      'tx-dapp': {
        id: 'tx-dapp',
        origin: 'https://uniswap.org',
        type: ApprovalType.Transaction,
      },
    });
    setTransactions([
      { id: 'tx-dapp', type: TransactionType.moneyAccountDeposit },
    ]);

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

  it('does not reject when no backing transaction or batch is found', () => {
    setPendingApprovals({
      'tx-missing': {
        id: 'tx-missing',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.Transaction,
      },
      'batch-missing': {
        id: 'batch-missing',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.TransactionBatch,
      },
    });

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).not.toHaveBeenCalled();
  });

  it('only rejects the internal money-deposit approvals when a mixed set is pending', () => {
    setPendingApprovals({
      'deposit-tx': {
        id: 'deposit-tx',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.Transaction,
      },
      'deposit-batch': {
        id: 'deposit-batch',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.TransactionBatch,
      },
      'swap-tx': {
        id: 'swap-tx',
        origin: ORIGIN_METAMASK,
        type: ApprovalType.Transaction,
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
    setTransactions([
      { id: 'deposit-tx', type: TransactionType.moneyAccountDeposit },
      { id: 'swap-tx', type: TransactionType.swap },
      { id: 'dapp-tx', type: TransactionType.moneyAccountDeposit },
    ]);
    setTransactionBatches([
      {
        id: 'deposit-batch',
        transactions: [{ type: TransactionType.moneyAccountDeposit }],
      },
    ]);

    cancelInternalTransactionApprovals();

    expect(mockRejectPendingApproval).toHaveBeenCalledTimes(2);
    const rejectedIds = mockRejectPendingApproval.mock.calls.map(([id]) => id);
    expect(rejectedIds).toEqual(
      expect.arrayContaining(['deposit-tx', 'deposit-batch']),
    );
    expect(rejectedIds).not.toContain('swap-tx');
    expect(rejectedIds).not.toContain('dapp-tx');
    expect(rejectedIds).not.toContain('internal-sig');
  });

  it('does not throw when there are no pending approvals', () => {
    setPendingApprovals({});

    expect(() => cancelInternalTransactionApprovals()).not.toThrow();
    expect(mockRejectPendingApproval).not.toHaveBeenCalled();
  });
});
