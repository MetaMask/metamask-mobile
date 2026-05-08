import { ethers } from 'ethers';
import { BigNumber } from 'bignumber.js';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import { UpdateTransactionPayAmountCall } from '../../../Views/confirmations/types/transactions';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../Earn/constants/musd';
import AppConstants from '../../../../core/AppConstants';
import { calcTokenValue } from '../../../../util/transactions';
import { getProviderByChainId } from '../../../../util/notifications/methods/common';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import ReduxService from '../../../../core/redux';
import type { RootState } from '../../../../reducers';

const LENS_ABI = [
  'function previewDeposit(address depositAsset, uint256 depositAmount, address boringVault, address accountant) view returns (uint256 shares)',
];

const TELLER_ABI = [
  'function deposit(address depositAsset, uint256 depositAmount, uint256 minimumMint, address referralAddress) payable returns (uint256 shares)',
  'function withdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to) returns (uint256 assetsOut)',
];

const ACCOUNTANT_ABI = ['function getRate() view returns (uint256 rate)'];

const ERC20_ABI = ['function approve(address spender, uint256 amount)'];

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

export interface MoneyAccountDepositBatchResult {
  approveTx: MoneyAccountTxParams;
  depositTx: MoneyAccountTxParams;
}

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

/** Decimals for USDC (the deposit asset). */
const USDC_DECIMALS = 6;

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
    calcTokenValue(amountHuman, USDC_DECIMALS)
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
 * Stub implementation — real encoding will replace this once the withdraw
 * re-encoding logic is wired in.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateMoneyAccountWithdrawTokenAmount(
  _transactionMeta: TransactionMeta,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _amountHuman: string,
): Promise<UpdateTransactionPayAmountCall[]> {
  return [];
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

export interface MoneyAccountWithdrawResult {
  params: { to: Hex; data: Hex; value: Hex };
  options: {
    origin: typeof ORIGIN_METAMASK;
    requireApproval: boolean;
    type: TransactionType;
  };
}

/**
 * Builds the single withdrawal transaction for a Money Account withdrawal.
 *
 * 1. Calls `getRate` on the accountant contract to get the current vault rate.
 * 2. Converts the asset amount to vault shares.
 * 3. Applies a 0.2% slippage tolerance to derive `minimumAssets`.
 * 4. Encodes `withdraw(mUSD, shareAmount, minimumAssets, to)` on the teller contract.
 */
export async function buildMoneyAccountWithdraw({
  amount,
  chainId,
  tellerAddress,
  accountantAddress,
  toAddress,
  provider,
}: {
  amount: bigint;
  chainId: Hex;
  tellerAddress: string;
  accountantAddress: string;
  toAddress: string;
  provider: ethers.providers.Provider;
}): Promise<MoneyAccountWithdrawResult> {
  const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId];
  if (!musdAddress) {
    throw new Error(`mUSD not deployed on chain ${chainId}`);
  }

  const rate = await getVaultRate({ accountantAddress, provider });
  const shareAmount = getSharesForWithdrawal(amount, rate);
  const minimumAssets = applySlippage(amount);
  const withdrawData = buildWithdrawData(
    musdAddress,
    shareAmount,
    minimumAssets,
    toAddress,
  );

  return {
    params: {
      to: tellerAddress as Hex,
      data: withdrawData,
      value: '0x0' as Hex,
    },
    options: {
      origin: ORIGIN_METAMASK,
      requireApproval: true,
      type: TransactionType.moneyAccountWithdraw,
    },
  };
}
