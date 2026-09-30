import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';
import {
  isUnclaimedPrewarmTransaction,
  resetUnclaimedPrewarmTransactionMetricsForTesting,
  stashUnclaimedPrewarmTransactionAdded,
  suppressUnclaimedPrewarmTransactionAdded,
  trackStashedPrewarmTransactionAdded,
} from './unclaimedPrewarmTransactionMetrics';
import {
  claimPrewarmedDepositOrder,
  discardPrewarmedDepositOrder,
  prewarmDepositOrder,
  releasePrewarmedDepositOrderClaim,
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

const stashDeposit = (transactionId: string, emitted: string[]) => {
  const transaction = {
    id: transactionId,
    type: TransactionType.perpsDepositAndOrder,
  };
  if (suppressUnclaimedPrewarmTransactionAdded(transaction)) {
    stashUnclaimedPrewarmTransactionAdded(transactionId, () => {
      emitted.push(transactionId);
    });
  }
};

const depositThatStashes = (
  transactionId: string,
  result: Promise<string>,
  emitted: string[],
) =>
  jest.fn().mockImplementation(async () => {
    stashDeposit(transactionId, emitted);
    return { result };
  });

describe('prewarmedDepositOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrewarmedDepositOrderForTesting();
    resetUnclaimedPrewarmTransactionMetricsForTesting();
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
      expect(resolveDepositOrderProvider(PROVIDER_CONFIG.LighterProvider)).toBe(
        PROVIDER_CONFIG.LighterProvider,
      );
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

    it('holds Transaction Added until claim and drops it when the prewarm is rejected', async () => {
      const emitted: string[] = [];
      const deposit = jest.fn().mockImplementation(async () => {
        const transaction = {
          id: 'tx-1',
          type: TransactionType.perpsDepositAndOrder,
        };
        if (suppressUnclaimedPrewarmTransactionAdded(transaction)) {
          stashUnclaimedPrewarmTransactionAdded('tx-1', () => {
            emitted.push('tx-1');
          });
        }
        return { result: Promise.resolve('tx-1') };
      });
      setTransactionStatus('tx-1');

      await prewarmDepositOrder(CRITERIA, deposit);

      expect(emitted).toEqual([]);
      expect(isUnclaimedPrewarmTransaction('tx-1')).toBe(true);

      await claimPrewarmedDepositOrder(CRITERIA);
      trackStashedPrewarmTransactionAdded('tx-1');

      expect(emitted).toEqual(['tx-1']);
      expect(isUnclaimedPrewarmTransaction('tx-1')).toBe(false);
    });

    it('keeps the next prewarm metrics when a discarded in-flight prewarm resolves', async () => {
      const emitted: string[] = [];
      const { deposit: firstDeposit, resolve } = deferredDeposit('tx-1');
      const first = jest.fn().mockImplementation(async () => {
        stashDeposit('tx-1', emitted);
        return firstDeposit();
      });
      const pendingFirst = prewarmDepositOrder(CRITERIA, first);

      discardPrewarmedDepositOrder();
      const secondCriteria = {
        ...CRITERIA,
        accountAddress: '0xdef',
      };
      setTransactionStatus('tx-2');
      const pendingSecond = prewarmDepositOrder(
        secondCriteria,
        depositThatStashes('tx-2', Promise.resolve('tx-2'), emitted),
      );
      resolve();
      await pendingFirst;
      await pendingSecond;

      expect(emitted).toEqual([]);
      expect(isUnclaimedPrewarmTransaction('tx-2')).toBe(true);

      await claimPrewarmedDepositOrder(secondCriteria);
      await trackStashedPrewarmTransactionAdded('tx-2');

      expect(emitted).toEqual(['tx-2']);
      expect(isUnclaimedPrewarmTransaction('tx-1')).toBe(false);
    });

    it('keeps the next prewarm metrics when a discarded in-flight prewarm fails', async () => {
      const emitted: string[] = [];
      let rejectResult: (error: Error) => void = () => undefined;
      const result = new Promise<string>((_resolve, reject) => {
        rejectResult = reject;
      });
      const pendingFirst = prewarmDepositOrder(CRITERIA, async () => {
        stashDeposit('tx-1', emitted);
        return { result };
      });

      discardPrewarmedDepositOrder();
      setTransactionStatus('tx-2');
      const pendingSecond = prewarmDepositOrder(
        CRITERIA,
        depositThatStashes('tx-2', Promise.resolve('tx-2'), emitted),
      );
      rejectResult(new Error('result failed'));
      await expect(pendingFirst).rejects.toThrow('result failed');
      await pendingSecond;

      expect(emitted).toEqual([]);
      expect(isUnclaimedPrewarmTransaction('tx-1')).toBe(false);
      expect(isUnclaimedPrewarmTransaction('tx-2')).toBe(true);

      await claimPrewarmedDepositOrder(CRITERIA);
      await trackStashedPrewarmTransactionAdded('tx-2');

      expect(emitted).toEqual(['tx-2']);
    });

    it('does not emit Transaction Added when an unclaimed prewarm is discarded', async () => {
      const emitted: string[] = [];
      const deposit = jest.fn().mockImplementation(async () => {
        const transaction = {
          id: 'tx-1',
          type: TransactionType.perpsDepositAndOrder,
        };
        if (suppressUnclaimedPrewarmTransactionAdded(transaction)) {
          stashUnclaimedPrewarmTransactionAdded('tx-1', () => {
            emitted.push('tx-1');
          });
        }
        return { result: Promise.resolve('tx-1') };
      });
      setTransactionStatus('tx-1');
      await prewarmDepositOrder(CRITERIA, deposit);

      discardPrewarmedDepositOrder();

      expect(emitted).toEqual([]);
      expect(isUnclaimedPrewarmTransaction('tx-1')).toBe(false);
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

    it('does not prepare a transaction after Long/Short claimed with nothing ready', () => {
      const deposit = resolvedDeposit('tx-1');
      claimPrewarmedDepositOrder(CRITERIA);

      const prewarm = prewarmDepositOrder(CRITERIA, deposit);

      expect(prewarm).toBeUndefined();
      expect(deposit).not.toHaveBeenCalled();
    });

    it('does not prepare another transaction after a ready one was claimed', async () => {
      setTransactionStatus('tx-1');
      const deposit = resolvedDeposit('tx-1');
      await prewarmDepositOrder(CRITERIA, deposit);
      await claimPrewarmedDepositOrder(CRITERIA);

      const prewarm = prewarmDepositOrder(CRITERIA, deposit);

      expect(prewarm).toBeUndefined();
      expect(deposit).toHaveBeenCalledTimes(1);
    });

    it('prepares again once the claim is released', async () => {
      setTransactionStatus('tx-1');
      claimPrewarmedDepositOrder(CRITERIA);

      releasePrewarmedDepositOrderClaim();
      await prewarmDepositOrder(CRITERIA, resolvedDeposit('tx-1'));

      await expect(claimPrewarmedDepositOrder(CRITERIA)).resolves.toBe('tx-1');
    });

    it('prepares again once the claim is discarded', async () => {
      setTransactionStatus('tx-1');
      claimPrewarmedDepositOrder(CRITERIA);

      discardPrewarmedDepositOrder();
      await prewarmDepositOrder(CRITERIA, resolvedDeposit('tx-1'));

      expect(mockedEngine.rejectPendingApproval).not.toHaveBeenCalled();
      await expect(claimPrewarmedDepositOrder(CRITERIA)).resolves.toBe('tx-1');
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
        providerId: PROVIDER_CONFIG.LighterProvider,
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

  describe('releasePrewarmedDepositOrderClaim', () => {
    it('leaves a ready transaction claimable', async () => {
      setTransactionStatus('tx-1');
      await prewarmDepositOrder(CRITERIA, resolvedDeposit('tx-1'));

      releasePrewarmedDepositOrderClaim();

      expect(mockedEngine.rejectPendingApproval).not.toHaveBeenCalled();
      await expect(claimPrewarmedDepositOrder(CRITERIA)).resolves.toBe('tx-1');
    });

    it('is a no-op when nothing was claimed', () => {
      expect(() => releasePrewarmedDepositOrderClaim()).not.toThrow();
      expect(claimPrewarmedDepositOrder(CRITERIA)).toBeUndefined();
    });
  });
});
