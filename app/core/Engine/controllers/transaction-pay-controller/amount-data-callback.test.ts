import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { buildMoneyAccountDepositBatch } from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import ReduxService from '../../../../core/redux/ReduxService';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { getAmountData } from './amount-data-callback';

jest.mock('../../../../components/UI/Money/utils/moneyAccountTransactions');
jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn().mockReturnValue({}) } },
}));
jest.mock('../../../../selectors/featureFlagController/moneyAccount');
jest.mock('../../../../util/notifications/methods/common');

const VAULT_CONFIG = {
  chainId: '0x8f',
  boringVault: '0xBoringVault',
  tellerAddress: '0xTeller',
  accountantAddress: '0xAccountant',
  lensAddress: '0xLens',
};

const APPROVE_DATA = '0xapprove-calldata' as Hex;
const DEPOSIT_DATA = '0xdeposit-calldata' as Hex;

const selectVaultConfigMock = jest.mocked(selectMoneyAccountVaultConfig);
const getProviderMock = jest.mocked(getProviderByChainId);
const buildDepositBatchMock = jest.mocked(buildMoneyAccountDepositBatch);

function buildTransaction(
  overrides?: Partial<TransactionMeta>,
): TransactionMeta {
  return {
    id: 'tx-1',
    chainId: '0x8f' as Hex,
    type: TransactionType.batch,
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
    buildDepositBatchMock.mockResolvedValue({
      approveTx: {
        params: {
          to: '0xMusd' as Hex,
          data: APPROVE_DATA,
          value: '0x0' as Hex,
        },
        type: TransactionType.tokenMethodApprove,
      },
      depositTx: {
        params: {
          to: '0xTeller' as Hex,
          data: DEPOSIT_DATA,
          value: '0x0' as Hex,
        },
        type: TransactionType.moneyAccountDeposit,
      },
    });
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
