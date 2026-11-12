import type {
  VaultShareValuation,
  VaultShareValuationsResponse,
} from '@metamask/money-account-api-data-service';
import type { Hex } from '@metamask/utils';
import type { AccountsApiActivity } from '../types/moneyActivity';
import type { VaultShareToken } from '../utils/accountsApi';

export const MONEY_ACCOUNT_ADDRESS =
  '0xAbCdEf0123456789012345678901234567890123' as const;
export const STANDARD_VAULT =
  '0x1111111111111111111111111111111111111111' as const;
export const PREMIUM_VAULT =
  '0x2222222222222222222222222222222222222222' as const;
export const UNRELATED_VAULT =
  '0x3333333333333333333333333333333333333333' as const;
export const CARD_TX_HASH =
  '0x8b6975a5d81b44bbe4487b5e5237e25be7ffc71e38d48146e8a501299fddc9f1' as const;
export const CASHBACK_TX_HASH =
  '0x69271794b692b7bd6e0f89c60a566421f9cd5584779885eeb3c542cfb93cdf79' as const;
export const OTHER_TX_HASH =
  '0x6c6975a5d81b44bbe4487b5e5237e25be7ffc71e38d48146e8a501299fddc9f2' as const;
export const CARD_BLOCK_NUMBER = 108974623;

export const VAULT_SHARE_TOKENS: VaultShareToken[] = [
  { chainId: '0x8f', address: STANDARD_VAULT },
  { chainId: '0x8f', address: PREMIUM_VAULT },
];

export function cardActivity(
  overrides: Partial<Extract<AccountsApiActivity, { kind: 'card' }>> = {},
): Extract<AccountsApiActivity, { kind: 'card' }> {
  return {
    kind: 'card',
    hash: CARD_TX_HASH,
    time: 1_700_000_000_000,
    chainId: '0x8f',
    blockNumber: CARD_BLOCK_NUMBER,
    token: { address: STANDARD_VAULT, symbol: 'vmUSD', decimals: 6 },
    amount: '951755696',
    paidTo: '0x4444444444444444444444444444444444444444',
    ...overrides,
  };
}

export function valuation(
  overrides: Partial<VaultShareValuation> = {},
): VaultShareValuation {
  return {
    vault_address: STANDARD_VAULT,
    vault_key: 'standard',
    asset_symbol: 'mUSD',
    asset_decimals: 6,
    type: 'transfer_out',
    log_index: 156,
    block_number: CARD_BLOCK_NUMBER,
    timestamp: '2026-09-29T07:17:22Z',
    shares_wei: '951755696',
    assets_wei: '968399999',
    rate: '1.017488',
    source: 'erc20_transfer',
    ...overrides,
  };
}

export interface VaultShareValuationInput {
  hash: string;
  vaultAddress?: string;
  blockNumber: number;
  sharesWei: string;
  assetsWei: string;
  type: 'transfer_in' | 'transfer_out';
  logIndex?: number;
}

export function cardValuation(
  assetsWei = '968399999',
  vaultAddress: string = STANDARD_VAULT,
): VaultShareValuationInput {
  return {
    hash: CARD_TX_HASH,
    vaultAddress,
    blockNumber: CARD_BLOCK_NUMBER,
    sharesWei: '951755696',
    assetsWei,
    type: 'transfer_out',
  };
}

export function vaultShareValuationResponse(
  valuations: readonly VaultShareValuationInput[],
  account: string = MONEY_ACCOUNT_ADDRESS,
): VaultShareValuationsResponse {
  return {
    address: account.toLowerCase(),
    chain_id: 143,
    results: valuations.map((item) => ({
      tx_hash: item.hash.toLowerCase(),
      found: true,
      valuations: [
        valuation({
          vault_address: item.vaultAddress ?? STANDARD_VAULT,
          log_index: item.logIndex ?? 1,
          block_number: item.blockNumber,
          shares_wei: item.sharesWei,
          assets_wei: item.assetsWei,
          type: item.type,
        }),
      ],
    })),
    as_of_block: 121037906,
    as_of_timestamp: '2026-11-10T14:32:32Z',
    data_freshness: 'live',
    indexer_lag_seconds: 21,
  };
}

export function valuationResponseForActivities(
  activities: readonly AccountsApiActivity[],
  assetsWei = '968399999',
): VaultShareValuationsResponse {
  return vaultShareValuationResponse(
    activities.map((item) => ({
      hash: item.hash,
      vaultAddress: item.token.address,
      blockNumber: item.blockNumber ?? 0,
      sharesWei: item.amount,
      assetsWei,
      type: item.kind === 'cashback' ? 'transfer_in' : 'transfer_out',
    })),
  );
}

export function hashAt(index: number): Hex {
  return `0x${index.toString(16).padStart(64, '0')}`;
}
