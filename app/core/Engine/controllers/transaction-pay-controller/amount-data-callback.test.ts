import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  isPremiumDepositCandidate,
  resolveMoneyAccountDepositVault,
} from '../../../../components/UI/Money/utils/moneyAccountPremiumDeposit';
import { buildMoneyAccountDepositBatch } from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import ReduxService from '../../../../core/redux/ReduxService';
import {
  selectMoneyAccountPremiumVaultConfig,
  selectMoneyAccountVaultConfig,
  type MoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { getAmountData } from './amount-data-callback';

jest.mock('../../../../components/UI/Money/utils/moneyAccountPremiumDeposit');
jest.mock('../../../../components/UI/Money/utils/moneyAccountTransactions');
jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn().mockReturnValue({}) } },
}));
jest.mock('../../../../selectors/featureFlagController/moneyAccount');
jest.mock('../../../../util/notifications/methods/common');

const VAULT_CONFIG: MoneyAccountVaultConfig = {
  chainId: '0x8f',
  boringVault: '0xBoringVault',
  tellerAddress: '0xTeller',
  accountantAddress: '0xAccountant',
  lensAddress: '0xLens',
};

const APPROVE_DATA = '0xaaaa';
const DEPOSIT_DATA = '0xbbbb';
const MONEY_ACCOUNT_ADDRESS = '0x1234000000000000000000000000000000000000';

const selectVaultConfigMock = jest.mocked(selectMoneyAccountVaultConfig);
const getProviderMock = jest.mocked(getProviderByChainId);
const buildDepositBatchMock = jest.mocked(buildMoneyAccountDepositBatch);
const isPremiumCandidateMock = jest.mocked(isPremiumDepositCandidate);
const selectPremiumConfigMock = jest.mocked(
  selectMoneyAccountPremiumVaultConfig,
);
const resolveVaultMock = jest.mocked(resolveMoneyAccountDepositVault);

function buildTransaction(
  overrides?: Partial<TransactionMeta>,
): TransactionMeta {
  return {
    id: 'tx-1',
    chainId: '0x8f' as Hex,
    type: TransactionType.batch,
    txParams: { from: MONEY_ACCOUNT_ADDRESS },
    nestedTransactions: [
      { type: TransactionType.tokenMethodApprove, data: '0x' as Hex },
      { type: TransactionType.moneyAccountDeposit, data: '0x' as Hex },
    ],
    ...overrides,
  } as TransactionMeta;
}

describe('getAmountData', () => {
  const mockProvider = {} as ReturnType<typeof getProviderByChainId>;

  beforeEach(() => {
    jest.clearAllMocks();
    (ReduxService.store.getState as jest.Mock).mockReturnValue({});
    selectVaultConfigMock.mockReturnValue(VAULT_CONFIG);
    getProviderMock.mockReturnValue(mockProvider);
    isPremiumCandidateMock.mockReturnValue(false);
    selectPremiumConfigMock.mockReturnValue(undefined);
    resolveVaultMock.mockResolvedValue(undefined);
    buildDepositBatchMock.mockImplementation(async ({ tellerAddress }) => ({
      approveTx: {
        params: {
          to: '0x0000000000000000000000000000000000000001',
          data: APPROVE_DATA,
          value: '0x0',
        },
        type: TransactionType.tokenMethodApprove,
      },
      depositTx: {
        params: { to: tellerAddress as Hex, data: DEPOSIT_DATA, value: '0x0' },
        type: TransactionType.moneyAccountDeposit,
      },
    }));
  });

  it('returns updates with approve and deposit calldata for moneyAccountDeposit', async () => {
    const result = await getAmountData({
      amount: '5000000',
      transaction: buildTransaction(),
    });

    expect(result).toStrictEqual({
      updates: [
        { nestedTransactionIndex: 0, data: APPROVE_DATA },
        { nestedTransactionIndex: 1, data: DEPOSIT_DATA },
      ],
    });
  });

  it('returns updates with approve and deposit calldata for membershipSubscription', async () => {
    const result = await getAmountData({
      amount: '5000000',
      transaction: buildTransaction({
        nestedTransactions: [
          { type: TransactionType.tokenMethodApprove, data: '0x' as Hex },
          { type: TransactionType.membershipSubscription, data: '0x' as Hex },
        ],
      }),
    });

    expect(result).toStrictEqual({
      updates: [
        { nestedTransactionIndex: 0, data: APPROVE_DATA },
        { nestedTransactionIndex: 1, data: DEPOSIT_DATA },
      ],
    });
  });

  it('calls buildMoneyAccountDepositBatch with correct parameters', async () => {
    await getAmountData({
      amount: '5000000',
      transaction: buildTransaction(),
    });

    expect(buildDepositBatchMock).toHaveBeenCalledWith({
      amount: BigInt('5000000'),
      chainId: '0x8f',
      boringVault: VAULT_CONFIG.boringVault,
      tellerAddress: VAULT_CONFIG.tellerAddress,
      accountantAddress: VAULT_CONFIG.accountantAddress,
      lensAddress: VAULT_CONFIG.lensAddress,
      provider: mockProvider,
    });
  });

  it('does not request a signature on the second leg for a non-candidate', async () => {
    const result = await getAmountData({
      amount: '5000000',
      secondLeg: true,
      transaction: buildTransaction(),
    });

    expect(resolveVaultMock).not.toHaveBeenCalled();
    expect(result.updates[1]).toStrictEqual({
      nestedTransactionIndex: 1,
      data: DEPOSIT_DATA,
      to: VAULT_CONFIG.tellerAddress,
    });
  });

  describe('with premium vault configured for a candidate', () => {
    const premiumConfig = {
      ...VAULT_CONFIG,
      tellerAddress: '0xPremium',
    } as const;
    const authorization = {
      recipient: MONEY_ACCOUNT_ADDRESS,
      signature: '0x1234',
      deadline: 1800000000,
    } as const;

    beforeEach(() => {
      isPremiumCandidateMock.mockReturnValue(true);
      selectPremiumConfigMock.mockReturnValue(premiumConfig);
    });

    it('replaces the teller target and calldata using the settled amount', async () => {
      resolveVaultMock.mockResolvedValue(authorization);

      const result = await getAmountData({
        amount: '5000000',
        secondLeg: true,
        transaction: buildTransaction(),
      });

      expect(resolveVaultMock).toHaveBeenCalledWith(
        VAULT_CONFIG.chainId,
        MONEY_ACCOUNT_ADDRESS,
        '5000000',
      );
      expect(buildDepositBatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          premiumAuthorization: authorization,
          tellerAddress: premiumConfig.tellerAddress,
        }),
      );
      expect(result.updates[1]).toEqual({
        nestedTransactionIndex: 1,
        data: DEPOSIT_DATA,
        to: premiumConfig.tellerAddress,
      });
    });

    it('retains the base teller when Sentinel returns ineligible', async () => {
      const result = await getAmountData({
        amount: '5000000',
        secondLeg: true,
        transaction: buildTransaction(),
      });

      expect(result.updates[1]).toEqual({
        nestedTransactionIndex: 1,
        data: DEPOSIT_DATA,
        to: VAULT_CONFIG.tellerAddress,
      });
      expect(buildDepositBatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ tellerAddress: VAULT_CONFIG.tellerAddress }),
      );
    });

    it('leaves the deposit for CHOMP when Sentinel fails', async () => {
      resolveVaultMock.mockRejectedValue(new Error('Premium Deposit: timeout'));

      const result = getAmountData({
        amount: '5000000',
        secondLeg: true,
        transaction: buildTransaction(),
      });

      await expect(result).rejects.toThrow(
        'Update Amount Data: Premium Deposit: timeout',
      );

      expect(buildDepositBatchMock).not.toHaveBeenCalled();
    });

    it('does not request a signature outside the second leg', async () => {
      const result = await getAmountData({
        amount: '5000000',
        transaction: buildTransaction(),
      });

      expect(resolveVaultMock).not.toHaveBeenCalled();
      expect(result.updates[1]).toEqual({
        nestedTransactionIndex: 1,
        data: DEPOSIT_DATA,
      });
    });
  });

  it('returns empty updates when transaction type is not moneyAccountDeposit', async () => {
    const result = await getAmountData({
      amount: '5000000',
      transaction: buildTransaction({
        type: TransactionType.simpleSend,
        nestedTransactions: undefined,
      }),
    });

    expect(result).toStrictEqual({ updates: [] });
    expect(buildDepositBatchMock).not.toHaveBeenCalled();
  });

  it('returns empty updates when vault config is missing', async () => {
    selectVaultConfigMock.mockReturnValue(undefined);

    const result = await getAmountData({
      amount: '5000000',
      transaction: buildTransaction(),
    });

    expect(result).toStrictEqual({ updates: [] });
    expect(buildDepositBatchMock).not.toHaveBeenCalled();
  });

  it('returns empty updates when provider is unavailable', async () => {
    getProviderMock.mockReturnValue(
      undefined as unknown as ReturnType<typeof getProviderByChainId>,
    );

    const result = await getAmountData({
      amount: '5000000',
      transaction: buildTransaction(),
    });

    expect(result).toStrictEqual({ updates: [] });
    expect(buildDepositBatchMock).not.toHaveBeenCalled();
  });

  it('throws a prefixed error when buildMoneyAccountDepositBatch fails', async () => {
    buildDepositBatchMock.mockRejectedValueOnce(
      new Error('previewDeposit reverted'),
    );

    await expect(
      getAmountData({ amount: '5000000', transaction: buildTransaction() }),
    ).rejects.toThrow(
      'Update Amount Data: Money Account Deposit: previewDeposit reverted',
    );
  });

  it('parses a CALL_EXCEPTION into a short message', async () => {
    const callError = Object.assign(
      new Error(
        'call revert exception (method="previewDeposit(address,uint256,address,address)", reason="Deposit not allowed", code=CALL_EXCEPTION)',
      ),
      {
        code: 'CALL_EXCEPTION',
        method: 'previewDeposit(address,uint256,address,address)',
        reason: 'Deposit not allowed',
      },
    );
    buildDepositBatchMock.mockRejectedValueOnce(callError);

    await expect(
      getAmountData({ amount: '5000000', transaction: buildTransaction() }),
    ).rejects.toThrow(
      'Update Amount Data: Money Account Deposit: eth_call failed - previewDeposit - Deposit not allowed',
    );
  });

  it('handles direct moneyAccountDeposit type (non-batch)', async () => {
    const result = await getAmountData({
      amount: '5000000',
      transaction: buildTransaction({
        type: TransactionType.moneyAccountDeposit,
        nestedTransactions: undefined,
      }),
    });

    expect(result).toStrictEqual({
      updates: [
        { nestedTransactionIndex: 0, data: APPROVE_DATA },
        { nestedTransactionIndex: 1, data: DEPOSIT_DATA },
      ],
    });
  });
});
