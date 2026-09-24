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
    PerpsController: { state: { lastDepositTransactionId: null } },
  },
  rejectPendingApproval: jest.fn(),
}));

const mockedEngine = jest.mocked(Engine);
const hasRequest = Engine.context.ApprovalController.hasRequest as jest.Mock;

const CRITERIA = {
  accountAddress: '0xabc',
  providerId: PROVIDER_CONFIG.DefaultProvider,
};

/** Puts the controllers in the state a live, unapproved prewarm would produce. */
function givenLiveTransaction(transactionId: string) {
  Engine.context.PerpsController.state.lastDepositTransactionId = transactionId;
  Engine.context.TransactionController.state.transactions = [
    { id: transactionId, status: TransactionStatus.unapproved },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any;
  hasRequest.mockReturnValue(true);
}

describe('prewarmedDepositOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrewarmedDepositOrderForTesting();
    Engine.context.TransactionController.state.transactions = [];
    Engine.context.PerpsController.state.lastDepositTransactionId = null;
  });

  describe('resolveDepositOrderProvider', () => {
    it('falls back to the default provider in aggregated mode', () => {
      expect(
        resolveDepositOrderProvider(PROVIDER_CONFIG.AggregatedProvider),
      ).toBe(PROVIDER_CONFIG.DefaultProvider);
    });

    it('falls back to the default provider when no provider is active', () => {
      expect(resolveDepositOrderProvider(undefined)).toBe(
        PROVIDER_CONFIG.DefaultProvider,
      );
    });

    it('keeps a concrete active provider', () => {
      expect(resolveDepositOrderProvider('lighter')).toBe('lighter');
    });
  });

  describe('prewarmDepositOrder', () => {
    it('prepares a transaction and exposes it for claiming', async () => {
      givenLiveTransaction('tx-1');
      const depositWithOrder = jest.fn().mockResolvedValue(undefined);

      await prewarmDepositOrder(CRITERIA, depositWithOrder);

      expect(depositWithOrder).toHaveBeenCalledTimes(1);
      await expect(claimPrewarmedDepositOrder(CRITERIA)).resolves.toBe('tx-1');
    });

    it('does not prepare a second transaction while one is usable', async () => {
      givenLiveTransaction('tx-1');
      const depositWithOrder = jest.fn().mockResolvedValue(undefined);
      await prewarmDepositOrder(CRITERIA, depositWithOrder);

      const second = prewarmDepositOrder(CRITERIA, depositWithOrder);

      expect(second).toBeUndefined();
      expect(depositWithOrder).toHaveBeenCalledTimes(1);
    });

    it('does not prepare a second transaction while prep is in flight', async () => {
      givenLiveTransaction('tx-1');
      const depositWithOrder = jest.fn().mockResolvedValue(undefined);

      const first = prewarmDepositOrder(CRITERIA, depositWithOrder);
      const second = prewarmDepositOrder(CRITERIA, depositWithOrder);
      await Promise.all([first, second]);

      expect(depositWithOrder).toHaveBeenCalledTimes(1);
    });

    it('rejects when prep produced no transaction id', async () => {
      const depositWithOrder = jest.fn().mockResolvedValue(undefined);

      await expect(
        prewarmDepositOrder(CRITERIA, depositWithOrder),
      ).rejects.toThrow('Prewarmed deposit order produced no transaction id');
    });
  });

  describe('claimPrewarmedDepositOrder', () => {
    it('returns undefined when nothing was prepared', () => {
      expect(claimPrewarmedDepositOrder(CRITERIA)).toBeUndefined();
    });

    it('returns undefined for a different account', async () => {
      givenLiveTransaction('tx-1');
      await prewarmDepositOrder(
        CRITERIA,
        jest.fn().mockResolvedValue(undefined),
      );

      expect(
        claimPrewarmedDepositOrder({ ...CRITERIA, accountAddress: '0xdef' }),
      ).toBeUndefined();
    });

    it('returns undefined for a different provider', async () => {
      givenLiveTransaction('tx-1');
      await prewarmDepositOrder(
        CRITERIA,
        jest.fn().mockResolvedValue(undefined),
      );

      expect(
        claimPrewarmedDepositOrder({ ...CRITERIA, providerId: 'lighter' }),
      ).toBeUndefined();
    });

    it('ignores case differences in the account address', async () => {
      givenLiveTransaction('tx-1');
      await prewarmDepositOrder(
        CRITERIA,
        jest.fn().mockResolvedValue(undefined),
      );

      await expect(
        claimPrewarmedDepositOrder({ ...CRITERIA, accountAddress: '0xABC' }),
      ).resolves.toBe('tx-1');
    });

    it('returns undefined once a dapp request cleared the approval', async () => {
      givenLiveTransaction('tx-1');
      await prewarmDepositOrder(
        CRITERIA,
        jest.fn().mockResolvedValue(undefined),
      );
      hasRequest.mockReturnValue(false);

      expect(claimPrewarmedDepositOrder(CRITERIA)).toBeUndefined();
    });

    it('returns undefined once the transaction is no longer unapproved', async () => {
      givenLiveTransaction('tx-1');
      await prewarmDepositOrder(
        CRITERIA,
        jest.fn().mockResolvedValue(undefined),
      );
      Engine.context.TransactionController.state.transactions = [
        { id: 'tx-1', status: TransactionStatus.submitted },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any;

      expect(claimPrewarmedDepositOrder(CRITERIA)).toBeUndefined();
    });

    it('can only be claimed once', async () => {
      givenLiveTransaction('tx-1');
      await prewarmDepositOrder(
        CRITERIA,
        jest.fn().mockResolvedValue(undefined),
      );

      await claimPrewarmedDepositOrder(CRITERIA);

      expect(claimPrewarmedDepositOrder(CRITERIA)).toBeUndefined();
    });

    it('resolves against prep that is still in flight', async () => {
      givenLiveTransaction('tx-1');
      let resolveDeposit: () => void = () => undefined;
      const depositWithOrder = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveDeposit = resolve;
          }),
      );
      prewarmDepositOrder(CRITERIA, depositWithOrder);

      const claimed = claimPrewarmedDepositOrder(CRITERIA);
      resolveDeposit();

      await expect(claimed).resolves.toBe('tx-1');
    });
  });

  describe('discardPrewarmedDepositOrder', () => {
    it('rejects an unclaimed transaction', async () => {
      givenLiveTransaction('tx-1');
      await prewarmDepositOrder(
        CRITERIA,
        jest.fn().mockResolvedValue(undefined),
      );

      discardPrewarmedDepositOrder();

      expect(mockedEngine.rejectPendingApproval).toHaveBeenCalledWith(
        'tx-1',
        expect.anything(),
        { ignoreMissing: true, logErrors: false },
      );
    });

    it('rejects a transaction that prep delivers after the discard', async () => {
      givenLiveTransaction('tx-1');
      let resolveDeposit: () => void = () => undefined;
      const pending = prewarmDepositOrder(
        CRITERIA,
        jest.fn(
          () =>
            new Promise<void>((resolve) => {
              resolveDeposit = resolve;
            }),
        ),
      );

      discardPrewarmedDepositOrder();
      resolveDeposit();
      await pending;

      expect(mockedEngine.rejectPendingApproval).toHaveBeenCalledWith(
        'tx-1',
        expect.anything(),
        { ignoreMissing: true, logErrors: false },
      );
    });

    it('does not reject a transaction that was already claimed', async () => {
      givenLiveTransaction('tx-1');
      await prewarmDepositOrder(
        CRITERIA,
        jest.fn().mockResolvedValue(undefined),
      );
      await claimPrewarmedDepositOrder(CRITERIA);

      discardPrewarmedDepositOrder();

      expect(mockedEngine.rejectPendingApproval).not.toHaveBeenCalled();
    });

    it('does not reject in-flight prep that was already claimed', async () => {
      givenLiveTransaction('tx-1');
      let resolveDeposit: () => void = () => undefined;
      prewarmDepositOrder(
        CRITERIA,
        jest.fn(
          () =>
            new Promise<void>((resolve) => {
              resolveDeposit = resolve;
            }),
        ),
      );
      const claimed = claimPrewarmedDepositOrder(CRITERIA);

      discardPrewarmedDepositOrder();
      resolveDeposit();
      await claimed;

      expect(mockedEngine.rejectPendingApproval).not.toHaveBeenCalled();
    });

    it('does nothing when there is nothing prepared', () => {
      discardPrewarmedDepositOrder();

      expect(mockedEngine.rejectPendingApproval).not.toHaveBeenCalled();
    });

    it('swallows failures from rejecting the approval', async () => {
      givenLiveTransaction('tx-1');
      await prewarmDepositOrder(
        CRITERIA,
        jest.fn().mockResolvedValue(undefined),
      );
      mockedEngine.rejectPendingApproval.mockImplementation(() => {
        throw new Error('approval already gone');
      });

      expect(() => discardPrewarmedDepositOrder()).not.toThrow();
    });
  });
});
