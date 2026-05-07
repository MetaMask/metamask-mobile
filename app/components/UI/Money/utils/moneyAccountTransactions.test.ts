import { ethers } from 'ethers';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../Earn/constants/musd';
import {
  applySlippage,
  getSharesForWithdrawal,
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdrawBatch,
  updateMoneyAccountDepositTokenAmount,
  updateMoneyAccountWithdrawTokenAmount,
} from './moneyAccountTransactions';
import ReduxService from '../../../../core/redux/ReduxService';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import {
  type MoneyAccountVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';

jest.mock('../../Earn/constants/musd', () => ({
  MUSD_TOKEN_ADDRESS_BY_CHAIN: {} as Record<string, Hex>,
}));

jest.mock('../../../../core/AppConstants', () => ({
  __esModule: true,
  default: {
    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  },
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
jest.mock('../../../../util/notifications/methods/common');
jest.mock('../../../../core/redux');
jest.mock('../../../../selectors/featureFlagController/moneyAccount');

const mockPreviewDeposit = jest.fn();
const mockGetRate = jest.fn();

jest.mock('ethers', () => {
  const actualEthers = jest.requireActual('ethers');
  return {
    ...actualEthers,
    ethers: {
      ...actualEthers.ethers,
      Contract: jest.fn().mockImplementation((_address, abi) => {
        const abiStr = JSON.stringify(abi);
        if (abiStr.includes('previewDeposit')) {
          return { previewDeposit: mockPreviewDeposit };
        }
        if (abiStr.includes('getRate')) {
          return { getRate: mockGetRate };
        }
        return {};
      }),
      utils: actualEthers.ethers.utils,
    },
  };
});

const mockGetProviderByChainId = jest.mocked(getProviderByChainId);
const mockSelectMoneyAccountVaultConfig = jest.mocked(
  selectMoneyAccountVaultConfig,
);

const MOCK_CHAIN_ID = '0x1' as Hex;
const MOCK_MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;
const MOCK_BORING_VAULT = '0xB5F07d769dD60fE54c97dd53101181073DDf21b2' as Hex;
const MOCK_TELLER = '0x86821F179eaD9F0b3C79b2f8deF0227eEBFDc9f9' as Hex;
const MOCK_ACCOUNTANT = '0x800ebc3B74F67EaC27C9CCE4E4FF28b17CdCA173' as Hex;
const MOCK_LENS = '0x846a7832022350434B5cC006d07cc9c782469660' as Hex;
const MOCK_PROVIDER = {} as ethers.providers.Provider;

const MOCK_VAULT_CONFIG: MoneyAccountVaultConfig = {
  chainId: '0xa4b1',
  boringVault: MOCK_BORING_VAULT,
  tellerAddress: MOCK_TELLER,
  accountantAddress: MOCK_ACCOUNTANT,
  lensAddress: MOCK_LENS,
};

describe('moneyAccountTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MUSD_TOKEN_ADDRESS_BY_CHAIN as Record<string, Hex>)[MOCK_CHAIN_ID] =
      MOCK_MUSD_ADDRESS;
  });

  describe('applySlippage', () => {
    it('applies 0.2% slippage to a round value', () => {
      const result = applySlippage(BigInt(1000));
      expect(result).toBe(BigInt(998));
    });

    it('applies 0.2% slippage with integer truncation', () => {
      const result = applySlippage(BigInt(1));
      expect(result).toBe(BigInt(0));
    });

    it('applies 0.2% slippage to a large value', () => {
      const amount = BigInt('1000000000000000000');
      const expected = (amount * BigInt(998)) / BigInt(1000);
      expect(applySlippage(amount)).toBe(expected);
    });

    it('returns 0 for 0 input', () => {
      expect(applySlippage(BigInt(0))).toBe(BigInt(0));
    });
  });

  describe('getSharesForWithdrawal', () => {
    it('converts amount to shares using the rate', () => {
      const amount = BigInt(1_000_000);
      const rate = BigInt(1_000_000);
      expect(getSharesForWithdrawal(amount, rate)).toBe(BigInt(1_000_000));
    });

    it('scales down when rate is higher than 1:1', () => {
      const amount = BigInt(1_000_000);
      const rate = BigInt(2_000_000);
      expect(getSharesForWithdrawal(amount, rate)).toBe(BigInt(500_000));
    });

    it('scales up when rate is lower than 1:1', () => {
      const amount = BigInt(2_000_000);
      const rate = BigInt(1_000_000);
      expect(getSharesForWithdrawal(amount, rate)).toBe(BigInt(2_000_000));
    });

    it('handles large amounts without overflow', () => {
      const amount = BigInt('1000000000000');
      const rate = BigInt('1500000');
      const result = getSharesForWithdrawal(amount, rate);
      expect(result).toBe((amount * BigInt(1_000_000)) / rate);
    });
  });

  describe('buildMoneyAccountDepositBatch', () => {
    it('returns approve and deposit transactions with correct types', async () => {
      mockPreviewDeposit.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await buildMoneyAccountDepositBatch({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        boringVault: MOCK_BORING_VAULT,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        lensAddress: MOCK_LENS,
        provider: MOCK_PROVIDER,
      });

      expect(result.approveTx.type).toBe(TransactionType.tokenMethodApprove);
      expect(result.approveTx.params.value).toBe('0x0');

      expect(result.depositTx.type).toBe(TransactionType.moneyAccountDeposit);
      expect(result.depositTx.params.to).toBe(MOCK_TELLER);
      expect(result.depositTx.params.value).toBe('0x0');
    });

    it('encodes approve data targeting the boring vault', async () => {
      mockPreviewDeposit.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await buildMoneyAccountDepositBatch({
        amount: BigInt(500_000),
        chainId: MOCK_CHAIN_ID,
        boringVault: MOCK_BORING_VAULT,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        lensAddress: MOCK_LENS,
        provider: MOCK_PROVIDER,
      });

      expect(result.approveTx.params.data).toBeDefined();
      expect(typeof result.approveTx.params.data).toBe('string');
      expect(result.approveTx.params.data.startsWith('0x')).toBe(true);
    });

    it('calls previewDeposit with correct arguments', async () => {
      mockPreviewDeposit.mockResolvedValue(ethers.BigNumber.from('500000'));

      await buildMoneyAccountDepositBatch({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        boringVault: MOCK_BORING_VAULT,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        lensAddress: MOCK_LENS,
        provider: MOCK_PROVIDER,
      });

      expect(mockPreviewDeposit).toHaveBeenCalledWith(
        expect.any(String),
        '1000000',
        MOCK_BORING_VAULT,
        MOCK_ACCOUNTANT,
      );
    });
  });

  describe('updateMoneyAccountDepositTokenAmount', () => {
    const mockTransactionMeta = {
      id: 'tx-1',
      chainId: MOCK_VAULT_CONFIG.chainId as Hex,
    } as unknown as TransactionMeta;

    beforeEach(() => {
      // Default: vault config present, provider present
      mockGetProviderByChainId.mockReturnValue(MOCK_PROVIDER as never);
      mockSelectMoneyAccountVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
      (
        jest.mocked(ReduxService) as unknown as {
          store: { getState: jest.Mock };
        }
      ).store = { getState: jest.fn().mockReturnValue({}) };
    });

    it('returns indexed approve and deposit calls for a valid amount', async () => {
      mockPreviewDeposit.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await updateMoneyAccountDepositTokenAmount(
        mockTransactionMeta,
        '1.0',
      );

      expect(result).toHaveLength(2);
      expect(result[0].nestedTransactionIndex).toBe(0);
      expect(result[0].transactionData).toMatch(/^0x/);
      expect(result[1].nestedTransactionIndex).toBe(1);
      expect(result[1].transactionData).toMatch(/^0x/);
    });

    it('calls previewDeposit with the converted amount', async () => {
      mockPreviewDeposit.mockResolvedValue(ethers.BigNumber.from('1000000'));

      await updateMoneyAccountDepositTokenAmount(mockTransactionMeta, '1.0');

      // 1.0 USDC with 6 decimals = 1_000_000
      expect(mockPreviewDeposit).toHaveBeenCalledWith(
        expect.any(String),
        '1000000',
        MOCK_VAULT_CONFIG.boringVault,
        MOCK_VAULT_CONFIG.accountantAddress,
      );
    });

    it('returns [] when vault config is missing', async () => {
      mockSelectMoneyAccountVaultConfig.mockReturnValue(undefined);

      const result = await updateMoneyAccountDepositTokenAmount(
        mockTransactionMeta,
        '1.0',
      );

      expect(result).toEqual([]);
      expect(mockGetProviderByChainId).not.toHaveBeenCalled();
      expect(mockPreviewDeposit).not.toHaveBeenCalled();
    });

    it('returns [] when provider is missing', async () => {
      mockGetProviderByChainId.mockReturnValue(undefined as never);

      const result = await updateMoneyAccountDepositTokenAmount(
        mockTransactionMeta,
        '1.0',
      );

      expect(result).toEqual([]);
      expect(mockPreviewDeposit).not.toHaveBeenCalled();
    });

    it('rejects when previewDeposit fails so the dispatcher can log the error', async () => {
      const rpcError = new Error('RPC connection refused');
      mockPreviewDeposit.mockRejectedValue(rpcError);

      await expect(
        updateMoneyAccountDepositTokenAmount(mockTransactionMeta, '1.0'),
      ).rejects.toThrow('RPC connection refused');
    });
  });

  describe('updateMoneyAccountWithdrawTokenAmount', () => {
    const mockGetState = jest.mocked(ReduxService).store.getState as jest.Mock;
    const mockSelectVaultConfig = jest.mocked(selectMoneyAccountVaultConfig);
    const mockSelectPrimaryMoneyAccount = jest.mocked(
      selectPrimaryMoneyAccount,
    );
    const mockSelectEvmAddress = jest.mocked(selectEvmAddress);
    const mockGetProviderByChainId = jest.mocked(getProviderByChainId);

    const MOCK_VAULT_CONFIG = {
      chainId: MOCK_CHAIN_ID,
      boringVault: MOCK_BORING_VAULT,
      tellerAddress: MOCK_TELLER,
      accountantAddress: MOCK_ACCOUNTANT,
      lensAddress: MOCK_LENS,
    };
    const MOCK_MONEY_ACCOUNT_ADDRESS =
      '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex;
    const MOCK_RECIPIENT = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;

    const MOCK_TX_META = {
      id: 'tx-1',
      chainId: MOCK_CHAIN_ID,
    } as unknown as TransactionMeta;

    beforeEach(() => {
      mockGetState.mockReturnValue({});
      mockSelectVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
      mockSelectPrimaryMoneyAccount.mockReturnValue({
        address: MOCK_MONEY_ACCOUNT_ADDRESS,
      } as ReturnType<typeof selectPrimaryMoneyAccount>);
      mockSelectEvmAddress.mockReturnValue(MOCK_RECIPIENT);
      mockGetProviderByChainId.mockReturnValue(
        MOCK_PROVIDER as ReturnType<typeof getProviderByChainId>,
      );
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('1000000'));
    });

    it('returns two UpdateTransactionPayAmountCall entries with nestedTransactionIndex 0 and 1', async () => {
      const result = await updateMoneyAccountWithdrawTokenAmount(
        MOCK_TX_META,
        '1',
      );

      expect(result).toHaveLength(2);
      expect(result[0].nestedTransactionIndex).toBe(0);
      expect(result[1].nestedTransactionIndex).toBe(1);
    });

    it('returns calldata hex strings for both nested transactions', async () => {
      const result = await updateMoneyAccountWithdrawTokenAmount(
        MOCK_TX_META,
        '1',
      );

      expect(result[0].transactionData).toBeDefined();
      expect(result[0].transactionData.startsWith('0x')).toBe(true);

      expect(result[1].transactionData).toBeDefined();
      expect(result[1].transactionData.startsWith('0x')).toBe(true);
    });

    it('returns empty array when vaultConfig is missing', async () => {
      mockSelectVaultConfig.mockReturnValue(undefined);

      const result = await updateMoneyAccountWithdrawTokenAmount(
        MOCK_TX_META,
        '1',
      );

      expect(result).toEqual([]);
    });

    it('returns empty array when primaryMoneyAccount is missing', async () => {
      mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);

      const result = await updateMoneyAccountWithdrawTokenAmount(
        MOCK_TX_META,
        '1',
      );

      expect(result).toEqual([]);
    });

    it('returns empty array when recipient (selectEvmAddress) is missing', async () => {
      mockSelectEvmAddress.mockReturnValue(undefined);

      const result = await updateMoneyAccountWithdrawTokenAmount(
        MOCK_TX_META,
        '1',
      );

      expect(result).toEqual([]);
    });

    it('returns empty array when provider is not available for the chain', async () => {
      mockGetProviderByChainId.mockReturnValue(
        undefined as unknown as ReturnType<typeof getProviderByChainId>,
      );

      const result = await updateMoneyAccountWithdrawTokenAmount(
        MOCK_TX_META,
        '1',
      );

      expect(result).toEqual([]);
    });
  });

  describe('buildMoneyAccountWithdrawBatch', () => {
    const MOCK_MONEY_ACCOUNT_ADDRESS =
      '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex;
    const MOCK_RECIPIENT_ADDRESS =
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;

    it('returns withdrawTx and transferTx with correct transaction types', async () => {
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await buildMoneyAccountWithdrawBatch({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
        recipient: MOCK_RECIPIENT_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      expect(result.withdrawTx.type).toBe(TransactionType.moneyAccountWithdraw);
      expect(result.withdrawTx.params.to).toBe(MOCK_TELLER);
      expect(result.withdrawTx.params.value).toBe('0x0');

      expect(result.transferTx.type).toBe(TransactionType.tokenMethodTransfer);
      expect(result.transferTx.params.value).toBe('0x0');
    });

    it('transferTx targets the USDC contract address', async () => {
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await buildMoneyAccountWithdrawBatch({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
        recipient: MOCK_RECIPIENT_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      // transferTx.to is the ERC-20 token contract (USDC), not the recipient
      expect(result.transferTx.params.to).not.toBe(MOCK_RECIPIENT_ADDRESS);
      expect(result.transferTx.params.to.startsWith('0x')).toBe(true);
    });

    it('encodes both withdraw and transfer data as hex strings', async () => {
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await buildMoneyAccountWithdrawBatch({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
        recipient: MOCK_RECIPIENT_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      expect(result.withdrawTx.params.data).toBeDefined();
      expect(result.withdrawTx.params.data.startsWith('0x')).toBe(true);

      expect(result.transferTx.params.data).toBeDefined();
      expect(result.transferTx.params.data.startsWith('0x')).toBe(true);
    });

    it('calls getRate on the accountant contract', async () => {
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('2000000'));

      await buildMoneyAccountWithdrawBatch({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
        recipient: MOCK_RECIPIENT_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      expect(mockGetRate).toHaveBeenCalledTimes(1);
    });

    it('skips getRate when amount is 0 (placeholder batch)', async () => {
      const result = await buildMoneyAccountWithdrawBatch({
        amount: BigInt(0),
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
        recipient: MOCK_RECIPIENT_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      expect(mockGetRate).not.toHaveBeenCalled();
      expect(result.withdrawTx.params.data.startsWith('0x')).toBe(true);
      expect(result.transferTx.params.data.startsWith('0x')).toBe(true);
    });

    it('encodes the recipient address in the transfer calldata', async () => {
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await buildMoneyAccountWithdrawBatch({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
        recipient: MOCK_RECIPIENT_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      // The recipient address (lowercased, without 0x prefix) should appear in the calldata
      expect(result.transferTx.params.data.toLowerCase()).toContain(
        MOCK_RECIPIENT_ADDRESS.toLowerCase().slice(2),
      );
    });
  });
});
