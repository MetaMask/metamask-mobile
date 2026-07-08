import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { providerErrors } from '@metamask/rpc-errors';
import { rejectPendingTransactions } from './rejectPendingTransactions';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

jest.mock('../../../../core/Engine', () => ({
  context: {
    ApprovalController: { rejectRequest: jest.fn() },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockRejectRequest = jest.mocked(
  Engine.context.ApprovalController.rejectRequest,
);

const tx = (id: string, status: TransactionStatus): TransactionMeta =>
  ({ id, status }) as TransactionMeta;

describe('rejectPendingTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects only unapproved transactions', () => {
    rejectPendingTransactions([
      tx('a', TransactionStatus.unapproved),
      tx('b', TransactionStatus.confirmed),
      tx('c', TransactionStatus.submitted),
      tx('d', TransactionStatus.unapproved),
    ]);

    expect(mockRejectRequest).toHaveBeenCalledTimes(2);
    expect(mockRejectRequest).toHaveBeenCalledWith(
      'a',
      providerErrors.userRejectedRequest(),
    );
    expect(mockRejectRequest).toHaveBeenCalledWith(
      'd',
      providerErrors.userRejectedRequest(),
    );
  });

  it('does nothing when there are no unapproved transactions', () => {
    rejectPendingTransactions([tx('a', TransactionStatus.confirmed)]);

    expect(mockRejectRequest).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('logs and continues when a rejection throws', () => {
    const error = new Error('boom');
    mockRejectRequest.mockImplementationOnce(() => {
      throw error;
    });

    rejectPendingTransactions([
      tx('a', TransactionStatus.unapproved),
      tx('b', TransactionStatus.unapproved),
    ]);

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'Failed to reject pending transaction',
    );
    // The throw on the first tx does not stop the second from being rejected.
    expect(mockRejectRequest).toHaveBeenCalledTimes(2);
  });
});
