import Engine from '../../Engine';
import { requestSolanaPayQuote } from './request-solana-pay-quote';

jest.mock('../../Engine', () => ({
  __esModule: true,
  default: {
    context: {
      TransactionPayController: {
        getSolanaPayQuote: jest.fn(),
      },
    },
  },
}));

function createDeferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('requestSolanaPayQuote', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shares one in-flight quote request per transaction', async () => {
    const deferred = createDeferred();
    const getQuote = jest.mocked(
      Engine.context.TransactionPayController.getSolanaPayQuote,
    );
    getQuote.mockReturnValue(deferred.promise as never);

    const first = requestSolanaPayQuote('transaction-id');
    const second = requestSolanaPayQuote('transaction-id');
    deferred.resolve({});
    await Promise.all([first, second]);

    expect(getQuote).toHaveBeenCalledTimes(1);
  });
});
