import { TransactionMeta } from '@metamask/transaction-controller';
import {
  LIGHTER_BRIDGE_CONFIG,
  getLighterHttpEndpoint,
} from '@metamask/perps-controller/constants/lighterConfig';
import { Hex, encodeFunctionData, isAddress, parseAbi, toHex } from 'viem';
import { BigNumber } from 'bignumber.js';

import { UpdateTransactionPayAmountCall } from '../types/transactions';

/**
 * Temporary. Perps should own the Lighter deposit call data and the account
 * lookup (likely in `PerpsController`). Move this out of confirmations once
 * the perps package exports it, and delete this file.
 */

/** Ethereum mainnet USDC uses 6 decimals. */
export const LIGHTER_USDC_DECIMALS = 6;

/**
 * USDC asset id on the Lighter L1 `deposit` call. `assetDetails` reports USDC
 * as 3 and ETH as 1. Do not use the perps package's `LIGHTER_USDC_ASSET_INDEX`
 * (1) here: it is the L2 withdraw index, and an L1 deposit for asset 1 is an
 * ETH deposit that reverts with `AdditionalZkLighter_InvalidDepositAmount`.
 */
export const LIGHTER_USDC_DEPOSIT_ASSET_INDEX = 3;

/** Perps balance on the Lighter `deposit` call. Spot is 1. */
export const LIGHTER_PERPS_ROUTE_TYPE = 0;

/**
 * Lighter returns this application code when the L1 address has no account.
 * The HTTP status is 400.
 */
const LIGHTER_ACCOUNT_NOT_FOUND_CODE = 21100;

const LIGHTER_DEPOSIT_SELECTOR = '0x8a857083';

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount)',
]);

const LIGHTER_DEPOSIT_ABI = parseAbi([
  'function deposit(address _to, uint16 _assetIndex, uint8 _routeType, uint256 _amount)',
]);

export interface LighterUsdcDepositTransaction {
  approve: { to: Hex; data: Hex; value: '0x0' };
  deposit: { to: Hex; data: Hex; value: '0x0' };
  requiredAsset: { address: Hex; amount: Hex; standard: 'erc20' };
}

interface LighterAccountsByL1AddressBody {
  code?: number;
  message?: string;
  subAccounts?: unknown[];
}

const SUB_ACCOUNTS_FIELD = 'sub_accounts';

/**
 * Temporary. Remove this once the perps package exports an account lookup
 * for an L1 address. `LighterClientService.getAccountsByL1Address` does this
 * lookup, and it is not part of the public perps API yet.
 *
 * True when `l1Address` already owns a Lighter account.
 * `accountsByL1Address` answers HTTP 400 / code 21100 when the address has
 * never been credited. Any other failure is thrown so the caller does not
 * treat an outage as "no account".
 *
 * @param l1Address - EVM address of the logged-in user.
 * @returns Whether Lighter already has an account for that address.
 */
export async function userHasLighterAccount(
  l1Address: string,
): Promise<boolean> {
  const url = `${getLighterHttpEndpoint('mainnet')}/api/v1/accountsByL1Address?l1_address=${l1Address}`;
  const response = await fetch(url);
  const body = (await response.json()) as LighterAccountsByL1AddressBody;

  if (body.code === LIGHTER_ACCOUNT_NOT_FOUND_CODE) {
    return false;
  }

  if (!response.ok || body.code !== 200) {
    throw new Error(
      body.message ?? `Lighter account lookup failed (${response.status})`,
    );
  }

  const rawAccounts = (
    body as LighterAccountsByL1AddressBody & Record<string, unknown>
  )[SUB_ACCOUNTS_FIELD];
  const accounts =
    body.subAccounts ?? (Array.isArray(rawAccounts) ? rawAccounts : []);
  return accounts.length > 0;
}

/**
 * Approve plus `deposit` for mainnet USDC into the logged-in user's Lighter
 * perps balance. The first credited deposit creates the account.
 *
 * Relay acquires mainnet USDC (the required asset) and executes this data.
 *
 * @param userAddress - L1 address credited by the deposit.
 * @param amount - USDC amount in base units (6 decimals).
 * @returns The approve call, the deposit call, and the required USDC asset.
 */
export function buildLighterUsdcDepositTransaction(
  userAddress: Hex,
  amount: bigint,
): LighterUsdcDepositTransaction {
  const { bridgeContract, usdcContract } = LIGHTER_BRIDGE_CONFIG.mainnet;
  const lighter = bridgeContract as Hex;
  const usdc = usdcContract as Hex;

  const approveData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [lighter, amount],
  });
  const depositData = encodeFunctionData({
    abi: LIGHTER_DEPOSIT_ABI,
    functionName: 'deposit',
    args: [
      userAddress,
      LIGHTER_USDC_DEPOSIT_ASSET_INDEX,
      LIGHTER_PERPS_ROUTE_TYPE,
      amount,
    ],
  });

  return {
    approve: { to: usdc, data: approveData, value: '0x0' },
    deposit: { to: lighter, data: depositData, value: '0x0' },
    requiredAsset: {
      address: usdc,
      amount: toHex(amount),
      standard: 'erc20',
    },
  };
}

/**
 * Re-encodes the Lighter approve and deposit when the user changes the amount.
 *
 * Returns undefined when this confirmation is not a Lighter USDC deposit, so
 * the generic token-transfer updater can run instead. Returns no calls for a
 * deposit into an existing account, which has no calldata.
 *
 * @param transactionMeta - Confirmation being updated.
 * @param amountHuman - Human-readable USDC amount.
 * @returns Nested calldata updates, or undefined when this is not a Lighter deposit.
 */
export function getLighterUsdcDepositAmountCalls(
  transactionMeta: TransactionMeta,
  amountHuman: string,
): UpdateTransactionPayAmountCall[] | undefined {
  const nestedTransactions = transactionMeta.nestedTransactions;

  // A deposit into an existing account has no calldata. Only the required
  // asset amount changes, which the caller commits.
  if (
    !nestedTransactions?.length &&
    (!transactionMeta.txParams?.data || transactionMeta.txParams.data === '0x')
  ) {
    return [];
  }

  const depositIndex = nestedTransactions?.findIndex((transaction) =>
    transaction.data?.toLowerCase().startsWith(LIGHTER_DEPOSIT_SELECTOR),
  );

  if (depositIndex === undefined || depositIndex < 0) {
    return undefined;
  }

  const userAddress = transactionMeta.txParams?.from;
  if (!userAddress || !isAddress(userAddress)) {
    return undefined;
  }

  const amount = new BigNumber(amountHuman)
    .shiftedBy(LIGHTER_USDC_DECIMALS)
    .decimalPlaces(0, BigNumber.ROUND_DOWN);

  if (!amount.isFinite() || amount.isNegative()) {
    return [];
  }

  const built = buildLighterUsdcDepositTransaction(
    userAddress,
    BigInt(amount.toFixed(0)),
  );
  const calls: UpdateTransactionPayAmountCall[] = [
    {
      nestedTransactionIndex: depositIndex,
      transactionData: built.deposit.data,
    },
  ];

  const approveIndex = nestedTransactions?.findIndex(
    (transaction) =>
      transaction.to?.toLowerCase() === built.approve.to.toLowerCase(),
  );

  if (approveIndex !== undefined && approveIndex >= 0) {
    calls.unshift({
      nestedTransactionIndex: approveIndex,
      transactionData: built.approve.data,
    });
  }

  return calls;
}
