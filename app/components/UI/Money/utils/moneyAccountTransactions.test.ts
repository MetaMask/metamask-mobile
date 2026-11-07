import { ethers } from 'ethers';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../Earn/constants/musd';
import {
  applySlippage,
  getSharesForWithdrawal,
  buildMoneyAccountDepositBatch,
  buildMoneyAccountWithdrawBatch,
  updateMoneyAccountDepositTokenAmount,
  updateMoneyAccountWithdrawTokenAmount,
  getMoneyAccountDepositTransactionsData,
  getMoneyAccountWithdrawTransactionsData,
  getMoneyAccountDepositAssetId,
  getMoneyAccountWithdrawTransferTarget,
  getMoneyAccountWithdrawTransferUpdate,
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
  MUSD_DECIMALS: 6,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN: {
    // Monad (0x8f) mUSD CAIP-19 asset id.
    '0x8f': 'eip155:143/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    // Mainnet (0x1) mUSD CAIP-19 asset id.
    '0x1': 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  } as Record<string, string>,
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

const MOCK_CHAIN_ID = '0x8f' as Hex;
const MOCK_MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;
const MOCK_BORING_VAULT = '0xB5F07d769dD60fE54c97dd53101181073DDf21b2' as Hex;
const MOCK_TELLER = '0x86821F179eaD9F0b3C79b2f8deF0227eEBFDc9f9' as Hex;
const MOCK_ACCOUNTANT = '0x800ebc3B74F67EaC27C9CCE4E4FF28b17CdCA173' as Hex;
const MOCK_LENS = '0x846a7832022350434B5cC006d07cc9c782469660' as Hex;
const MOCK_PROVIDER = {} as ethers.providers.Provider;

const MOCK_MONEY_ACCOUNT_ADDRESS =
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex;
const MOCK_RECIPIENT = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;
const MOCK_WITHDRAW_NESTED: NonNullable<TransactionMeta['nestedTransactions']> =
  [
    { to: MOCK_TELLER, data: '0x' as Hex },
    {
      to: MOCK_MUSD_ADDRESS,
      data: '0x' as Hex,
      type: TransactionType.tokenMethodTransfer,
    },
  ];
const QUOTED_PAYMENT_TOKEN = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex,
  chainId: '0x1' as Hex,
};
const DIRECT_PAYMENT_TOKEN = {
  address: MOCK_MUSD_ADDRESS,
  chainId: MOCK_CHAIN_ID,
};
const ERC20_TRANSFER_INTERFACE = new ethers.utils.Interface([
  'function transfer(address to, uint256 amount)',
]);

function encodeTransfer(to: Hex, amount: bigint): Hex {
  return ERC20_TRANSFER_INTERFACE.encodeFunctionData('transfer', [
    to,
    amount.toString(),
  ]) as Hex;
}

function decodeTransfer(data: Hex): { to: string; amount: string } {
  const [to, amount] = ERC20_TRANSFER_INTERFACE.decodeFunctionData(
    'transfer',
    data,
  );
  return { to: (to as string).toLowerCase(), amount: amount.toString() };
}

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
    const SHARE_SCALAR = BigInt(1_000_000);

    it('converts amount to shares at 1:1 rate (exact division)', () => {
      const amount = BigInt(1_000_000);
      const rate = BigInt(1_000_000);
      // 1_000_000 * 1_000_000 / 1_000_000 = exact, ceiling = floor
      expect(getSharesForWithdrawal(amount, rate)).toBe(BigInt(1_000_000));
    });

    it('scales down when rate is higher than 1:1 (exact division)', () => {
      const amount = BigInt(1_000_000);
      const rate = BigInt(2_000_000);
      // 1_000_000 * 1_000_000 / 2_000_000 = exact 500_000
      expect(getSharesForWithdrawal(amount, rate)).toBe(BigInt(500_000));
    });

    it('scales up when rate is lower than 1:1 (exact division)', () => {
      const amount = BigInt(2_000_000);
      const rate = BigInt(1_000_000);
      expect(getSharesForWithdrawal(amount, rate)).toBe(BigInt(2_000_000));
    });

    it('uses ceiling division — rounds up when remainder exists', () => {
      // 1_000_000 * 1_000_000 = 1_000_000_000_000
      // floor(1_000_000_000_000 / 3_000_000) = 333_333
      // ceil should be 333_334
      const amount = BigInt(1_000_000);
      const rate = BigInt(3_000_000);
      const floorResult = (amount * SHARE_SCALAR) / rate;
      expect(floorResult).toBe(BigInt(333_333));
      expect(getSharesForWithdrawal(amount, rate)).toBe(BigInt(333_334));
    });

    it('reproduces the exact reported scenario — $1.96 at rate ~1,000,094', () => {
      // This was the failing case: floor division gave 1,959,815 shares,
      // contract mulDivDown produced 1,959,999 assetsOut < 1,960,000 minimumAssets
      const amount = BigInt(1_960_000); // $1.96 in 6 decimals
      const rate = BigInt(1_000_094);

      const floorShares = (amount * SHARE_SCALAR) / rate;
      expect(floorShares).toBe(BigInt(1_959_815)); // old buggy value

      const ceilShares = getSharesForWithdrawal(amount, rate);
      expect(ceilShares).toBe(BigInt(1_959_816)); // fixed: one more share

      // Verify: contract mulDivDown(ceilShares * rate / SCALAR) >= amount
      const assetsOut = (ceilShares * rate) / SHARE_SCALAR;
      expect(assetsOut).toBeGreaterThanOrEqual(amount);
    });

    it('reproduces the reported $1.00 scenario — was passing by luck', () => {
      const amount = BigInt(1_000_000);
      const rate = BigInt(1_000_094);

      const floorShares = (amount * SHARE_SCALAR) / rate;
      const ceilShares = getSharesForWithdrawal(amount, rate);

      // With ceiling, we get at least as many shares as floor
      expect(ceilShares).toBeGreaterThanOrEqual(floorShares);

      // Contract-side check still passes
      const assetsOut = (ceilShares * rate) / SHARE_SCALAR;
      expect(assetsOut).toBeGreaterThanOrEqual(amount);
    });

    it('handles large amounts with ceiling division', () => {
      const amount = BigInt('1000000000000'); // $1M in 6 decimals
      const rate = BigInt('1500000');
      const result = getSharesForWithdrawal(amount, rate);
      const floorResult = (amount * SHARE_SCALAR) / rate;
      // Ceiling >= floor always
      expect(result).toBeGreaterThanOrEqual(floorResult);
      // And at most 1 more than floor
      expect(result - floorResult).toBeLessThanOrEqual(1n);
    });

    it('ceiling division equals floor when division is exact', () => {
      // 2_000_000 * 1_000_000 / 500_000 = 4_000_000_000 (exact)
      const amount = BigInt(2_000_000);
      const rate = BigInt(500_000);
      const floorResult = (amount * SHARE_SCALAR) / rate;
      expect(getSharesForWithdrawal(amount, rate)).toBe(floorResult);
    });

    it('returns 0 for zero amount', () => {
      expect(getSharesForWithdrawal(0n, BigInt(1_000_000))).toBe(0n);
    });

    it('guarantees assetsOut >= amount for many rate values', () => {
      // Fuzz-like: sweep a range of rates near 1:1
      const amount = BigInt(1_960_000);
      for (let r = 999_900; r <= 1_000_200; r++) {
        const rate = BigInt(r);
        const shares = getSharesForWithdrawal(amount, rate);
        // Simulate contract mulDivDown
        const assetsOut = (shares * rate) / SHARE_SCALAR;
        expect(assetsOut).toBeGreaterThanOrEqual(amount);
      }
    });
  });

  describe('getMoneyAccountDepositAssetId', () => {
    it('returns the mapped asset id for a known chain', () => {
      expect(getMoneyAccountDepositAssetId('0x8f' as Hex)).toBe(
        MUSD_TOKEN_ASSET_ID_BY_CHAIN['0x8f'],
      );
      expect(getMoneyAccountDepositAssetId('0x1' as Hex)).toBe(
        MUSD_TOKEN_ASSET_ID_BY_CHAIN['0x1'],
      );
    });

    it('falls back to the Monad asset id for an unknown chain', () => {
      expect(getMoneyAccountDepositAssetId('0xdead' as Hex)).toBe(
        MUSD_TOKEN_ASSET_ID_BY_CHAIN['0x8f'],
      );
    });

    it('falls back to the Monad asset id when chainId is undefined', () => {
      expect(getMoneyAccountDepositAssetId(undefined)).toBe(
        MUSD_TOKEN_ASSET_ID_BY_CHAIN['0x8f'],
      );
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
      expect(result.approveTx.params.data?.startsWith('0x')).toBe(true);
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

    it('returns undefined data fields when initialiseWithoutData is true', async () => {
      const result = await buildMoneyAccountDepositBatch({
        amount: BigInt(0),
        chainId: MOCK_CHAIN_ID,
        boringVault: MOCK_BORING_VAULT,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        lensAddress: MOCK_LENS,
        provider: MOCK_PROVIDER,
        initialiseWithoutData: true,
      });

      expect(result.approveTx.params.data).toBeUndefined();
      expect(result.depositTx.params.data).toBeUndefined();
      expect(result.approveTx.type).toBe(TransactionType.tokenMethodApprove);
      expect(result.depositTx.type).toBe(TransactionType.moneyAccountDeposit);
      expect(result.approveTx.params.to).toBe(MOCK_MUSD_ADDRESS);
      expect(result.depositTx.params.to).toBe(MOCK_TELLER);
    });

    it('skips calldata encoding but still resolves minimumMint for non-zero amounts when initialiseWithoutData is true', async () => {
      mockPreviewDeposit.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await buildMoneyAccountDepositBatch({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        boringVault: MOCK_BORING_VAULT,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        lensAddress: MOCK_LENS,
        provider: MOCK_PROVIDER,
        initialiseWithoutData: true,
      });

      expect(result.approveTx.params.data).toBeUndefined();
      expect(result.depositTx.params.data).toBeUndefined();
    });

    it('builds calldata normally when initialiseWithoutData is false', async () => {
      mockPreviewDeposit.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await buildMoneyAccountDepositBatch({
        amount: BigInt(1_000_000),
        chainId: MOCK_CHAIN_ID,
        boringVault: MOCK_BORING_VAULT,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        lensAddress: MOCK_LENS,
        provider: MOCK_PROVIDER,
        initialiseWithoutData: false,
      });

      expect(result.approveTx.params.data).toBeDefined();
      expect(result.approveTx.params.data?.startsWith('0x')).toBe(true);
      expect(result.depositTx.params.data).toBeDefined();
      expect(result.depositTx.params.data?.startsWith('0x')).toBe(true);
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

    it('uses recipientOverride as recipient when provided', async () => {
      const overrideAddress =
        '0x1111111111111111111111111111111111111111' as Hex;

      const result = await updateMoneyAccountWithdrawTokenAmount(
        MOCK_TX_META,
        '1',
        overrideAddress,
      );

      expect(result).toHaveLength(2);
      const encodedOverride = overrideAddress
        .toLowerCase()
        .replace('0x', '')
        .padStart(64, '0');
      expect(result[1].transactionData.toLowerCase()).toContain(
        encodedOverride,
      );
    });

    it('falls back to selectEvmAddress when recipientOverride is undefined', async () => {
      const result = await updateMoneyAccountWithdrawTokenAmount(
        MOCK_TX_META,
        '1',
      );

      expect(result).toHaveLength(2);
      const encodedRecipient = MOCK_RECIPIENT.toLowerCase()
        .replace('0x', '')
        .padStart(64, '0');
      expect(result[1].transactionData.toLowerCase()).toContain(
        encodedRecipient,
      );
    });

    it('keeps the mUSD on the money account when the receive token is quoted', async () => {
      const result = await updateMoneyAccountWithdrawTokenAmount(
        { ...MOCK_TX_META, nestedTransactions: MOCK_WITHDRAW_NESTED },
        '1',
        MOCK_RECIPIENT,
        QUOTED_PAYMENT_TOKEN,
      );

      expect(decodeTransfer(result[1].transactionData)).toStrictEqual({
        to: MOCK_MONEY_ACCOUNT_ADDRESS,
        amount: '1000000',
      });
    });

    it('pays the recipient directly when the receive token is mUSD on the vault chain', async () => {
      const result = await updateMoneyAccountWithdrawTokenAmount(
        { ...MOCK_TX_META, nestedTransactions: MOCK_WITHDRAW_NESTED },
        '1',
        MOCK_RECIPIENT,
        DIRECT_PAYMENT_TOKEN,
      );

      expect(decodeTransfer(result[1].transactionData)).toStrictEqual({
        to: MOCK_RECIPIENT,
        amount: '1000000',
      });
    });
  });

  describe('getMoneyAccountWithdrawTransferTarget', () => {
    const transactionMeta = {
      chainId: MOCK_CHAIN_ID,
      nestedTransactions: MOCK_WITHDRAW_NESTED,
    } as unknown as TransactionMeta;

    it('returns the recipient when no receive token is selected', () => {
      expect(
        getMoneyAccountWithdrawTransferTarget({
          moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
          recipient: MOCK_RECIPIENT,
          transactionMeta,
        }),
      ).toBe(MOCK_RECIPIENT);
    });

    it('returns the recipient for mUSD on the vault chain', () => {
      expect(
        getMoneyAccountWithdrawTransferTarget({
          moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
          paymentToken: {
            address: MOCK_MUSD_ADDRESS.toUpperCase().replace('0X', '0x') as Hex,
            chainId: MOCK_CHAIN_ID,
          },
          recipient: MOCK_RECIPIENT,
          transactionMeta,
        }),
      ).toBe(MOCK_RECIPIENT);
    });

    it('returns the money account for a quoted receive token', () => {
      expect(
        getMoneyAccountWithdrawTransferTarget({
          moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
          paymentToken: QUOTED_PAYMENT_TOKEN,
          recipient: MOCK_RECIPIENT,
          transactionMeta,
        }),
      ).toBe(MOCK_MONEY_ACCOUNT_ADDRESS);
    });

    it('returns the money account for mUSD on another chain', () => {
      expect(
        getMoneyAccountWithdrawTransferTarget({
          moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
          paymentToken: { address: MOCK_MUSD_ADDRESS, chainId: '0x1' },
          recipient: MOCK_RECIPIENT,
          transactionMeta,
        }),
      ).toBe(MOCK_MONEY_ACCOUNT_ADDRESS);
    });
  });

  describe('getMoneyAccountWithdrawTransferUpdate', () => {
    function buildFundedWithdraw(transferTo: Hex, amount = 2_500_000n) {
      return {
        chainId: MOCK_CHAIN_ID,
        txParams: { from: MOCK_MONEY_ACCOUNT_ADDRESS },
        nestedTransactions: [
          MOCK_WITHDRAW_NESTED[0],
          {
            ...MOCK_WITHDRAW_NESTED[1],
            data: encodeTransfer(transferTo, amount),
          },
        ],
      } as unknown as TransactionMeta;
    }

    it('re-encodes the same amount to the money account when the receive token becomes quoted', () => {
      const update = getMoneyAccountWithdrawTransferUpdate(
        buildFundedWithdraw(MOCK_RECIPIENT),
        MOCK_RECIPIENT,
        QUOTED_PAYMENT_TOKEN,
      );

      expect(update?.nestedTransactionIndex).toBe(1);
      expect(decodeTransfer(update?.transactionData as Hex)).toStrictEqual({
        to: MOCK_MONEY_ACCOUNT_ADDRESS,
        amount: '2500000',
      });
    });

    it('re-encodes to the recipient when the receive token becomes direct', () => {
      const update = getMoneyAccountWithdrawTransferUpdate(
        buildFundedWithdraw(MOCK_MONEY_ACCOUNT_ADDRESS),
        MOCK_RECIPIENT,
        DIRECT_PAYMENT_TOKEN,
      );

      expect(decodeTransfer(update?.transactionData as Hex)).toStrictEqual({
        to: MOCK_RECIPIENT,
        amount: '2500000',
      });
    });

    it('re-encodes to a new recipient for a direct withdrawal', () => {
      const newRecipient = '0x2222222222222222222222222222222222222222' as Hex;

      const update = getMoneyAccountWithdrawTransferUpdate(
        buildFundedWithdraw(MOCK_RECIPIENT),
        newRecipient,
        DIRECT_PAYMENT_TOKEN,
      );

      expect(decodeTransfer(update?.transactionData as Hex)).toStrictEqual({
        to: newRecipient,
        amount: '2500000',
      });
    });

    it('leaves a quoted withdrawal alone when the recipient changes', () => {
      const update = getMoneyAccountWithdrawTransferUpdate(
        buildFundedWithdraw(MOCK_MONEY_ACCOUNT_ADDRESS),
        '0x2222222222222222222222222222222222222222' as Hex,
        QUOTED_PAYMENT_TOKEN,
      );

      expect(update).toBeUndefined();
    });

    it('leaves the batch alone when the transfer already pays the target', () => {
      const update = getMoneyAccountWithdrawTransferUpdate(
        buildFundedWithdraw(MOCK_RECIPIENT),
        MOCK_RECIPIENT,
        DIRECT_PAYMENT_TOKEN,
      );

      expect(update).toBeUndefined();
    });

    it('leaves an unfunded placeholder alone', () => {
      const update = getMoneyAccountWithdrawTransferUpdate(
        buildFundedWithdraw(MOCK_RECIPIENT, 0n),
        MOCK_RECIPIENT,
        QUOTED_PAYMENT_TOKEN,
      );

      expect(update).toBeUndefined();
    });
  });

  describe('buildMoneyAccountWithdrawBatch', () => {
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
      expect(result.withdrawTx.params.data?.startsWith('0x')).toBe(true);

      expect(result.transferTx.params.data).toBeDefined();
      expect(result.transferTx.params.data?.startsWith('0x')).toBe(true);
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
      expect(result.withdrawTx.params.data?.startsWith('0x')).toBe(true);
      expect(result.transferTx.params.data?.startsWith('0x')).toBe(true);
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
      expect(result.transferTx.params.data?.toLowerCase()).toContain(
        MOCK_RECIPIENT_ADDRESS.toLowerCase().slice(2),
      );
    });

    it('encodes minimumAssets as amount - 1 for defense-in-depth', async () => {
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const amount = BigInt(1_960_000);
      const result = await buildMoneyAccountWithdrawBatch({
        amount,
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
        recipient: MOCK_RECIPIENT_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      // Decode withdraw calldata to verify minimumAssets = amount - 1
      const iface = new ethers.utils.Interface([
        'function withdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to) returns (uint256 assetsOut)',
      ]);
      const withdrawData = result.withdrawTx.params.data;
      if (!withdrawData) throw new Error('Expected withdraw data');
      const decoded = iface.decodeFunctionData('withdraw', withdrawData);
      const encodedMinimumAssets = BigInt(decoded.minimumAssets.toString());
      expect(encodedMinimumAssets).toBe(amount - 1n);
    });

    it('encodes minimumAssets as 0 when amount is 0 (placeholder batch)', async () => {
      const result = await buildMoneyAccountWithdrawBatch({
        amount: BigInt(0),
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
        recipient: MOCK_RECIPIENT_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      const iface = new ethers.utils.Interface([
        'function withdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to) returns (uint256 assetsOut)',
      ]);
      const withdrawData = result.withdrawTx.params.data;
      if (!withdrawData) throw new Error('Expected withdraw data');
      const decoded = iface.decodeFunctionData('withdraw', withdrawData);
      expect(BigInt(decoded.minimumAssets.toString())).toBe(0n);
    });

    it('uses ceiling division for shareAmount in withdraw calldata', async () => {
      // Use a rate that produces a remainder to verify ceiling division
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('1000094'));

      const amount = BigInt(1_960_000);
      const result = await buildMoneyAccountWithdrawBatch({
        amount,
        chainId: MOCK_CHAIN_ID,
        tellerAddress: MOCK_TELLER,
        accountantAddress: MOCK_ACCOUNTANT,
        moneyAccountAddress: MOCK_MONEY_ACCOUNT_ADDRESS,
        recipient: MOCK_RECIPIENT_ADDRESS,
        provider: MOCK_PROVIDER,
      });

      const iface = new ethers.utils.Interface([
        'function withdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to) returns (uint256 assetsOut)',
      ]);
      const withdrawData = result.withdrawTx.params.data;
      if (!withdrawData) throw new Error('Expected withdraw data');
      const decoded = iface.decodeFunctionData('withdraw', withdrawData);
      const shareAmount = BigInt(decoded.shareAmount.toString());

      // With ceiling division: (1_960_000 * 1_000_000 + 1_000_094 - 1) / 1_000_094 = 1_959_816
      // Old floor division would give 1_959_815
      expect(shareAmount).toBe(BigInt(1_959_816));
    });
  });

  describe('getMoneyAccountDepositTransactionsData', () => {
    beforeEach(() => {
      mockGetProviderByChainId.mockReturnValue(MOCK_PROVIDER as never);
      mockSelectMoneyAccountVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
      (
        jest.mocked(ReduxService) as unknown as {
          store: { getState: jest.Mock };
        }
      ).store = { getState: jest.fn().mockReturnValue({}) };
    });

    it('returns two transaction param objects for a valid amount', async () => {
      mockPreviewDeposit.mockResolvedValue(ethers.BigNumber.from('1000000'));

      const result = await getMoneyAccountDepositTransactionsData(
        MOCK_CHAIN_ID,
        '1.0',
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        to: expect.any(String),
        data: expect.stringMatching(/^0x/),
        value: '0x0',
      });
      expect(result[1]).toMatchObject({
        to: expect.any(String),
        data: expect.stringMatching(/^0x/),
        value: '0x0',
      });
    });

    it('returns [] when vault config is missing', async () => {
      mockSelectMoneyAccountVaultConfig.mockReturnValue(undefined);

      const result = await getMoneyAccountDepositTransactionsData(
        MOCK_CHAIN_ID,
        '1.0',
      );

      expect(result).toEqual([]);
      expect(mockPreviewDeposit).not.toHaveBeenCalled();
    });

    it('returns [] when provider is missing', async () => {
      mockGetProviderByChainId.mockReturnValue(undefined as never);

      const result = await getMoneyAccountDepositTransactionsData(
        MOCK_CHAIN_ID,
        '1.0',
      );

      expect(result).toEqual([]);
      expect(mockPreviewDeposit).not.toHaveBeenCalled();
    });

    it('calls previewDeposit with the converted token amount', async () => {
      mockPreviewDeposit.mockResolvedValue(ethers.BigNumber.from('1000000'));

      await getMoneyAccountDepositTransactionsData(MOCK_CHAIN_ID, '1.0');

      // 1.0 with 6 decimals = 1_000_000
      expect(mockPreviewDeposit).toHaveBeenCalledWith(
        expect.any(String),
        '1000000',
        MOCK_VAULT_CONFIG.boringVault,
        MOCK_VAULT_CONFIG.accountantAddress,
      );
    });

    it('propagates RPC errors', async () => {
      mockPreviewDeposit.mockRejectedValue(new Error('RPC timeout'));

      await expect(
        getMoneyAccountDepositTransactionsData(MOCK_CHAIN_ID, '1.0'),
      ).rejects.toThrow('RPC timeout');
    });
  });

  describe('getMoneyAccountWithdrawTransactionsData', () => {
    const mockGetState = jest.mocked(ReduxService).store.getState as jest.Mock;
    const mockSelectVaultConfig = jest.mocked(selectMoneyAccountVaultConfig);
    const mockSelectPrimaryMoneyAccount = jest.mocked(
      selectPrimaryMoneyAccount,
    );
    const mockGetProvider = jest.mocked(getProviderByChainId);

    beforeEach(() => {
      mockGetState.mockReturnValue({});
      mockSelectVaultConfig.mockReturnValue(MOCK_VAULT_CONFIG);
      mockSelectPrimaryMoneyAccount.mockReturnValue({
        address: MOCK_MONEY_ACCOUNT_ADDRESS,
      } as ReturnType<typeof selectPrimaryMoneyAccount>);
      mockGetProvider.mockReturnValue(
        MOCK_PROVIDER as ReturnType<typeof getProviderByChainId>,
      );
      mockGetRate.mockResolvedValue(ethers.BigNumber.from('1000000'));
    });

    it('returns two transaction param objects for a valid amount', async () => {
      const result = await getMoneyAccountWithdrawTransactionsData(
        MOCK_CHAIN_ID,
        '1.0',
        MOCK_RECIPIENT,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        to: expect.any(String),
        data: expect.stringMatching(/^0x/),
        value: '0x0',
      });
      expect(result[1]).toMatchObject({
        to: expect.any(String),
        data: expect.stringMatching(/^0x/),
        value: '0x0',
      });
    });

    it('encodes the recipient address in the transfer calldata', async () => {
      const result = await getMoneyAccountWithdrawTransactionsData(
        MOCK_CHAIN_ID,
        '1.0',
        MOCK_RECIPIENT,
      );

      expect(result[1].data?.toLowerCase()).toContain(
        MOCK_RECIPIENT.toLowerCase().slice(2),
      );
    });

    it('returns [] when vault config is missing', async () => {
      mockSelectVaultConfig.mockReturnValue(undefined);

      const result = await getMoneyAccountWithdrawTransactionsData(
        MOCK_CHAIN_ID,
        '1.0',
        MOCK_RECIPIENT,
      );

      expect(result).toEqual([]);
      expect(mockGetRate).not.toHaveBeenCalled();
    });

    it('returns [] when primary money account is missing', async () => {
      mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);

      const result = await getMoneyAccountWithdrawTransactionsData(
        MOCK_CHAIN_ID,
        '1.0',
        MOCK_RECIPIENT,
      );

      expect(result).toEqual([]);
      expect(mockGetRate).not.toHaveBeenCalled();
    });

    it('returns [] when provider is missing', async () => {
      mockGetProvider.mockReturnValue(
        undefined as unknown as ReturnType<typeof getProviderByChainId>,
      );

      const result = await getMoneyAccountWithdrawTransactionsData(
        MOCK_CHAIN_ID,
        '1.0',
        MOCK_RECIPIENT,
      );

      expect(result).toEqual([]);
      expect(mockGetRate).not.toHaveBeenCalled();
    });
  });
});
