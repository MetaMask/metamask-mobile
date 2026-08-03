import {
  TransactionType,
  updateEIP7702BatchData,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { createDeferredPromise, type Hex } from '@metamask/utils';
import {
  buildMoneyAccountDepositBatch,
  getMoneyAccountDepositAssetAddress,
} from '@metamask/money-account-utils';
import ReduxService from '../../../../core/redux/ReduxService';
import {
  type MoneyAccountVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import Engine from '../../index';
import { updateMoneyAccountDepositAmount } from './money-account-amount-update';

jest.mock('@metamask/transaction-controller', () => ({
  ...jest.requireActual('@metamask/transaction-controller'),
  updateEIP7702BatchData: jest.fn(),
}));
jest.mock('@metamask/money-account-utils', () => ({
  ...jest.requireActual('@metamask/money-account-utils'),
  buildMoneyAccountDepositBatch: jest.fn(),
  getMoneyAccountDepositAssetAddress: jest.fn(),
}));
jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn().mockReturnValue({}) } },
}));
jest.mock('../../../../selectors/featureFlagController/moneyAccount');
jest.mock('../../../../util/notifications/methods/common');
jest.mock('../../index', () => ({
  __esModule: true,
  default: {
    context: {
      TransactionController: {
        updateTransactionMetadata: jest.fn(),
      },
    },
  },
}));

const CHAIN_ID = '0x8f' as Hex;
const FROM = '0x1111111111111111111111111111111111111111' as Hex;
const MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;
const SECOND_ASSET_ADDRESS =
  '0x2222222222222222222222222222222222222222' as Hex;
const APPROVE_DATA = '0x1234' as Hex;
const DEPOSIT_DATA = '0x5678' as Hex;
const BATCH_DATA = '0x9abc' as Hex;
const VAULT_CONFIG: MoneyAccountVaultConfig = {
  chainId: CHAIN_ID,
  boringVault: '0xb4563bcd3b7764ccbf497f515585f70b6c3ea5ae',
  tellerAddress: '0x2d49ea58a4c70b62c8b56de971310d9e999c8117',
  accountantAddress: '0x7382c5b8b51b8c4f127b3123c1039581baa5a06b',
  lensAddress: '0xa816ecd922de94c6879ad23b9a884db257f20947',
};

const selectVaultConfigMock = jest.mocked(selectMoneyAccountVaultConfig);
const getProviderMock = jest.mocked(getProviderByChainId);
const getDepositAssetMock = jest.mocked(getMoneyAccountDepositAssetAddress);
const buildDepositBatchMock = jest.mocked(buildMoneyAccountDepositBatch);
const updateEIP7702BatchDataMock = jest.mocked(updateEIP7702BatchData);
const updateTransactionMetadataMock = jest.mocked(
  Engine.context.TransactionController.updateTransactionMetadata,
);

function buildTransaction(
  overrides?: Partial<TransactionMeta>,
): TransactionMeta {
  return {
    id: 'tx-1',
    chainId: CHAIN_ID,
    type: TransactionType.batch,
    txParams: { from: FROM },
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

describe('updateMoneyAccountDepositAmount', () => {
  const provider = {} as ReturnType<typeof getProviderByChainId>;
  let currentTransaction: TransactionMeta;

  beforeEach(() => {
    jest.clearAllMocks();
    currentTransaction = buildTransaction();
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
    updateEIP7702BatchDataMock.mockReturnValue({
      nestedTransactions: [{ data: APPROVE_DATA }, { data: DEPOSIT_DATA }],
      transactionData: BATCH_DATA,
    });
    updateTransactionMetadataMock.mockImplementation(({ callback }) => {
      callback(currentTransaction);
      return currentTransaction;
    });
  });

  it('prepares and commits one coherent update without re-simulation', async () => {
    currentTransaction.txParams.gas = '0x5208';
    currentTransaction.simulationData = { tokenBalanceChanges: [] };
    currentTransaction.securityAlertResponse = {
      reason: 'stale',
      result_type: 'Malicious',
    };
    currentTransaction.revert = {
      gas: {} as never,
      simulation: {} as never,
    };

    await expect(
      updateMoneyAccountDepositAmount(currentTransaction, '1.0000001'),
    ).resolves.toBe(true);

    expect(buildDepositBatchMock).toHaveBeenCalledWith({
      amount: 1_000_001n,
      chainId: CHAIN_ID,
      boringVault: VAULT_CONFIG.boringVault,
      tellerAddress: VAULT_CONFIG.tellerAddress,
      accountantAddress: VAULT_CONFIG.accountantAddress,
      lensAddress: VAULT_CONFIG.lensAddress,
      provider,
    });
    expect(updateTransactionMetadataMock).toHaveBeenCalledWith({
      transactionId: currentTransaction.id,
      skipResimulate: true,
      callback: expect.any(Function),
    });
    expect(updateEIP7702BatchDataMock).toHaveBeenCalledWith({
      from: FROM,
      transactions: expect.any(Array),
      updates: [
        { transactionIndex: 0, transactionData: APPROVE_DATA },
        { transactionIndex: 1, transactionData: DEPOSIT_DATA },
      ],
    });
    expect(currentTransaction.requiredAssets).toStrictEqual([
      { address: MUSD_ADDRESS, amount: '0xf4241', standard: 'erc20' },
      {
        address: SECOND_ASSET_ADDRESS,
        amount: '0x7',
        standard: 'erc20',
      },
    ]);
    expect(currentTransaction.txParams.data).toBe(BATCH_DATA);
    expect(currentTransaction.txParams.gas).toBeUndefined();
    expect(currentTransaction.simulationData).toBeUndefined();
    expect(currentTransaction.securityAlertResponse).toBeUndefined();
    expect(currentTransaction.revert).toBeUndefined();
  });

  it('derives required assets from current metadata at commit time', async () => {
    const preparation =
      createDeferredPromise<
        Awaited<ReturnType<typeof buildMoneyAccountDepositBatch>>
      >();
    buildDepositBatchMock.mockReturnValue(preparation.promise);
    const update = updateMoneyAccountDepositAmount(currentTransaction, '1');
    currentTransaction.requiredAssets?.push({
      address: '0x3333333333333333333333333333333333333333' as Hex,
      amount: '0x8' as Hex,
      standard: 'erc20',
    });
    preparation.resolve({
      approveTx: {
        params: { to: MUSD_ADDRESS, data: APPROVE_DATA, value: '0x0' as Hex },
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

    await update;

    expect(currentTransaction.requiredAssets).toHaveLength(3);
  });

  it('prevents an older asynchronous preparation from committing', async () => {
    const firstPreparation =
      createDeferredPromise<
        Awaited<ReturnType<typeof buildMoneyAccountDepositBatch>>
      >();
    buildDepositBatchMock
      .mockReturnValueOnce(firstPreparation.promise)
      .mockResolvedValueOnce({
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

    const first = updateMoneyAccountDepositAmount(currentTransaction, '1');
    const second = updateMoneyAccountDepositAmount(currentTransaction, '2');
    expect(await second).toBe(true);

    firstPreparation.resolve({
      approveTx: {
        params: {
          to: MUSD_ADDRESS,
          data: '0xaaaa' as Hex,
          value: '0x0' as Hex,
        },
        type: TransactionType.tokenMethodApprove,
      },
      depositTx: {
        params: {
          to: '0xTeller' as Hex,
          data: '0xbbbb' as Hex,
          value: '0x0' as Hex,
        },
        type: TransactionType.moneyAccountDeposit,
      },
    });

    expect(await first).toBe(false);
    expect(updateTransactionMetadataMock).toHaveBeenCalledTimes(1);
  });

  it('joins identical in-flight intents', () => {
    const preparation =
      createDeferredPromise<
        Awaited<ReturnType<typeof buildMoneyAccountDepositBatch>>
      >();
    buildDepositBatchMock.mockReturnValue(preparation.promise);

    const first = updateMoneyAccountDepositAmount(currentTransaction, '1');
    const second = updateMoneyAccountDepositAmount(currentTransaction, '1');

    expect(first).toBe(second);
  });
});
