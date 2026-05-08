import { ethers } from 'ethers';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../Earn/constants/musd';
import {
  applySlippage,
  getSharesForWithdrawal,
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdraw,
  updateMoneyAccountDepositTokenAmount,
  updateMoneyAccountWithdrawTokenAmount,
} from './moneyAccountTransactions';
import {
  type MoneyAccountVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import ReduxService from '../../../../core/redux';

jest.mock('../../Earn/constants/musd', () => ({
  MUSD_TOKEN_ADDRESS_BY_CHAIN: {} as Record<string, Hex>,
}));

jest.mock('../../../../core/AppConstants', () => ({
  __esModule: true,
  default: {
    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  },
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

const MOCK_CHAIN_ID = '0x8f' as Hex;
const MOCK_MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;
const MOCK_BORING_VAULT = '0xB5F07d769dD60fE54c97dd53101181073DDf21b2' as Hex;
const MOCK_TELLER = '0x86821F179eaD9F0b3C79b2f8deF0227eEBFDc9f9' as Hex;
const MOCK_ACCOUNTANT = '0x800ebc3B74F67EaC27C9CCE4E4FF28b17CdCA173' as Hex;
const MOCK_LENS = '0x846a7832022350434B5cC006d07cc9c782469660' as Hex;
const MOCK_TO_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678' as Hex;
const MOCK_PROVIDER = {} as ethers.providers.Provider;

const MOCK_VAULT_CONFIG: MoneyAccountVaultConfig = {
  chainId: MOCK_CHAIN_ID,
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
    it('resolves to an empty array (stub implementation)', async () => {
      const transactionMeta = {
        id: 'tx-1',
        nestedTransactions: [],
      } as unknown as TransactionMeta;

      await expect(
        updateMoneyAccountWithdrawTokenAmount(transactionMeta, '1.23'),
      ).resolves.toEqual([]);
    });

    it('resolves to an array regardless of transactionMeta shape', async () => {
      const transactionMeta = {
        id: 'tx-2',
      } as unknown as TransactionMeta;

      const result = await updateMoneyAccountWithdrawTokenAmount(
        transactionMeta,
        '1.23',
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('buildMoneyAccountWithdraw', () => {
    it('returns withdraw params with correct transaction type', async () => {
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await buildMoneyAccountWithdraw({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        toAddress: MOCK_TO_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      expect(result.params.to).toBe(MOCK_TELLER);
      expect(result.params.value).toBe('0x0');
      expect(result.options.type).toBe(TransactionType.moneyAccountWithdraw);
      expect(result.options.origin).toBe(ORIGIN_METAMASK);
      expect(result.options.requireApproval).toBe(true);
    });

    it('throws when mUSD is not deployed on the chain', async () => {
      const unsupportedChain = '0xdead' as Hex;

      await expect(
        buildMoneyAccountWithdraw({
          amount: BigInt(1_000_000),
          chainId: unsupportedChain,
          tellerAddress: MOCK_TELLER,
          accountantAddress: MOCK_ACCOUNTANT,
          toAddress: MOCK_TO_ADDRESS,
          provider: MOCK_PROVIDER,
        }),
      ).rejects.toThrow(`mUSD not deployed on chain ${unsupportedChain}`);
    });

    it('calls getRate on the accountant contract', async () => {
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('2000000'));

      await buildMoneyAccountWithdraw({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        toAddress: MOCK_TO_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      expect(mockGetRate).toHaveBeenCalledTimes(1);
    });

    it('encodes withdraw data as a hex string', async () => {
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await buildMoneyAccountWithdraw({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        toAddress: MOCK_TO_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      expect(result.params.data).toBeDefined();
      expect(typeof result.params.data).toBe('string');
      expect(result.params.data.startsWith('0x')).toBe(true);
    });
  });
});
