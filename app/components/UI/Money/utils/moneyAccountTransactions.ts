import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { CaipAssetType, Hex } from '@metamask/utils';
import { UpdateTransactionPayAmountCall } from '../../../Views/confirmations/types/transactions';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../Earn/constants/musd';
import AppConstants from '../../../../core/AppConstants';
import ReduxService from '../../../../core/redux/ReduxService';
import { RootState } from '../../../../reducers';
import {
  selectMoneyAccountVaultConfig,
  selectMoneyAccountWithdrawalSlippageBps,
} from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { calcTokenValue } from '../../../../util/transactions';

const LENS_ABI = [
  'function previewDeposit(address depositAsset, uint256 depositAmount, address boringVault, address accountant) view returns (uint256 shares)',
];

export const TELLER_ABI = [
  'function deposit(address depositAsset, uint256 depositAmount, uint256 minimumMint, address referralAddress) payable returns (uint256 shares)',
  'function withdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to) returns (uint256 assetsOut)',
];

const ACCOUNTANT_ABI = ['function getRate() view returns (uint256 rate)'];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount)',
  'function transfer(address to, uint256 amount)',
];

// -- Shared constants ------------------------------------------------------

const SLIPPAGE_NUMERATOR = BigInt(998);
const SLIPPAGE_DENOMINATOR = BigInt(1000);
const BPS_DENOMINATOR = BigInt(10_000);

/**
 * Applies a 0.2% slippage tolerance to a bigint value (used for deposits).
 * If this sanity-check causes a revert, no funds are lost — retry with a fresh quote.
 */
export function applySlippage(value: bigint): bigint {
  return (value * SLIPPAGE_NUMERATOR) / SLIPPAGE_DENOMINATOR;
}

/**
 * Applies a configurable slippage tolerance to a withdrawal amount to derive
 * `minimumAssets`. The slippage is expressed in basis points (bps),
 * e.g. 20 bps = 0.2%, 50 bps = 0.5%, 100 bps = 1.0%.
 *
 * For withdrawals the tolerance absorbs both rounding errors (from ceiling
 * division + contract mulDivDown) and any vault rate movement between the
 * client encoding the transaction and on-chain execution.
 *
 * Returns `0n` when the input is `0n`.
 */
export function applyWithdrawalSlippage(
  amount: bigint,
  slippageBps: number,
): bigint {
  if (amount === 0n) return 0n;
  const bps = BigInt(Math.round(slippageBps));
  const result = (amount * (BPS_DENOMINATOR - bps)) / BPS_DENOMINATOR;
  return result > 0n ? result : 0n;
}

// -- Shared types ----------------------------------------------------------

export interface MoneyAccountTxParams {
  params: {
    to: Hex;
    data: Hex;
    value: Hex;
  };
  type: TransactionType;
}

/**
 * Result shape for Money Account transaction batch builders. The string keys
 * (e.g. `approveTx`, `withdrawTx`) name each call so callers don't depend on
 * positional ordering in `addTransactionBatch.transactions[]`.
 */
type MoneyAccountBatchResult<TxKey extends string> = Record<
  TxKey,
  MoneyAccountTxParams
>;

// -- Deposit helpers -------------------------------------------------------

async function getExpectedDepositShares({
  lensAddress,
  boringVault,
  accountantAddress,
  musdAddress,
  amount,
  provider,
}: {
  lensAddress: string;
  boringVault: string;
  accountantAddress: string;
  musdAddress: string;
  amount: bigint;
  provider: ethers.providers.Provider;
}): Promise<bigint> {
  const lensContract = new ethers.Contract(lensAddress, LENS_ABI, provider);
  const shares = await lensContract.previewDeposit(
    musdAddress,
    amount.toString(),
    boringVault,
    accountantAddress,
  );
  return BigInt(shares.toString());
}

function buildApproveData(boringVault: string, amount: bigint): Hex {
  const iface = new ethers.utils.Interface(ERC20_ABI);
  return iface.encodeFunctionData('approve', [
    boringVault,
    amount.toString(),
  ]) as Hex;
}

function buildErc20TransferData(to: string, amount: bigint): Hex {
  const iface = new ethers.utils.Interface(ERC20_ABI);
  return iface.encodeFunctionData('transfer', [to, amount.toString()]) as Hex;
}

function buildDepositData(
  musdAddress: string,
  amount: bigint,
  minimumMint: bigint,
): Hex {
  const iface = new ethers.utils.Interface(TELLER_ABI);
  return iface.encodeFunctionData('deposit', [
    musdAddress,
    amount.toString(),
    minimumMint.toString(),
    AppConstants.ZERO_ADDRESS,
  ]) as Hex;
}

/**
 * Single source of truth for the deposit asset so both calldata encoding
 * (`buildMoneyAccountDepositBatch`) and Pay's `requiredAssets` agree.
 * @param _chainId - The chain ID to get the deposit asset address for.
 * @returns The deposit asset address for the given chain ID.
 */
export function getMoneyAccountDepositAssetAddress(chainId: Hex): Hex {
  const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId];
  if (!musdAddress) {
    throw new Error(`mUSD not deployed on chain ${chainId}`);
  }
  return musdAddress;
}

/**
 * Resolves the CAIP-19 asset id of the Money Account deposit asset (mUSD) for a
 * given chain. Pure mapping over `MUSD_TOKEN_ASSET_ID_BY_CHAIN`.
 *
 * Money Account is Monad-only today, so an unknown or undefined `chainId` falls
 * back to the Monad mUSD asset id rather than throwing — the entry-point gate
 * that consumes this should still resolve against the asset the deposit flow
 * actually targets.
 * @param chainId - The chain ID to get the deposit asset id for.
 * @returns The CAIP-19 asset id of the deposit asset for the given chain ID.
 */
export function getMoneyAccountDepositAssetId(chainId?: Hex): CaipAssetType {
  return (MUSD_TOKEN_ASSET_ID_BY_CHAIN[chainId as Hex] ??
    MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD]) as CaipAssetType;
}

export type MoneyAccountDepositBatchResult = MoneyAccountBatchResult<
  'approveTx' | 'depositTx'
>;

/**
 * Builds the approve + deposit transaction pair for a Money Account deposit.
 *
 * 1. Calls `previewDeposit` on the lens contract to get expected vault shares.
 * 2. Applies a 0.2% slippage tolerance to derive `minimumMint`.
 * 3. Encodes ERC-20 `approve(boringVault, amount)` on the mUSD token.
 * 4. Encodes `deposit(mUSD, amount, minimumMint, 0x0)` on the teller contract.
 */
export async function buildMoneyAccountDepositBatch({
  amount,
  chainId,
  boringVault,
  tellerAddress,
  accountantAddress,
  lensAddress,
  provider,
}: {
  amount: bigint;
  chainId: Hex;
  boringVault: string;
  tellerAddress: string;
  accountantAddress: string;
  lensAddress: string;
  provider: ethers.providers.Provider;
}): Promise<MoneyAccountDepositBatchResult> {
  const musdAddress = getMoneyAccountDepositAssetAddress(chainId);

  // Skip the RPC call for zero-amount placeholder batches (e.g. initial deposit submission).
  const minimumMint =
    amount === 0n
      ? 0n
      : applySlippage(
          await getExpectedDepositShares({
            lensAddress,
            boringVault,
            accountantAddress,
            musdAddress,
            amount,
            provider,
          }),
        );

  const approveData = buildApproveData(boringVault, amount);
  const depositData = buildDepositData(musdAddress, amount, minimumMint);

  return {
    approveTx: {
      params: {
        to: musdAddress,
        data: approveData,
        value: '0x0' as Hex,
      },
      type: TransactionType.tokenMethodApprove,
    },
    depositTx: {
      params: {
        to: tellerAddress as Hex,
        data: depositData,
        value: '0x0' as Hex,
      },
      type: TransactionType.moneyAccountDeposit,
    },
  };
}

/**
 * Returns the per-nested-call data updates required when the user changes
 * the deposit amount on a Money Account deposit confirmation.
 *
 * Reads vault config from the Redux store, calls `previewDeposit` on the
 * lens contract to derive an accurate `minimumMint`, and returns the
 * re-encoded approve + deposit calldata ready for `updateAtomicBatchData`.
 *
 * Returns `[]` (no-op) if vault config or provider is unavailable.
 * Lets `buildMoneyAccountDepositBatch` errors propagate so the dispatcher
 * can log them via its prep-error handler.
 */
export async function updateMoneyAccountDepositTokenAmount(
  transactionMeta: TransactionMeta,
  amountHuman: string,
): Promise<UpdateTransactionPayAmountCall[]> {
  const vaultConfig = selectMoneyAccountVaultConfig(
    ReduxService.store.getState() as RootState,
  );
  if (!vaultConfig) return [];

  const chainIdHex = transactionMeta.chainId as Hex;
  const provider = getProviderByChainId(chainIdHex);
  if (!provider) return [];

  const amount = BigInt(
    calcTokenValue(amountHuman, MUSD_DECIMALS)
      .decimalPlaces(0, BigNumber.ROUND_UP)
      .toFixed(0),
  );

  const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
    amount,
    chainId: chainIdHex,
    boringVault: vaultConfig.boringVault,
    tellerAddress: vaultConfig.tellerAddress,
    accountantAddress: vaultConfig.accountantAddress,
    lensAddress: vaultConfig.lensAddress,
    provider,
  });

  return [
    { nestedTransactionIndex: 0, transactionData: approveTx.params.data },
    { nestedTransactionIndex: 1, transactionData: depositTx.params.data },
  ];
}

/**
 * Returns the per-nested-call data updates required when the user changes
 * the withdrawal amount on a Money Account withdraw confirmation.
 *
 * Reads vault config, primary money account, and recipient from Redux, then
 * re-encodes the withdraw + ERC-20 transfer nested calls at the new amount.
 */
export async function updateMoneyAccountWithdrawTokenAmount(
  transactionMeta: TransactionMeta,
  amountHuman: string,
  recipientOverride?: Hex,
): Promise<UpdateTransactionPayAmountCall[]> {
  const state = ReduxService.store.getState() as RootState;
  const vaultConfig = selectMoneyAccountVaultConfig(state);
  const primaryMoneyAccount = selectPrimaryMoneyAccount(state);
  const recipient = recipientOverride ?? selectEvmAddress(state);
  const withdrawalSlippageBps = selectMoneyAccountWithdrawalSlippageBps(state);
  if (!vaultConfig || !primaryMoneyAccount?.address || !recipient) return [];

  const chainIdHex = transactionMeta.chainId as Hex;
  const provider = getProviderByChainId(chainIdHex);
  if (!provider) return [];

  const amount = BigInt(
    calcTokenValue(amountHuman, MUSD_DECIMALS)
      .decimalPlaces(0, BigNumber.ROUND_UP)
      .toFixed(0),
  );

  const { withdrawTx, transferTx } = await buildMoneyAccountWithdrawBatch({
    amount,
    chainId: chainIdHex,
    tellerAddress: vaultConfig.tellerAddress as Hex,
    accountantAddress: vaultConfig.accountantAddress as Hex,
    moneyAccountAddress: primaryMoneyAccount.address as Hex,
    recipient: recipient as Hex,
    provider,
    withdrawalSlippageBps,
  });

  return [
    { nestedTransactionIndex: 0, transactionData: withdrawTx.params.data },
    { nestedTransactionIndex: 1, transactionData: transferTx.params.data },
  ];
}

/**
 * Returns the approve + deposit transaction params for a Money Account deposit.
 *
 * @param chainId - Chain ID in hex
 * @param amountHuman - Human-readable deposit amount (e.g. "10.5")
 * @returns `[approveTx.params, depositTx.params]`, or `[]` if vault config or provider is unavailable
 */
export async function getMoneyAccountDepositTransactionsData(
  chainId: Hex,
  amountHuman: string,
): Promise<MoneyAccountTxParams['params'][]> {
  const vaultConfig = selectMoneyAccountVaultConfig(
    ReduxService.store.getState() as RootState,
  );
  if (!vaultConfig) return [];

  const provider = getProviderByChainId(chainId);
  if (!provider) return [];

  const amount = BigInt(
    calcTokenValue(amountHuman, MUSD_DECIMALS)
      .decimalPlaces(0, BigNumber.ROUND_UP)
      .toFixed(0),
  );

  const { approveTx, depositTx } = await buildMoneyAccountDepositBatch({
    amount,
    chainId,
    boringVault: vaultConfig.boringVault,
    tellerAddress: vaultConfig.tellerAddress,
    accountantAddress: vaultConfig.accountantAddress,
    lensAddress: vaultConfig.lensAddress,
    provider,
  });

  return [approveTx.params, depositTx.params];
}

/**
 * Returns encoded calldata for the withdraw + transfer batch of a Money Account withdrawal.
 *
 * @param chainId - Chain ID in hex
 * @param amountHuman - Human-readable withdrawal amount (e.g. "10.5")
 * @param recipientOverride - Optional EVM address to receive the withdrawn USDC.
 * When omitted, defaults to the currently selected EVM account.
 * @returns `[withdrawTx.params, transferTx.params]`, or `[]` if vault config or provider is unavailable
 */
export async function getMoneyAccountWithdrawTransactionsData(
  chainId: Hex,
  amountHuman: string,
  recipientOverride?: Hex,
): Promise<MoneyAccountTxParams['params'][]> {
  const state = ReduxService.store.getState() as RootState;
  const vaultConfig = selectMoneyAccountVaultConfig(state);
  const primaryMoneyAccount = selectPrimaryMoneyAccount(state);
  const recipient = recipientOverride ?? selectEvmAddress(state);
  const withdrawalSlippageBps = selectMoneyAccountWithdrawalSlippageBps(state);
  if (!vaultConfig || !primaryMoneyAccount?.address) return [];

  const provider = getProviderByChainId(chainId);
  if (!provider) return [];

  const amount = BigInt(
    calcTokenValue(amountHuman, MUSD_DECIMALS)
      .decimalPlaces(0, BigNumber.ROUND_UP)
      .toFixed(0),
  );

  const { withdrawTx, transferTx } = await buildMoneyAccountWithdrawBatch({
    amount,
    chainId,
    tellerAddress: vaultConfig.tellerAddress as Hex,
    accountantAddress: vaultConfig.accountantAddress as Hex,
    moneyAccountAddress: primaryMoneyAccount.address as Hex,
    recipient: recipient as Hex,
    provider,
    withdrawalSlippageBps,
  });

  return [withdrawTx.params, transferTx.params];
}

// -- Withdrawal helpers ----------------------------------------------------

async function getVaultRate({
  accountantAddress,
  provider,
}: {
  accountantAddress: string;
  provider: ethers.providers.Provider;
}): Promise<bigint> {
  const accountant = new ethers.Contract(
    accountantAddress,
    ACCOUNTANT_ABI,
    provider,
  );
  const rate = await accountant.getRate();
  return BigInt(rate.toString());
}

const SHARE_DECIMALS_SCALAR = BigInt(1_000_000);

/**
 * Converts a USD asset amount (6 decimals) to vault shares given a pre-fetched rate.
 * Pure arithmetic — no I/O, safe to call directly inside workflows.
 *
 * Uses ceiling division so the contract's `mulDivDown(shares × rate / ONE_SHARE)`
 * always produces `assetsOut >= minimumAssets`. Floor division caused a double-
 * truncation bug where `assetsOut` could land 1 unit below `minimumAssets`,
 * reverting with `MinimumAssetsNotMet`.
 */
export function getSharesForWithdrawal(amount: bigint, rate: bigint): bigint {
  return (amount * SHARE_DECIMALS_SCALAR + rate - 1n) / rate;
}

function buildWithdrawData(
  musdAddress: string,
  shareAmount: bigint,
  minimumAssets: bigint,
  toAddress: string,
): Hex {
  const iface = new ethers.utils.Interface(TELLER_ABI);
  return iface.encodeFunctionData('withdraw', [
    musdAddress,
    shareAmount.toString(),
    minimumAssets.toString(),
    toAddress,
  ]) as Hex;
}

export type MoneyAccountWithdrawBatchResult = MoneyAccountBatchResult<
  'withdrawTx' | 'transferTx'
>;

/**
 * Builds the two-transaction withdrawal batch for a Money Account withdrawal.
 *
 * 1. Calls `getRate` on the accountant contract to get the current vault rate.
 * 2. Converts the asset amount to vault shares (ceiling division).
 * 3. Encodes `withdraw(mUSD, shareAmount, minimumAssets, moneyAccountAddress)` on the teller contract — USDC lands on the money account.
 * 4. Encodes `transfer(recipient, amount)` on the USDC contract — moves the exact requested USDC from the money account to the user's selected EVM account.
 *
 * `withdrawalSlippageBps` controls how much `minimumAssets` is reduced below
 * `amount` to absorb rate movement between encoding and on-chain execution.
 * Controlled via the `moneyAccountWithdrawalSlippageTolerance` LaunchDarkly
 * flag (default 20 bps = 0.2%). The subsequent ERC-20 transfer still uses
 * the original `amount`, so the user receives the full requested value when
 * the withdrawal succeeds — the slippage only prevents a spurious revert
 * from the teller's `MinimumAssetsNotMet` check.
 *
 * When `amount === 0n` the rate fetch is skipped: the caller is encoding a
 * placeholder batch that MM Pay will re-encode via
 * `updateMoneyAccountWithdrawTokenAmount` once the user picks an amount.
 */
export async function buildMoneyAccountWithdrawBatch({
  amount,
  chainId,
  tellerAddress,
  accountantAddress,
  moneyAccountAddress,
  recipient,
  provider,
  withdrawalSlippageBps,
}: {
  amount: bigint;
  chainId: Hex;
  tellerAddress: Hex;
  accountantAddress: Hex;
  /** Address of the money account — vault sends USDC here first. */
  moneyAccountAddress: Hex;
  /** Address of the user's selected EVM account — receives the USDC transfer. */
  recipient: Hex;
  provider: ethers.providers.Provider;
  /** Slippage tolerance in basis points for minimumAssets. */
  withdrawalSlippageBps: number;
}): Promise<MoneyAccountWithdrawBatchResult> {
  const musdAddress = getMoneyAccountDepositAssetAddress(chainId);

  const shareAmount =
    amount === BigInt(0)
      ? BigInt(0)
      : getSharesForWithdrawal(
          amount,
          await getVaultRate({ accountantAddress, provider }),
        );
  // When withdrawalSlippageBps is 0 (default), use a fixed 1-unit tolerance
  // that covers rounding from ceiling division + contract mulDivDown.
  // When non-zero, apply percentage-based slippage to also absorb vault rate
  // movement between encoding and on-chain execution.
  const minimumAssets =
    withdrawalSlippageBps > 0
      ? applyWithdrawalSlippage(amount, withdrawalSlippageBps)
      : amount > 0n
        ? amount - 1n
        : 0n;
  const withdrawData = buildWithdrawData(
    musdAddress,
    shareAmount,
    minimumAssets,
    moneyAccountAddress,
  );
  const transferData = buildErc20TransferData(recipient, amount);

  return {
    withdrawTx: {
      params: {
        to: tellerAddress,
        data: withdrawData,
        value: '0x0' as Hex,
      },
      type: TransactionType.moneyAccountWithdraw,
    },
    transferTx: {
      params: {
        to: musdAddress,
        data: transferData,
        value: '0x0' as Hex,
      },
      type: TransactionType.tokenMethodTransfer,
    },
  };
}
