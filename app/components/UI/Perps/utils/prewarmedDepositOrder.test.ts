import { TransactionStatus } from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';
import {
  claimPrewarmedDepositOrder,
  discardPrewarmedDepositOrder,
  prewarmDepositOrder,
  resetPrewarmedDepositOrderForTesting,
  resolveDepositOrderProvider,
} from './prewarmedDepositOrder';

jest.mock('../../../../core/Engine', () => ({
  context: {
    ApprovalController: { hasRequest: jest.fn() },
    TransactionController: { state: { transactions: [] } },
  },
  rejectPendingApproval: jest.fn(),
}));

const mockedEngine = jest.mocked(Engine);
const hasRequest = jest.mocked(Engine.context.ApprovalController.hasRequest);
const CRITERIA = {
  accountAddress: '0xabc',
  providerId: PROVIDER_CONFIG.DefaultProvider,
};

const setTransactionStatus = (
  transactionId: string,
  status = TransactionStatus.unapproved,
) => {
  Engine.context.TransactionController.state.transactions = [
    { id: transactionId, status },
    // The controller state requires the complete transaction metadata shape.
  ] as typeof Engine.context.TransactionController.state.transactions;
  hasRequest.mockReturnValue(true);
};

const resolvedDeposit = (transactionId: string) =>
  jest.fn().mockResolvedValue({
    result: Promise.resolve(transactionId),
  });

const deferredDeposit = (transactionId: string) => {
  let resolveResult: (transactionId: string) => void = () => undefined;
  const result = new Promise<string>((resolve) => {
    resolveResult = resolve;
  });
  const deposit = jest.fn().mockResolvedValue({ result });
  const resolve = () => resolveResult(transactionId);
  return { deposit, resolve };
};

describe('prewarmedDepositOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrewarmedDepositOrderForTesting();
    Engine.context.TransactionController.state.transactions = [];
  });

  describe('resolveDepositOrderProvider', () => {
    it('uses the default provider in aggregated mode', () => {
      expect(
        resolveDepositOrderProvider(PROVIDER_CONFIG.AggregatedProvider),
      ).toBe(PROVIDER_CONFIG.DefaultProvider);
    });

    it('uses the default provider when no provider is active', () => {
      expect(resolveDepositOrderProvider(undefined)).toBe(
        PROVIDER_CONFIG.DefaultProvider,
      );
    });

    it('keeps a concrete provider', () => {
      expect(resolveDepositOrderProvider('lighter')).toBe('lighter');
    });
  });

  describe('prewarmDepositOrder', () => {
    it('prepares one transaction and exposes it for claiming', async () => {
      setTransactionStatus('tx-1');
      const deposit = resolvedDeposit('tx-1');

      await prewarmDepositOrder(CRITERIA, deposit);
      const claimed = claimPrewarmedDepositOrder(CRITERIA);

      expect(deposit).toHaveBeenCalledTimes(1);
      await expect(claimed).resolves.toBe('tx-1');
    });

    it('reuses a matching preparation while it is in flight', async () => {
      setTransactionStatus('tx-1');
      const { deposit, resolve } = deferredDeposit('tx-1');

      const first = prewarmDepositOrder(CRITERIA, deposit);
      const second = prewarmDepositOrder(CRITERIA, deposit);
      resolve();

      await expect(Promise.all([first, second])).resolves.toEqual([
        'tx-1',
        'tx-1',
      ]);
      expect(deposit).toHaveBeenCalledTimes(1);
    });

    it('does not prepare another transaction while a ready one is usable', async () => {
      setTransactionStatus('tx-1');
      const deposit = resolvedDeposit('tx-1');
      await prewarmDepositOrder(CRITERIA, deposit);

      const second = prewarmDepositOrder(CRITERIA, deposit);

      expect(second).toBeUndefined();
      expect(deposit).toHaveBeenCalledTimes(1);
    });

    it('allows a new preparation after one fails', async () => {
      const failing = jest.fn().mockRejectedValue(new Error('prep failed'));
      await expect(prewarmDepositOrder(CRITERIA, failing)).rejects.toThrow(
        'prep failed',
      );
      setTransactionStatus('tx-2');

      await prewarmDepositOrder(CRITERIA, resolvedDeposit('tx-2'));

      await expect(claimPrewarmedDepositOrder(CRITERIA)).resolves.toBe('tx-2');
    });

    it('rejects a stale ready transaction before replacing it', async () => {
      setTransactionStatus('tx-1');
      await prewarmDepositOrder(CRITERIA, resolvedDeposit('tx-1'));
      hasRequest.mockReturnValue(false);
      setTransactionStatus('tx-2');

      await prewarmDepositOrder(CRITERIA, resolvedDeposit('tx-2'));

      expect(mockedEngine.rejectPendingApproval).toHaveBeenCalledWith(
        'tx-1',
        expect.anything(),
        { ignoreMissing: true, logErrors: false },
      );
      await expect(claimPrewarmedDepositOrder(CRITERIA)).resolves.toBe('tx-2');
    });
  });

  describe('claimPrewarmedDepositOrder', () => {
    it('returns undefined when nothing is prepared', () => {
      expect(claimPrewarmedDepositOrder(CRITERIA)).toBeUndefined();
    });

    it('rejects a ready transaction for a different account', async () => {
      setTransactionStatus('tx-1');
      await prewarmDepositOrder(CRITERIA, resolvedDeposit('tx-1'));

      const claimed = claimPrewarmedDepositOrder({
        ...CRITERIA,
        accountAddress: '0xdef',
      });

      expect(claimed).toBeUndefined();
      expect(mockedEngine.rejectPendingApproval).toHaveBeenCalledWith(
        'tx-1',
        expect.anything(),
        { ignoreMissing: true, logErrors: false },
      );
    });

    it('discards in-flight prep for a different provider', async () => {
      setTransactionStatus('tx-1');
      const { deposit, resolve } = deferredDeposit('tx-1');
      const pending = prewarmDepositOrder(CRITERIA, deposit);

      const claimed = claimPrewarmedDepositOrder({
        ...CRITERIA,
        providerId: 'lighter',
      });
      resolve();
      await pending;

      expect(claimed).toBeUndefined();
      expect(mockedEngine.rejectPendingApproval).toHaveBeenCalledWith(
        'tx-1',
        expect.anything(),
        { ignoreMissing: true, logErrors: false },
      );
    });

    it('rejects in-flight prep that becomes unusable before it resolves', async () => {
      setTransactionStatus('tx-1');
      const { deposit, resolve } = deferredDeposit('tx-1');
      prewarmDepositOrder(CRITERIA, deposit);
      const claimed = claimPrewarmedDepositOrder(CRITERIA);
      setTransactionStatus('tx-1', TransactionStatus.submitted);
      resolve();

      await expect(claimed).rejects.toThrow(
        'Prewarmed deposit order is no longer usable',
      );
      expect(mockedEngine.rejectPendingApproval).toHaveBeenCalledWith(
        'tx-1',
        expect.anything(),
        { ignoreMissing: true, logErrors: false },
      );
    });

    it('can claim a transaction only once', async () => {
      setTransactionStatus('tx-1');
      await prewarmDepositOrder(CRITERIA, resolvedDeposit('tx-1'));

      await claimPrewarmedDepositOrder(CRITERIA);

      expect(claimPrewarmedDepositOrder(CRITERIA)).toBeUndefined();
    });
  });

  describe('discardPrewarmedDepositOrder', () => {
    it('rejects a ready transaction', async () => {
      setTransactionStatus('tx-1');
      await prewarmDepositOrder(CRITERIA, resolvedDeposit('tx-1'));

      discardPrewarmedDepositOrder();

      expect(mockedEngine.rejectPendingApproval).toHaveBeenCalledWith(
        'tx-1',
        expect.anything(),
        { ignoreMissing: true, logErrors: false },
      );
    });

    it('rejects the exact transaction returned by discarded in-flight prep', async () => {
      setTransactionStatus('tx-1');
      const { deposit, resolve } = deferredDeposit('tx-1');
      const pending = prewarmDepositOrder(CRITERIA, deposit);

      discardPrewarmedDepositOrder();
      setTransactionStatus('tx-2');
      resolve();
      await pending;

      expect(mockedEngine.rejectPendingApproval).toHaveBeenCalledWith(
        'tx-1',
        expect.anything(),
        { ignoreMissing: true, logErrors: false },
      );
      expect(mockedEngine.rejectPendingApproval).not.toHaveBeenCalledWith(
        'tx-2',
        expect.anything(),
        expect.anything(),
      );
    });

    it('does not reject a claimed transaction', async () => {
      setTransactionStatus('tx-1');
      await prewarmDepositOrder(CRITERIA, resolvedDeposit('tx-1'));
      await claimPrewarmedDepositOrder(CRITERIA);

      discardPrewarmedDepositOrder();

      expect(mockedEngine.rejectPendingApproval).not.toHaveBeenCalled();
    });
  });
});
