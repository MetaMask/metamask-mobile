import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  buildMoneyAccountDepositBatch,
  getMoneyAccountDepositAssetAddress,
} from '../../../../components/UI/Money/utils/moneyAccountTransactions';
import ReduxService from '../../../../core/redux/ReduxService';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { prepareTransactionAmount } from './amount-preparation-callback';

jest.mock('../../../../components/UI/Money/utils/moneyAccountTransactions');
jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn().mockReturnValue({}) } },
}));
jest.mock('../../../../selectors/featureFlagController/moneyAccount');
jest.mock('../../../../util/notifications/methods/common');

const CHAIN_ID = '0x8f' as Hex;
const MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;
const SECOND_ASSET_ADDRESS =
  '0x1111111111111111111111111111111111111111' as Hex;
const APPROVE_DATA = '0x1234' as Hex;
const DEPOSIT_DATA = '0x5678' as Hex;
const VAULT_CONFIG = {
  chainId: CHAIN_ID,
  boringVault: '0xBoringVault',
  tellerAddress: '0xTeller',
  accountantAddress: '0xAccountant',
  lensAddress: '0xLens',
};

const selectVaultConfigMock = jest.mocked(selectMoneyAccountVaultConfig);
const getProviderMock = jest.mocked(getProviderByChainId);
const getDepositAssetMock = jest.mocked(getMoneyAccountDepositAssetAddress);
const buildDepositBatchMock = jest.mocked(buildMoneyAccountDepositBatch);
const signal = new AbortController().signal;

function buildTransaction(
  overrides?: Partial<TransactionMeta>,
): TransactionMeta {
  return {
    id: 'tx-1',
    chainId: CHAIN_ID,
    type: TransactionType.batch,
    nestedTransactions: [
      { type: TransactionType.tokenMethodApprove, data: '0x' as Hex },
      { type: TransactionType.moneyAccountDeposit, data: '0x' as Hex },
    ],
    requiredAssets: [
      { address: MUSD_ADDRESS, amount: '0x0' as Hex, standard: 'erc20' },
      {
        address: SECOND_ASSET_ADDRESS,
        amount: '0x7' as Hex,
        standard: 'erc20',
      },
    ],
    ...overrides,
  } as TransactionMeta;
}

describe('prepareTransactionAmount', () => {
  const provider = {} as ReturnType<typeof getProviderByChainId>;

  beforeEach(() => {
    jest.clearAllMocks();
    selectVaultConfigMock.mockReturnValue(VAULT_CONFIG);
    getProviderMock.mockReturnValue(provider);
    getDepositAssetMock.mockReturnValue(MUSD_ADDRESS);
    buildDepositBatchMock.mockResolvedValue({
      approveTx: {
        params: {
          to: MUSD_ADDRESS,
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

  it('returns a complete prepared deposit patch from a human amount', async () => {
    const result = await prepareTransactionAmount({
      transaction: buildTransaction(),
      amountHuman: '1.0000001',
      signal,
    });

    expect(result).toStrictEqual({
      kind: 'prepared',
      amountRaw: '1000001',
      requiredAssets: [
        { address: MUSD_ADDRESS, amount: '0xf4241', standard: 'erc20' },
        {
          address: SECOND_ASSET_ADDRESS,
          amount: '0x7',
          standard: 'erc20',
        },
      ],
      nestedTransactionUpdates: [
        { transactionIndex: 0, transactionData: APPROVE_DATA },
        { transactionIndex: 1, transactionData: DEPOSIT_DATA },
      ],
      requiredNestedTransactionIndexes: [0, 1],
    });
  });

  it('uses MUSD decimals and ROUND_UP for exact sub-atomic human amounts', async () => {
    await prepareTransactionAmount({
      transaction: buildTransaction(),
      amountHuman: '0.0000001',
      signal,
    });

    expect(buildDepositBatchMock).toHaveBeenCalledWith({
      amount: 1n,
      chainId: CHAIN_ID,
      boringVault: VAULT_CONFIG.boringVault,
      tellerAddress: VAULT_CONFIG.tellerAddress,
      accountantAddress: VAULT_CONFIG.accountantAddress,
      lensAddress: VAULT_CONFIG.lensAddress,
      provider,
    });
  });

  it('delegates preview and calldata generation to the existing deposit builder', async () => {
    await prepareTransactionAmount({
      transaction: buildTransaction(),
      amountHuman: '5',
      signal,
    });

    expect(buildDepositBatchMock).toHaveBeenCalledTimes(1);
    expect(buildDepositBatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 5_000_000n }),
    );
  });

  it('returns not-applicable for withdrawals without reading deposit dependencies', async () => {
    const result = await prepareTransactionAmount({
      transaction: buildTransaction({
        type: TransactionType.batch,
        nestedTransactions: [
          { type: TransactionType.moneyAccountWithdraw, data: '0x' as Hex },
          { type: TransactionType.tokenMethodTransfer, data: '0x' as Hex },
        ],
      }),
      amountHuman: '1',
      signal,
    });

    expect(result).toStrictEqual({ kind: 'not-applicable' });
    expect(selectVaultConfigMock).not.toHaveBeenCalled();
    expect(buildDepositBatchMock).not.toHaveBeenCalled();
  });

  it('returns not-applicable for unrelated transactions', async () => {
    const result = await prepareTransactionAmount({
      transaction: buildTransaction({
        type: TransactionType.simpleSend,
        nestedTransactions: undefined,
      }),
      amountHuman: '1',
      signal,
    });

    expect(result).toStrictEqual({ kind: 'not-applicable' });
  });

  it('fails closed when the approval/deposit transaction template is missing', async () => {
    await expect(
      prepareTransactionAmount({
        transaction: buildTransaction({
          nestedTransactions: [
            { type: TransactionType.moneyAccountDeposit, data: '0x' as Hex },
          ],
        }),
        amountHuman: '1',
        signal,
      }),
    ).rejects.toThrow(
      'Prepare Amount: Money Account Deposit: missing approval/deposit transaction template',
    );

    expect(buildDepositBatchMock).not.toHaveBeenCalled();
  });

  it('fails closed when the required asset template is missing', async () => {
    await expect(
      prepareTransactionAmount({
        transaction: buildTransaction({ requiredAssets: undefined }),
        amountHuman: '1',
        signal,
      }),
    ).rejects.toThrow(
      'Prepare Amount: Money Account Deposit: missing required asset template',
    );

    expect(buildDepositBatchMock).not.toHaveBeenCalled();
  });

  it('fails closed when the Money Account deposit asset template is missing', async () => {
    await expect(
      prepareTransactionAmount({
        transaction: buildTransaction({
          requiredAssets: [
            {
              address: SECOND_ASSET_ADDRESS,
              amount: '0x0' as Hex,
              standard: 'erc20',
            },
          ],
        }),
        amountHuman: '1',
        signal,
      }),
    ).rejects.toThrow(
      'Prepare Amount: Money Account Deposit: missing Money Account deposit asset template',
    );
  });

  it('fails closed when vault config is missing', async () => {
    selectVaultConfigMock.mockReturnValue(undefined);

    await expect(
      prepareTransactionAmount({
        transaction: buildTransaction(),
        amountHuman: '1',
        signal,
      }),
    ).rejects.toThrow(
      'Prepare Amount: Money Account Deposit: missing vault config',
    );

    expect(buildDepositBatchMock).not.toHaveBeenCalled();
  });

  it('fails closed when the provider is missing', async () => {
    getProviderMock.mockReturnValue(
      undefined as unknown as ReturnType<typeof getProviderByChainId>,
    );

    await expect(
      prepareTransactionAmount({
        transaction: buildTransaction(),
        amountHuman: '1',
        signal,
      }),
    ).rejects.toThrow(
      'Prepare Amount: Money Account Deposit: missing provider',
    );

    expect(buildDepositBatchMock).not.toHaveBeenCalled();
  });

  it('fails closed when the deposit builder returns partial updates', async () => {
    buildDepositBatchMock.mockResolvedValueOnce({
      approveTx: {
        params: {
          to: MUSD_ADDRESS,
          data: APPROVE_DATA,
          value: '0x0' as Hex,
        },
        type: TransactionType.tokenMethodApprove,
      },
      depositTx: undefined,
    } as unknown as Awaited<ReturnType<typeof buildMoneyAccountDepositBatch>>);

    await expect(
      prepareTransactionAmount({
        transaction: buildTransaction(),
        amountHuman: '1',
        signal,
      }),
    ).rejects.toThrow(
      'Prepare Amount: Money Account Deposit: incomplete approval/deposit updates',
    );
  });

  it('propagates previewDeposit failures without returning a partial patch', async () => {
    buildDepositBatchMock.mockRejectedValueOnce(
      new Error('previewDeposit reverted'),
    );

    await expect(
      prepareTransactionAmount({
        transaction: buildTransaction(),
        amountHuman: '1',
        signal,
      }),
    ).rejects.toThrow('previewDeposit reverted');
  });
});
