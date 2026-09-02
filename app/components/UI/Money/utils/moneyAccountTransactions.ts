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
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
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

/**
 * EIP-3009. The signature-bytes overload matches the 65-byte signature the
 * referral-program claim voucher carries, rather than split `v, r, s`.
 */
export const EIP_3009_ABI = [
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)',
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
    data?: Hex;
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
> &
  Partial<MoneyAccountBatchResult<'authorizationTx'>>;

/**
 * An EIP-3009 authorization that funds the money account inside the same batch
 * as the deposit. Supplied by the referral-program claim voucher.
 */
export interface MoneyAccountDepositAuthorization {
  /** Treasury address the mUSD is drawn from. */
  from: Hex;
  /** The money account receiving the mUSD. Must equal the batch's `from`. */
  to: Hex;
  /** mUSD base units as a decimal string. */
  value: string;
  /** Unix seconds. */
  validAfter: number;
  /** Unix seconds. The voucher window is one minute. */
  validBefore: number;
  /** hex bytes32 */
  nonce: Hex;
  /** hex bytes65 */
  signature: Hex;
}

/**
 * The batch legs in submission order. Callers derive positional indices from
 * this rather than hard-coding `0` and `1`, which silently shift the moment an
 * authorization leg is prepended.
 */
export type MoneyAccountDepositBatchKey =
  | 'authorizationTx'
  | 'approveTx'
  | 'depositTx';

const DEPOSIT_BATCH_ORDER: readonly MoneyAccountDepositBatchKey[] = [
  'authorizationTx',
  'approveTx',
  'depositTx',
];

/**
 * Flattens a deposit batch result into submission order, skipping legs that
 * were not built.
 *
 * @param result - The batch as returned by `buildMoneyAccountDepositBatch`.
 * @returns The present legs, in the order they are submitted.
 */
export function getMoneyAccountDepositCalls(
  result: MoneyAccountDepositBatchResult,
): { key: MoneyAccountDepositBatchKey; tx: MoneyAccountTxParams }[] {
  return DEPOSIT_BATCH_ORDER.flatMap((key) => {
    const tx = result[key];
    return tx ? [{ key, tx }] : [];
  });
}

/**
 * Index of a named leg within a built batch, or `-1` when it is absent.
 *
 * @param result - The batch as returned by `buildMoneyAccountDepositBatch`.
 * @param key - The leg to locate.
 * @returns The nested-call index.
 */
export function getMoneyAccountDepositCallIndex(
  result: MoneyAccountDepositBatchResult,
  key: MoneyAccountDepositBatchKey,
): number {
  return getMoneyAccountDepositCalls(result).findIndex(
    (call) => call.key === key,
  );
}

function buildReceiveWithAuthorizationData(
  authorization: MoneyAccountDepositAuthorization,
): Hex {
  const iface = new ethers.utils.Interface(EIP_3009_ABI);
  return iface.encodeFunctionData('receiveWithAuthorization', [
    authorization.from,
    authorization.to,
    authorization.value,
    authorization.validAfter,
    authorization.validBefore,
    authorization.nonce,
    authorization.signature,
  ]) as Hex;
}

/**
 * Builds the approve + deposit transaction pair for a Money Account deposit,
 * optionally prefixed by an EIP-3009 authorization that funds the account.
 *
 * 1. When `authorization` is given, encodes `receiveWithAuthorization(...)` on the mUSD token so the batch is self-funding.
 * 2. Calls `previewDeposit` on the lens contract to get expected vault shares.
 * 3. Applies a 0.2% slippage tolerance to derive `minimumMint`.
 * 4. Encodes ERC-20 `approve(boringVault, amount)` on the mUSD token.
 * 5. Encodes `deposit(mUSD, amount, minimumMint, 0x0)` on the teller contract.
 *
 * The ordinary deposit flow passes no `authorization` and still gets exactly
 * two legs, so its calldata and gas profile are unchanged.
 */
export async function buildMoneyAccountDepositBatch({
  amount,
  chainId,
  boringVault,
  tellerAddress,
  accountantAddress,
  lensAddress,
  provider,
  initialiseWithoutData = false,
  authorization,
}: {
  amount: bigint;
  chainId: Hex;
  boringVault: string;
  tellerAddress: string;
  accountantAddress: string;
  lensAddress: string;
  provider: ethers.providers.Provider;
  initialiseWithoutData?: boolean;
  authorization?: MoneyAccountDepositAuthorization;
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

  const approveData = initialiseWithoutData
    ? undefined
    : buildApproveData(boringVault, amount);
  const depositData = initialiseWithoutData
    ? undefined
    : buildDepositData(musdAddress, amount, minimumMint);

  const authorizationTx =
    authorization && !initialiseWithoutData
      ? {
          params: {
            to: musdAddress,
            data: buildReceiveWithAuthorizationData(authorization),
            value: '0x0' as Hex,
          },
          type: TransactionType.contractInteraction,
        }
      : undefined;

  return {
    ...(authorizationTx ? { authorizationTx } : {}),
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

  // ROUND_DOWN so Max / near-Max from an 18-decimal pay token never encodes
  // more mUSD than the source balance can fund (ROUND_UP was pushing past it).
  const amount = BigInt(
    calcTokenValue(amountHuman, MUSD_DECIMALS)
      .decimalPlaces(0, BigNumber.ROUND_DOWN)
      .toFixed(0),
  );

  const batch = await buildMoneyAccountDepositBatch({
    amount,
    chainId: chainIdHex,
    boringVault: vaultConfig.boringVault,
    tellerAddress: vaultConfig.tellerAddress,
    accountantAddress: vaultConfig.accountantAddress,
    lensAddress: vaultConfig.lensAddress,
    provider,
  });

  const approveData = batch.approveTx.params.data;
  const depositData = batch.depositTx.params.data;
  if (!approveData || !depositData) return [];

  // Indices come from the built batch rather than literals: an authorization
  // leg shifts approve and deposit by one.
  return [
    {
      nestedTransactionIndex: getMoneyAccountDepositCallIndex(
        batch,
        'approveTx',
      ),
      transactionData: approveData,
    },
    {
      nestedTransactionIndex: getMoneyAccountDepositCallIndex(
        batch,
        'depositTx',
      ),
      transactionData: depositData,
    },
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

  const withdrawData = withdrawTx.params.data;
  const transferData = transferTx.params.data;
  if (!withdrawData || !transferData) return [];

  return [
    { nestedTransactionIndex: 0, transactionData: withdrawData },
    { nestedTransactionIndex: 1, transactionData: transferData },
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

  const batch = await buildMoneyAccountDepositBatch({
    amount,
    chainId,
    boringVault: vaultConfig.boringVault,
    tellerAddress: vaultConfig.tellerAddress,
    accountantAddress: vaultConfig.accountantAddress,
    lensAddress: vaultConfig.lensAddress,
    provider,
  });

  return getMoneyAccountDepositCalls(batch).map(({ tx }) => tx.params);
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
  // Allow 1-unit slippage on minimumAssets as defense-in-depth against
  // rounding: the contract's mulDivDown can truncate assetsOut by up to
  // 1 unit relative to the requested amount. This tolerance is safe
  // because ceiling division in getSharesForWithdrawal already guarantees
  // assetsOut >= amount; the 1-unit slack here is a second line of
  // defense, not a standalone fix. The subsequent ERC-20 transfer uses
  // the original `amount`, so the tolerance does not affect how much the
  // user receives — it only prevents a spurious revert from the teller's
  // MinimumAssetsNotMet check.
  const minimumAssets = amount > 0n ? amount - 1n : 0n;
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
