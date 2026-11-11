import BigNumber from 'bignumber.js';
import type {
  VaultShareValuation,
  VaultShareValuationsResponse,
} from '@metamask/money-account-api-data-service';
import type { Hex } from '@metamask/utils';
import { areAddressesEqual } from '../../../../util/address';
import { MUSD_DECIMALS } from '../../Earn/constants/musd';
import type {
  AccountsApiActivity,
  AccountsApiDisplayAmount,
} from '../types/moneyActivity';
import type { VaultShareToken } from './accountsApi';

const AMOUNT_PATTERN = /^\d+$/u;
const TX_HASH_PATTERN = /^0x[0-9a-f]{64}$/iu;

export interface CachedVaultShareValuation {
  type: 'transfer_in' | 'transfer_out';
  logIndex?: number;
  blockNumber: number;
  sharesWei: string;
  assetsWei: string;
  assetDecimals: number;
}

export interface VaultShareValuationCacheKey {
  account: string;
  chainId: number;
  vaultAddress: string;
  txHash: string;
}

export interface VaultShareValuationCacheEntry
  extends VaultShareValuationCacheKey {
  valuations: CachedVaultShareValuation[];
}

export function getVaultShareValuationCacheIdentity(
  key: VaultShareValuationCacheKey,
): string {
  return [
    key.account.toLowerCase(),
    key.chainId,
    key.vaultAddress.toLowerCase(),
    key.txHash.toLowerCase(),
  ].join(':');
}

export function isVaultShareCardActivity(
  activity: AccountsApiActivity,
  vaultShareTokens: readonly VaultShareToken[],
): activity is Extract<AccountsApiActivity, { kind: 'card' | 'cashback' }> {
  if (
    (activity.kind !== 'card' && activity.kind !== 'cashback') ||
    activity.blockNumber === undefined
  ) {
    return false;
  }

  return vaultShareTokens.some(
    (token) =>
      token.chainId.toLowerCase() === activity.chainId.toLowerCase() &&
      areAddressesEqual(token.address, activity.token.address),
  );
}

export function toCachedVaultShareValuation(
  valuation: VaultShareValuation,
): CachedVaultShareValuation | undefined {
  if (
    valuation.asset_symbol !== 'mUSD' ||
    (valuation.type !== 'transfer_in' && valuation.type !== 'transfer_out') ||
    !Number.isInteger(valuation.block_number) ||
    valuation.block_number < 0 ||
    !Number.isInteger(valuation.asset_decimals) ||
    valuation.asset_decimals < 0 ||
    !AMOUNT_PATTERN.test(valuation.shares_wei) ||
    !AMOUNT_PATTERN.test(valuation.assets_wei)
  ) {
    return undefined;
  }

  const logIndex =
    Number.isInteger(valuation.log_index) && valuation.log_index >= 0
      ? valuation.log_index
      : undefined;

  return {
    type: valuation.type,
    ...(logIndex === undefined ? {} : { logIndex }),
    blockNumber: valuation.block_number,
    sharesWei: valuation.shares_wei,
    assetsWei: valuation.assets_wei,
    assetDecimals: valuation.asset_decimals,
  };
}

export function cacheEntriesFromResponse({
  response,
  account,
  chainId,
  vaultAddresses,
}: {
  response: VaultShareValuationsResponse;
  account: string;
  chainId: Hex;
  vaultAddresses: readonly Hex[];
}): VaultShareValuationCacheEntry[] {
  const numericChainId = Number.parseInt(chainId, 16);
  if (response.chain_id !== numericChainId) {
    return [];
  }

  const entries = new Map<string, VaultShareValuationCacheEntry>();

  for (const result of response.results) {
    if (!result.found || !TX_HASH_PATTERN.test(result.tx_hash)) {
      continue;
    }

    for (const valuation of result.valuations) {
      const cached = toCachedVaultShareValuation(valuation);
      const vaultAddress = vaultAddresses.find((address) =>
        areAddressesEqual(address, valuation.vault_address),
      );
      if (!cached || !vaultAddress) {
        continue;
      }

      const key: VaultShareValuationCacheKey = {
        account: account.toLowerCase(),
        chainId: numericChainId,
        vaultAddress: vaultAddress.toLowerCase(),
        txHash: result.tx_hash.toLowerCase(),
      };
      const identity = getVaultShareValuationCacheIdentity(key);
      const entry = entries.get(identity) ?? { ...key, valuations: [] };
      entry.valuations.push(cached);
      entries.set(identity, entry);
    }
  }

  return [...entries.values()];
}

export function getHistoricalVaultShareDisplayAmount(
  activity: AccountsApiActivity,
  cachedValuations: readonly CachedVaultShareValuation[] | undefined,
): AccountsApiDisplayAmount | undefined {
  if (
    !cachedValuations ||
    (activity.kind !== 'card' && activity.kind !== 'cashback') ||
    activity.blockNumber === undefined
  ) {
    return undefined;
  }

  const expectedType =
    activity.kind === 'card' ? 'transfer_out' : 'transfer_in';
  const matches = cachedValuations.filter(
    (valuation) =>
      valuation.type === expectedType &&
      valuation.blockNumber === activity.blockNumber &&
      valuation.sharesWei === activity.amount &&
      Number.isInteger(valuation.assetDecimals) &&
      valuation.assetDecimals >= 0,
  );

  if (matches.length !== 1) {
    return undefined;
  }

  return {
    type: 'historical' as const,
    value: matches[0].assetsWei,
    decimals: matches[0].assetDecimals,
  };
}

export function getApproximateVaultShareDisplayAmount(
  activity: AccountsApiActivity,
  rate: string | undefined,
): AccountsApiDisplayAmount {
  if (!rate) {
    return { type: 'unavailable' as const };
  }

  const shares = new BigNumber(activity.amount);
  const currentRate = new BigNumber(rate);
  if (
    !shares.isFinite() ||
    !shares.isInteger() ||
    !shares.isGreaterThanOrEqualTo(0) ||
    !currentRate.isFinite() ||
    !currentRate.isGreaterThanOrEqualTo(0)
  ) {
    return { type: 'unavailable' as const };
  }

  const value = shares
    .shiftedBy(-activity.token.decimals)
    .times(currentRate)
    .shiftedBy(MUSD_DECIMALS)
    .integerValue(BigNumber.ROUND_FLOOR)
    .toFixed(0);

  return {
    type: 'approximate' as const,
    value,
    decimals: MUSD_DECIMALS,
  };
}
