import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdrawBatch,
} from '@metamask/money-account-utils';
import {
  updateMoneyAccountDepositTokenAmount,
  updateMoneyAccountWithdrawTokenAmount,
  getMoneyAccountDepositTransactionsData,
  getMoneyAccountWithdrawTransactionsData,
} from './moneyAccountTransactions';
import ReduxService from '../../../../core/redux/ReduxService';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import {
  type MoneyAccountVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';

// The pure builders now live in `@metamask/money-account-utils` and are tested
// there; these tests cover only the Redux-coupled wrappers, so the package
// boundary is mocked.
jest.mock('@metamask/money-account-utils', () => ({
  ...jest.requireActual('@metamask/money-account-utils'),
  buildMoneyAccountDepositBatch: jest.fn(),
  buildMoneyAccountWithdrawBatch: jest.fn(),
}));

jest.mock('../../Earn/constants/musd', () => ({
  MUSD_DECIMALS: 6,
}));

jest.mock('../../../../core/redux/ReduxService', () => ({
  __esModule: true,
  default: { store: { getState: jest.fn() } },
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyAccountVaultConfig: jest.fn(),
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
  selectMoneyAccounts: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectEvmAddress: jest.fn(),
}));

jest.mock('../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(),
}));

const mockBuildDepositBatch = jest.mocked(buildMoneyAccountDepositBatch);
const mockBuildWithdrawBatch = jest.mocked(buildMoneyAccountWithdrawBatch);
const mockGetProviderByChainId = jest.mocked(getProviderByChainId);
const mockSelectVaultConfig = jest.mocked(selectMoneyAccountVaultConfig);
const mockSelectPrimaryMoneyAccount = jest.mocked(selectPrimaryMoneyAccount);
const mockSelectEvmAddress = jest.mocked(selectEvmAddress);

const MOCK_CHAIN_ID = '0x8f' as Hex;
const MOCK_MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;
const MOCK_BORING_VAULT = '0xB5F07d769dD60fE54c97dd53101181073DDf21b2' as Hex;
const MOCK_TELLER = '0x86821F179eaD9F0b3C79b2f8deF0227eEBFDc9f9' as Hex;
const MOCK_ACCOUNTANT = '0x800ebc3B74F67EaC27C9CCE4E4FF28b17CdCA173' as Hex;
const MOCK_LENS = '0x846a7832022350434B5cC006d07cc9c782469660' as Hex;
const MOCK_MONEY_ACCOUNT = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex;
const MOCK_EVM_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;
const MOCK_RECIPIENT_OVERRIDE =
  '0x1111111111111111111111111111111111111111' as Hex;
const MOCK_PROVIDER = {} as never;

const MOCK_VAULT_CONFIG: MoneyAccountVaultConfig = {
  chainId: MOCK_CHAIN_ID,
  boringVault: MOCK_BORING_VAULT,
  tellerAddress: MOCK_TELLER,
  accountantAddress: MOCK_ACCOUNTANT,
  lensAddress: MOCK_LENS,
};

const MOCK_TRANSACTION_META = {
  chainId: MOCK_CHAIN_ID,
} as TransactionMeta;

const DEPOSIT_BATCH = {
  approveTx: {
    params: {
      to: MOCK_MUSD_ADDRESS,
      data: '0xapprove' as Hex,
      value: '0x0' as Hex,
    },
    type: 'tokenMethodApprove' as never,
  },
  depositTx: {
    params: {
      to: MOCK_TELLER,
      data: '0xdeposit' as Hex,
      value: '0x0' as Hex,
    },
    type: 'moneyAccountDeposit' as never,
  },
};

const WITHDRAW_BATCH = {
  withdrawTx: {
    params: {
      to: MOCK_TELLER,
      data: '0xwithdraw' as Hex,
      value: '0x0' as Hex,
    },
    type: 'moneyAccountWithdraw' as never,
  },
  transferTx: {
    params: {
      to: MOCK_MUSD_ADDRESS,
      data: '0xtransfer' as Hex,
      value: '0x0' as Hex,
    },
    type: 'tokenMethodTransfer' as never,
  },
};

describe('moneyAccountTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
    mockSelectPrimaryMoneyAccount.mockReturnValue({
      address: MOCK_MONEY_ACCOUNT,
    } as never);
    mockSelectEvmAddress.mockReturnValue(MOCK_EVM_ADDRESS);
    mockGetProviderByChainId.mockReturnValue(MOCK_PROVIDER);
    mockBuildDepositBatch.mockResolvedValue(DEPOSIT_BATCH);
    mockBuildWithdrawBatch.mockResolvedValue(WITHDRAW_BATCH);
    (ReduxService.store.getState as jest.Mock).mockReturnValue({});
  });

  describe('updateMoneyAccountDepositTokenAmount', () => {
    it('returns indexed approve and deposit calls', async () => {
      const result = await updateMoneyAccountDepositTokenAmount(
        MOCK_TRANSACTION_META,
        '10.5',
      );

      expect(result).toStrictEqual([
        { nestedTransactionIndex: 0, transactionData: '0xapprove' },
        { nestedTransactionIndex: 1, transactionData: '0xdeposit' },
      ]);
    });

    it('forwards the vault config and the converted amount to the builder', async () => {
      await updateMoneyAccountDepositTokenAmount(MOCK_TRANSACTION_META, '10.5');

      expect(mockBuildDepositBatch).toHaveBeenCalledWith({
        amount: BigInt(10_500_000),
        chainId: MOCK_CHAIN_ID,
        boringVault: MOCK_BORING_VAULT,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        lensAddress: MOCK_LENS,
        provider: MOCK_PROVIDER,
      });
    });

    it('rounds the amount down to the previous base unit', async () => {
      await updateMoneyAccountDepositTokenAmount(
        MOCK_TRANSACTION_META,
        '1.0000005',
      );

      expect(mockBuildDepositBatch).toHaveBeenCalledWith(
        expect.objectContaining({ amount: BigInt(1_000_000) }),
      );
    });

    it('returns [] when vault config is missing', async () => {
      mockSelectVaultConfig.mockReturnValue(undefined);

      expect(
        await updateMoneyAccountDepositTokenAmount(
          MOCK_TRANSACTION_META,
          '10.5',
        ),
      ).toStrictEqual([]);
      expect(mockBuildDepositBatch).not.toHaveBeenCalled();
    });

    it('returns [] when no provider is available for the chain', async () => {
      mockGetProviderByChainId.mockReturnValue(undefined as never);

      expect(
        await updateMoneyAccountDepositTokenAmount(
          MOCK_TRANSACTION_META,
          '10.5',
        ),
      ).toStrictEqual([]);
      expect(mockBuildDepositBatch).not.toHaveBeenCalled();
    });

    it('propagates builder errors so the dispatcher can log them', async () => {
      mockBuildDepositBatch.mockRejectedValue(new Error('RPC down'));

      await expect(
        updateMoneyAccountDepositTokenAmount(MOCK_TRANSACTION_META, '10.5'),
      ).rejects.toThrow('RPC down');
    });

    it.each(['0', '0.00'])(
      'no-ops without calling the builder for the zero amount %p',
      async (amountHuman) => {
        // Pay pushes every amount change, including a cleared field. The builder
        // rejects zero rather than encode a deposit that mints nothing, so there
        // must be nothing left to re-encode by the time we call it.
        expect(
          await updateMoneyAccountDepositTokenAmount(
            MOCK_TRANSACTION_META,
            amountHuman,
          ),
        ).toStrictEqual([]);
        expect(mockBuildDepositBatch).not.toHaveBeenCalled();
      },
    );

    it('no-ops for a sub-base-unit amount, which rounds down to 0', async () => {
      expect(
        await updateMoneyAccountDepositTokenAmount(
          MOCK_TRANSACTION_META,
          '0.0000001',
        ),
      ).toStrictEqual([]);
      expect(mockBuildDepositBatch).not.toHaveBeenCalled();
    });
  });

  describe('updateMoneyAccountWithdrawTokenAmount', () => {
    it('returns indexed withdraw and transfer calls', async () => {
      const result = await updateMoneyAccountWithdrawTokenAmount(
        MOCK_TRANSACTION_META,
        '10.5',
      );

      expect(result).toStrictEqual([
        { nestedTransactionIndex: 0, transactionData: '0xwithdraw' },
        { nestedTransactionIndex: 1, transactionData: '0xtransfer' },
      ]);
    });

    it('forwards the vault config, money account and recipient to the builder', async () => {
      await updateMoneyAccountWithdrawTokenAmount(
        MOCK_TRANSACTION_META,
        '10.5',
      );

      expect(mockBuildWithdrawBatch).toHaveBeenCalledWith({
        amount: BigInt(10_500_000),
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        moneyAccountAddress: MOCK_MONEY_ACCOUNT,
        recipient: MOCK_EVM_ADDRESS,
        provider: MOCK_PROVIDER,
      });
    });

    it('uses recipientOverride when provided', async () => {
      await updateMoneyAccountWithdrawTokenAmount(
        MOCK_TRANSACTION_META,
        '10.5',
        MOCK_RECIPIENT_OVERRIDE,
      );

      expect(mockBuildWithdrawBatch).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: MOCK_RECIPIENT_OVERRIDE }),
      );
    });

    it('returns [] when vault config is missing', async () => {
      mockSelectVaultConfig.mockReturnValue(undefined);

      expect(
        await updateMoneyAccountWithdrawTokenAmount(
          MOCK_TRANSACTION_META,
          '10.5',
        ),
      ).toStrictEqual([]);
    });

    it('returns [] when the primary money account is missing', async () => {
      mockSelectPrimaryMoneyAccount.mockReturnValue(undefined as never);

      expect(
        await updateMoneyAccountWithdrawTokenAmount(
          MOCK_TRANSACTION_META,
          '10.5',
        ),
      ).toStrictEqual([]);
    });

    it('returns [] when there is no recipient', async () => {
      mockSelectEvmAddress.mockReturnValue(undefined as never);

      expect(
        await updateMoneyAccountWithdrawTokenAmount(
          MOCK_TRANSACTION_META,
          '10.5',
        ),
      ).toStrictEqual([]);
    });

    it('returns [] when no provider is available for the chain', async () => {
      mockGetProviderByChainId.mockReturnValue(undefined as never);

      expect(
        await updateMoneyAccountWithdrawTokenAmount(
          MOCK_TRANSACTION_META,
          '10.5',
        ),
      ).toStrictEqual([]);
      expect(mockBuildWithdrawBatch).not.toHaveBeenCalled();
    });

    it('no-ops without calling the builder for a zero amount', async () => {
      // The builder rejects zero rather than encode a zero-share redemption.
      expect(
        await updateMoneyAccountWithdrawTokenAmount(MOCK_TRANSACTION_META, '0'),
      ).toStrictEqual([]);
      expect(mockBuildWithdrawBatch).not.toHaveBeenCalled();
    });
  });

  describe('getMoneyAccountDepositTransactionsData', () => {
    it('returns the approve and deposit params', async () => {
      const result = await getMoneyAccountDepositTransactionsData(
        MOCK_CHAIN_ID,
        '10.5',
      );

      expect(result).toStrictEqual([
        DEPOSIT_BATCH.approveTx.params,
        DEPOSIT_BATCH.depositTx.params,
      ]);
    });

    it('forwards the converted amount to the builder', async () => {
      await getMoneyAccountDepositTransactionsData(MOCK_CHAIN_ID, '10.5');

      expect(mockBuildDepositBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: BigInt(10_500_000),
          chainId: MOCK_CHAIN_ID,
        }),
      );
    });

    it('returns [] when vault config is missing', async () => {
      mockSelectVaultConfig.mockReturnValue(undefined);

      expect(
        await getMoneyAccountDepositTransactionsData(MOCK_CHAIN_ID, '10.5'),
      ).toStrictEqual([]);
    });

    it('returns [] when no provider is available for the chain', async () => {
      mockGetProviderByChainId.mockReturnValue(undefined as never);

      expect(
        await getMoneyAccountDepositTransactionsData(MOCK_CHAIN_ID, '10.5'),
      ).toStrictEqual([]);
    });

    it('propagates builder errors', async () => {
      mockBuildDepositBatch.mockRejectedValue(new Error('RPC down'));

      await expect(
        getMoneyAccountDepositTransactionsData(MOCK_CHAIN_ID, '10.5'),
      ).rejects.toThrow('RPC down');
    });

    it('returns [] without calling the builder for a zero amount', async () => {
      expect(
        await getMoneyAccountDepositTransactionsData(MOCK_CHAIN_ID, '0'),
      ).toStrictEqual([]);
      expect(mockBuildDepositBatch).not.toHaveBeenCalled();
    });
  });

  describe('getMoneyAccountWithdrawTransactionsData', () => {
    it('returns the withdraw and transfer params', async () => {
      const result = await getMoneyAccountWithdrawTransactionsData(
        MOCK_CHAIN_ID,
        '10.5',
      );

      expect(result).toStrictEqual([
        WITHDRAW_BATCH.withdrawTx.params,
        WITHDRAW_BATCH.transferTx.params,
      ]);
    });

    it('uses recipientOverride when provided', async () => {
      await getMoneyAccountWithdrawTransactionsData(
        MOCK_CHAIN_ID,
        '10.5',
        MOCK_RECIPIENT_OVERRIDE,
      );

      expect(mockBuildWithdrawBatch).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: MOCK_RECIPIENT_OVERRIDE }),
      );
    });

    it('falls back to the selected EVM address when no override is given', async () => {
      await getMoneyAccountWithdrawTransactionsData(MOCK_CHAIN_ID, '10.5');

      expect(mockBuildWithdrawBatch).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: MOCK_EVM_ADDRESS }),
      );
    });

    it('returns [] when vault config is missing', async () => {
      mockSelectVaultConfig.mockReturnValue(undefined);

      expect(
        await getMoneyAccountWithdrawTransactionsData(MOCK_CHAIN_ID, '10.5'),
      ).toStrictEqual([]);
    });

    it('returns [] when the primary money account is missing', async () => {
      mockSelectPrimaryMoneyAccount.mockReturnValue(undefined as never);

      expect(
        await getMoneyAccountWithdrawTransactionsData(MOCK_CHAIN_ID, '10.5'),
      ).toStrictEqual([]);
    });

    it('returns [] when no provider is available for the chain', async () => {
      mockGetProviderByChainId.mockReturnValue(undefined as never);

      expect(
        await getMoneyAccountWithdrawTransactionsData(MOCK_CHAIN_ID, '10.5'),
      ).toStrictEqual([]);
    });

    it('returns [] when there is no recipient', async () => {
      mockSelectEvmAddress.mockReturnValue(undefined as never);

      expect(
        await getMoneyAccountWithdrawTransactionsData(MOCK_CHAIN_ID, '10.5'),
      ).toStrictEqual([]);
      expect(mockBuildWithdrawBatch).not.toHaveBeenCalled();
    });

    it('returns [] without calling the builder for a zero amount', async () => {
      expect(
        await getMoneyAccountWithdrawTransactionsData(MOCK_CHAIN_ID, '0'),
      ).toStrictEqual([]);
      expect(mockBuildWithdrawBatch).not.toHaveBeenCalled();
    });
  });
});
