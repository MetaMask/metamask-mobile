import Engine from '../../Engine';
import Logger from '../../../../util/Logger';
import { recoverSolanaPayTransactions } from './recover-solana-pay';
import NotificationManager from '../../../NotificationManager';

jest.mock('../../../NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      TransactionPayController: {
        recoverSolanaPayStatus: jest.fn(),
      },
    },
  },
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('recoverSolanaPayTransactions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shares one observation-only recovery across concurrent app opens', async () => {
    const deferred = createDeferred<Record<string, never>>();
    const recover = jest.mocked(
      Engine.context.TransactionPayController.recoverSolanaPayStatus,
    );
    recover.mockReturnValue(deferred.promise);

    const first = recoverSolanaPayTransactions();
    const second = recoverSolanaPayTransactions();
    deferred.resolve({});
    await Promise.all([first, second]);

    expect(first).toBe(second);
    expect(recover).toHaveBeenCalledTimes(1);
  });

  it('restores the status-unavailable notification once per recovered execution', async () => {
    const recover = jest.mocked(
      Engine.context.TransactionPayController.recoverSolanaPayStatus,
    );
    recover.mockResolvedValue({
      'unknown-transaction-id': {
        outcome: 'unknown',
      },
    } as never);

    await recoverSolanaPayTransactions();
    await recoverSolanaPayTransactions();

    expect(NotificationManager.showSimpleNotification).toHaveBeenCalledTimes(1);
  });

  it('logs a recovery failure and permits a later foreground retry', async () => {
    const error = new Error('Relay unavailable');
    const recover = jest.mocked(
      Engine.context.TransactionPayController.recoverSolanaPayStatus,
    );
    recover.mockRejectedValueOnce(error).mockResolvedValueOnce({});
    const logger = jest.spyOn(Logger, 'error').mockImplementation();

    await recoverSolanaPayTransactions();
    await recoverSolanaPayTransactions();

    expect(logger).toHaveBeenCalledWith(
      error,
      'Failed to recover Solana Pay transactions',
    );
    expect(recover).toHaveBeenCalledTimes(2);
  });
});
