import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { addTransactionBatch } from '../../../../../util/transaction-controller';
import { getProviderByChainId } from '../../../../../util/notifications/methods/common';
import { isMonadMainnetChainId } from '../../../../../util/networks';
import { selectMoneyAccountVaultConfig } from '../../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { buildMoneyAccountDepositBatch } from '../../../Money/utils/moneyAccountTransactions';
import { ClaimAlreadyOpenError } from '../../../../../core/Engine/controllers/rewards-money-controller/services';
import awaitBatchConfirmed from '../utils/awaitBatchConfirmed';
import type { ClaimVoucherDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { assertVoucherIsLive, useClaimEarnings } from './useClaimEarnings';

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => (selector as () => unknown)(),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: { call: jest.fn() },
    context: {
      NetworkController: {
        findNetworkClientIdByChainId: jest.fn(() => 'monad-client'),
      },
    },
  },
}));

jest.mock('../../../../../util/transaction-controller', () => ({
  addTransactionBatch: jest.fn(),
}));

jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(),
}));

jest.mock('../../../../../util/networks', () => ({
  isMonadMainnetChainId: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    selectMoneyAccountVaultConfig: jest.fn(),
  }),
);

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock('../../../Money/utils/moneyAccountTransactions', () => ({
  buildMoneyAccountDepositBatch: jest.fn(),
  getMoneyAccountDepositCalls: jest.fn((batch: Record<string, unknown>) =>
    ['authorizationTx', 'approveTx', 'depositTx']
      .filter((key) => batch[key])
      .map((key) => ({ key, tx: batch[key] })),
  ),
}));

jest.mock('../utils/awaitBatchConfirmed', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockCall = jest.mocked(Engine.controllerMessenger.call);
const mockVaultConfig = jest.mocked(selectMoneyAccountVaultConfig);
const mockPrimaryAccount = jest.mocked(selectPrimaryMoneyAccount);
const mockIsMonad = jest.mocked(isMonadMainnetChainId);
const mockProvider = jest.mocked(getProviderByChainId);
const mockBuildBatch = jest.mocked(buildMoneyAccountDepositBatch);
const mockAwaitBatch = jest.mocked(awaitBatchConfirmed);
const mockAddBatch = jest.mocked(addTransactionBatch);

const VAULT_CONFIG = {
  chainId: '0x8f',
  boringVault: '0xvault',
  tellerAddress: '0xteller',
  accountantAddress: '0xaccountant',
  lensAddress: '0xlens',
};

const createVoucher = (
  overrides: Partial<ClaimVoucherDto> = {},
): ClaimVoucherDto => ({
  claim_id: 'claim-1',
  from: '0xtreasury',
  to: '0xmoneyaccount',
  value: '12500000',
  valid_after: 0,
  valid_before: Math.floor(Date.now() / 1000) + 60,
  nonce: '0xnonce',
  signature: '0xsignature',
  ...overrides,
});

const setUpHappyPath = () => {
  mockVaultConfig.mockReturnValue(
    VAULT_CONFIG as unknown as ReturnType<typeof selectMoneyAccountVaultConfig>,
  );
  mockPrimaryAccount.mockReturnValue({
    address: '0xmoneyaccount',
  } as unknown as ReturnType<typeof selectPrimaryMoneyAccount>);
  mockIsMonad.mockReturnValue(true);
  mockProvider.mockReturnValue({} as never);
  mockBuildBatch.mockResolvedValue({
    authorizationTx: { params: { to: '0xmusd' }, type: 'contractInteraction' },
    approveTx: { params: { to: '0xmusd' }, type: 'tokenMethodApprove' },
    depositTx: { params: { to: '0xteller' }, type: 'moneyAccountDeposit' },
  } as never);
  mockAwaitBatch.mockImplementation(async ({ submit }) => {
    await submit();
    return { txHash: '0xhash', transactionMeta: {} as never };
  });
  mockCall.mockResolvedValue({
    claim: {},
    voucher: createVoucher(),
    excluded: [],
    status: 'LIVE_VOUCHER',
  } as never);
};

describe('assertVoucherIsLive', () => {
  it('accepts a voucher whose window is still open', () => {
    const voucher = createVoucher({ valid_before: 2000 });

    expect(() => assertVoucherIsLive(voucher, 1_000_000)).not.toThrow();
  });

  it('throws once the one-minute window has closed', () => {
    const voucher = createVoucher({ valid_before: 1000 });

    expect(() => assertVoucherIsLive(voucher, 1_000_001)).toThrow(
      'The claim voucher has expired',
    );
  });
});

describe('useClaimEarnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUpHappyPath();
  });

  describe('isSubmittable', () => {
    it('reports submittable when the vault, account and sponsored chain are all present', () => {
      const { result } = renderHook(() => useClaimEarnings());

      expect(result.current.isSubmittable).toBe(true);
    });

    it('reports not submittable when gas sponsorship is unavailable', () => {
      mockIsMonad.mockReturnValue(false);

      const { result } = renderHook(() => useClaimEarnings());

      expect(result.current.isSubmittable).toBe(false);
    });

    it('reports not submittable when there is no money account', () => {
      mockPrimaryAccount.mockReturnValue(undefined);

      const { result } = renderHook(() => useClaimEarnings());

      expect(result.current.isSubmittable).toBe(false);
    });
  });

  describe('claim', () => {
    it('opens the claim for the requested origin types', async () => {
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:initiateClaim',
        {
          moneyAccountAddress: '0xmoneyaccount',
          originTypes: ['CASHBACK'],
        },
      );
    });

    it('builds the batch with the voucher as an EIP-3009 authorization', async () => {
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      expect(mockBuildBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 12500000n,
          authorization: expect.objectContaining({
            from: '0xtreasury',
            to: '0xmoneyaccount',
            value: '12500000',
            nonce: '0xnonce',
            signature: '0xsignature',
          }),
        }),
      );
    });

    it('submits all three legs in authorization, approve, deposit order', async () => {
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      const submitted = mockAddBatch.mock.calls[0][0];
      expect(submitted.transactions).toHaveLength(3);
      expect(submitted.transactions.map((tx) => tx.type)).toStrictEqual([
        'contractInteraction',
        'tokenMethodApprove',
        'moneyAccountDeposit',
      ]);
    });

    it('declares no requiredAssets, because the authorization already delivers the mUSD', async () => {
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      expect(mockAddBatch.mock.calls[0][0]).not.toHaveProperty(
        'requiredAssets',
      );
    });

    it('invalidates the cache and announces the update after the batch confirms', async () => {
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:invalidateRewardsMoneyCache',
      );
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsMoneyController:notifyEarningsUpdated',
      );
    });

    it('marks the claim submitted so the screen keeps its optimistic state', async () => {
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      await waitFor(() => expect(result.current.hasSubmitted).toBe(true));
    });

    it('reports NOT_SUBMITTABLE without opening a claim when sponsorship is off', async () => {
      mockIsMonad.mockReturnValue(false);
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      expect(result.current.error?.reason).toBe('NOT_SUBMITTABLE');
      expect(mockCall).not.toHaveBeenCalledWith(
        'RewardsMoneyController:initiateClaim',
        expect.anything(),
      );
    });

    it('reports VOUCHER_EXPIRED rather than letting the batch revert opaquely', async () => {
      mockCall.mockResolvedValue({
        claim: {},
        // Jest pins Date.now() to a fixed epoch, so 0 is unambiguously past.
        voucher: createVoucher({ valid_before: 0 }),
        excluded: [],
        status: 'LIVE_VOUCHER',
      } as never);
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      expect(result.current.error?.reason).toBe('VOUCHER_EXPIRED');
      expect(mockAddBatch).not.toHaveBeenCalled();
    });

    it('reports NO_VOUCHER when the claim is awaiting release', async () => {
      mockCall.mockResolvedValue({
        claim: {},
        voucher: null,
        excluded: [],
        status: 'AWAITING_RELEASE',
      } as never);
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      expect(result.current.error?.reason).toBe('NO_VOUCHER');
    });

    it('reports CLAIM_ALREADY_OPEN when an address already holds an open claim', async () => {
      mockCall.mockRejectedValue(new ClaimAlreadyOpenError('already open'));
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      expect(result.current.error?.reason).toBe('CLAIM_ALREADY_OPEN');
    });

    it('reports SUBMIT_FAILED when the batch is rejected', async () => {
      mockAwaitBatch.mockRejectedValue(new Error('user rejected'));
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      expect(result.current.error?.reason).toBe('SUBMIT_FAILED');
    });

    it('ignores a second call while one is already in flight', async () => {
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await Promise.all([
          result.current.claim(['CASHBACK']),
          result.current.claim(['CASHBACK']),
        ]);
      });

      expect(mockAddBatch).toHaveBeenCalledTimes(1);
    });

    it('clears the claiming flag once the attempt settles', async () => {
      const { result } = renderHook(() => useClaimEarnings());

      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      expect(result.current.isClaiming).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears a previous failure', async () => {
      mockAwaitBatch.mockRejectedValue(new Error('boom'));
      const { result } = renderHook(() => useClaimEarnings());
      await act(async () => {
        await result.current.claim(['CASHBACK']);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
