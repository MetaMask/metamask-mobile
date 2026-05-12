import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { UpdateTransactionPayAmountCall } from '../../../Views/confirmations/types/transactions';
// TODO: uncomment when mUSD is deployed
// import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../Earn/constants/musd';
import { MUSD_DECIMALS } from '../../Earn/constants/musd';
import AppConstants from '../../../../core/AppConstants';
import ReduxService from '../../../../core/redux/ReduxService';
import { RootState } from '../../../../reducers';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { calcTokenValue } from '../../../../util/transactions';

const LENS_ABI = [
  'function previewDeposit(address depositAsset, uint256 depositAmount, address boringVault, address accountant) view returns (uint256 shares)',
];

const TELLER_ABI = [
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

/**
 * Applies a 0.2% slippage tolerance to a bigint value.
 * If this sanity-check causes a revert, no funds are lost — retry with a fresh quote.
 */
export function applySlippage(value: bigint): bigint {
  return (value * SLIPPAGE_NUMERATOR) / SLIPPAGE_DENOMINATOR;
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getMoneyAccountDepositAssetAddress(chainId: Hex): Hex {
  // TODO: uncomment when mUSD is deployed
  // const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[_chainId];
  // if (!musdAddress) {
  //   throw new Error(`mUSD not deployed on chain ${_chainId}`);
  // }
  // return musdAddress;
  // TODO: remove when mUSD is deployed - temporarily hardcoded USDC
  return '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
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
): Promise<UpdateTransactionPayAmountCall[]> {
  const state = ReduxService.store.getState() as RootState;
  const vaultConfig = selectMoneyAccountVaultConfig(state);
  const primaryMoneyAccount = selectPrimaryMoneyAccount(state);
  const recipient = selectEvmAddress(state);
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
  });

  return [
    { nestedTransactionIndex: 0, transactionData: withdrawTx.params.data },
    { nestedTransactionIndex: 1, transactionData: transferTx.params.data },
  ];
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
 */
export function getSharesForWithdrawal(amount: bigint, rate: bigint): bigint {
  return (amount * SHARE_DECIMALS_SCALAR) / rate;
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
 * 2. Converts the asset amount to vault shares.
 * 3. Encodes `withdraw(mUSD, shareAmount, minimumAssets, moneyAccountAddress)` on the teller contract — USDC lands on the money account.
 * 4. Encodes `transfer(recipient, amount)` on the USDC contract — moves the exact requested USDC from the money account to the user's selected EVM account.
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
}): Promise<MoneyAccountWithdrawBatchResult> {
  const musdAddress = getMoneyAccountDepositAssetAddress(chainId);

  const shareAmount =
    amount === BigInt(0)
      ? BigInt(0)
      : getSharesForWithdrawal(
          amount,
          await getVaultRate({ accountantAddress, provider }),
        );
  // No slippage on minimumAssets — the exact amount is needed for the
  // subsequent transfer. If the rate moves down between encoding and
  // execution, the batch reverts atomically and the user retries with a
  // fresh quote; we accept that over partial-fill fragility.
  const minimumAssets = amount;
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
