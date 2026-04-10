import { ethers } from 'ethers';
import { TransactionType } from '@metamask/transaction-controller';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../Earn/constants/musd';
import AppConstants from '../../../../core/AppConstants';

const LENS_ABI = [
  'function previewDeposit(address depositAsset, uint256 depositAmount, address boringVault, address accountant) view returns (uint256 shares)',
];

const TELLER_ABI = [
  'function deposit(address depositAsset, uint256 depositAmount, uint256 minimumMint, address referralAddress) payable returns (uint256 shares)',
  'function withdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to) returns (uint256 assetsOut)',
];

const ACCOUNTANT_ABI = ['function getRate() view returns (uint256 rate)'];

const ERC20_ABI = ['function approve(address spender, uint256 amount)'];

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

/**
 * Applies a 0.1% slippage tolerance to the expected deposit shares.
 * If this sanity-check causes a revert, no funds are lost — retry with a fresh quote.
 */
function calculateMinimumMint(expectedShares: bigint): bigint {
  return (expectedShares * BigInt(999)) / BigInt(1000);
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

export interface MoneyAccountDepositBatchResult {
  approveTx: MoneyAccountTxParams;
  depositTx: MoneyAccountTxParams;
}

/**
 * Builds the approve + deposit transaction pair for a Money Account deposit.
 *
 * 1. Calls `previewDeposit` on the lens contract to get expected vault shares.
 * 2. Applies a 0.1% slippage tolerance to derive `minimumMint`.
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
  // TODO: uncomment when mUSD is deployed
  // const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId];
  // if (!musdAddress) {
  //   throw new Error(`mUSD not deployed on chain ${chainId}`);
  // }
  // TODO: remove when mUSD is deployed - temporarily hardcoded USDC
  const musdAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

  const expectedShares = await getExpectedDepositShares({
    lensAddress,
    boringVault,
    accountantAddress,
    musdAddress,
    amount,
    provider,
  });

  const minimumMint = calculateMinimumMint(expectedShares);
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

/**
 * Applies a 0.1% slippage tolerance to the asset amount.
 * If this sanity-check causes a revert, no funds are lost — retry with a fresh quote.
 */
function calculateMinimumAssets(amount: bigint): bigint {
  return (amount * BigInt(999)) / BigInt(1000);
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
 * 3. Applies a 0.1% slippage tolerance to derive `minimumAssets`.
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
  const minimumAssets = calculateMinimumAssets(amount);
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
