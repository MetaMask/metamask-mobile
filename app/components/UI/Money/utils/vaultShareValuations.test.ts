import type { VaultShareValuation } from '@metamask/money-account-api-data-service';
import type { AccountsApiActivity } from '../types/moneyActivity';
import type { VaultShareToken } from './accountsApi';
import {
  cacheEntriesFromResponse,
  getApproximateVaultShareDisplayAmount,
  getHistoricalVaultShareDisplayAmount,
  getVaultShareValuationCacheIdentity,
  getVaultShareValuationTarget,
  toCachedVaultShareValuation,
} from './vaultShareValuations';

const ACCOUNT = '0xAbCdEf0123456789012345678901234567890123';
const STANDARD_VAULT = '0x1111111111111111111111111111111111111111' as const;
const PREMIUM_VAULT = '0x2222222222222222222222222222222222222222' as const;
const UNRELATED_VAULT = '0x3333333333333333333333333333333333333333' as const;
const TX_HASH =
  '0x8b6975a5d81b44bbe4487b5e5237e25be7ffc71e38d48146e8a501299fddc9f1' as const;

const vaultTokens: VaultShareToken[] = [
  { chainId: '0x8f', address: STANDARD_VAULT },
  { chainId: '0x8f', address: PREMIUM_VAULT },
];

function cardActivity(
  overrides: Partial<Extract<AccountsApiActivity, { kind: 'card' }>> = {},
): AccountsApiActivity {
  return {
    kind: 'card',
    hash: TX_HASH,
    time: 1_700_000_000_000,
    chainId: '0x8f',
    blockNumber: 108974623,
    token: { address: STANDARD_VAULT, symbol: 'vmUSD', decimals: 6 },
    amount: '951755696',
    paidTo: '0x4444444444444444444444444444444444444444',
    ...overrides,
  };
}

function valuation(
  overrides: Partial<VaultShareValuation> = {},
): VaultShareValuation {
  return {
    vault_address: STANDARD_VAULT,
    vault_key: 'standard',
    asset_symbol: 'mUSD',
    asset_decimals: 6,
    type: 'transfer_out',
    log_index: 156,
    block_number: 108974623,
    timestamp: '2026-09-29T07:17:22Z',
    shares_wei: '951755696',
    assets_wei: '968399999',
    rate: '1.017488',
    source: 'erc20_transfer',
    ...overrides,
  };
}

describe('vaultShareValuations', () => {
  describe('getVaultShareValuationTarget', () => {
    const target = (activity: AccountsApiActivity) =>
      getVaultShareValuationTarget({
        activity,
        moneyAddress: ACCOUNT,
        vaultShareTokens: vaultTokens,
      });

    it('matches card and cashback rows from either configured vault', () => {
      expect(target(cardActivity())).toBeDefined();
      expect(
        target(
          cardActivity({
            token: {
              address: PREMIUM_VAULT,
              symbol: 'pvmUSD',
              decimals: 6,
            },
          }),
        ),
      ).toBeDefined();
    });

    it('keeps a missing block number on the valuation path for fallback display', () => {
      expect(target(cardActivity({ blockNumber: undefined }))).toEqual(
        expect.objectContaining({ activity: expect.any(Object) }),
      );
    });

    it.each([
      [
        'wrong chain',
        {
          token: { address: STANDARD_VAULT, symbol: 'vmUSD', decimals: 6 },
          chainId: '0x1' as const,
        },
      ],
      [
        'unconfigured vault',
        { token: { address: UNRELATED_VAULT, symbol: 'vmUSD', decimals: 6 } },
      ],
    ])('rejects %s rows', (_label, override) => {
      expect(target(cardActivity(override))).toBeUndefined();
    });

    it('rejects refund and bank transfer rows', () => {
      const base = {
        hash: TX_HASH,
        time: 1_700_000_000_000,
        chainId: '0x8f',
        blockNumber: 1,
        token: { address: STANDARD_VAULT, symbol: 'vmUSD', decimals: 6 },
        amount: '1',
      } as const;
      const refund: AccountsApiActivity = {
        ...base,
        kind: 'refund',
        receivedFrom: '0x4444444444444444444444444444444444444444',
      };
      const bankTransfer: AccountsApiActivity = {
        ...base,
        kind: 'bank_transfer',
        receivedFrom: '0x4444444444444444444444444444444444444444',
        status: 'confirmed',
      };

      expect(target(refund)).toBeUndefined();
      expect(target(bankTransfer)).toBeUndefined();
    });
  });

  describe('toCachedVaultShareValuation', () => {
    it('keeps matching fields and drops unneeded API fields', () => {
      expect(toCachedVaultShareValuation(valuation())).toEqual({
        type: 'transfer_out',
        logIndex: 156,
        blockNumber: 108974623,
        sharesWei: '951755696',
        assetsWei: '968399999',
        assetDecimals: 6,
      });
    });

    it.each([
      ['a non-mUSD value', { asset_symbol: 'vmUSD' }],
      ['a deposit', { type: 'deposit' as const }],
      ['a missing block', { block_number: null }],
      ['negative decimals', { asset_decimals: -1 }],
      ['a non-integer share amount', { shares_wei: '1.5' }],
      ['a non-integer asset amount', { assets_wei: '' }],
    ])('rejects %s', (_label, override) => {
      expect(
        toCachedVaultShareValuation(
          valuation(override as Partial<VaultShareValuation>),
        ),
      ).toBeUndefined();
    });
  });

  describe('cacheEntriesFromResponse', () => {
    it('groups transfer valuations by account, chain, vault and transaction', () => {
      const response = {
        address: ACCOUNT.toLowerCase(),
        chain_id: 143,
        results: [
          {
            tx_hash: TX_HASH.toUpperCase(),
            found: true,
            valuations: [
              valuation(),
              valuation({ log_index: 157, type: 'transfer_in' }),
              valuation({ vault_address: PREMIUM_VAULT, vault_key: 'premium' }),
              valuation({ vault_address: UNRELATED_VAULT }),
              valuation({ type: 'deposit' }),
            ],
          },
        ],
        as_of_block: 1,
        as_of_timestamp: '2026-11-10T12:34:56Z',
        data_freshness: 'live' as const,
        indexer_lag_seconds: 4,
      };

      const result = cacheEntriesFromResponse({
        response,
        account: ACCOUNT,
        chainId: '0x8f',
        vaultAddresses: [STANDARD_VAULT, PREMIUM_VAULT],
      });

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            account: ACCOUNT.toLowerCase(),
            chainId: 143,
            vaultAddress: STANDARD_VAULT,
            txHash: TX_HASH,
            valuations: [
              expect.objectContaining({ logIndex: 156 }),
              expect.objectContaining({ logIndex: 157 }),
            ],
          }),
          expect.objectContaining({
            vaultAddress: PREMIUM_VAULT,
            valuations: [expect.objectContaining({ logIndex: 156 })],
          }),
        ]),
      );
    });

    it('drops missing results, mismatched chains and malformed hashes', () => {
      const response = {
        address: ACCOUNT.toLowerCase(),
        chain_id: 143,
        results: [
          { tx_hash: TX_HASH, found: false, valuations: [valuation()] },
          { tx_hash: 'bad-hash', found: true, valuations: [valuation()] },
        ],
        as_of_block: 1,
        as_of_timestamp: '2026-11-10T12:34:56Z',
        data_freshness: 'live' as const,
        indexer_lag_seconds: 4,
      };

      expect(
        cacheEntriesFromResponse({
          response,
          account: ACCOUNT,
          chainId: '0x1',
          vaultAddresses: [STANDARD_VAULT],
        }),
      ).toEqual([]);
      expect(
        cacheEntriesFromResponse({
          response,
          account: ACCOUNT,
          chainId: '0x8f',
          vaultAddresses: [STANDARD_VAULT],
        }),
      ).toEqual([]);
    });
  });

  describe('getHistoricalVaultShareDisplayAmount', () => {
    const stored = toCachedVaultShareValuation(valuation());
    if (!stored) {
      throw new Error('test valuation fixture must be valid');
    }

    it('returns the exact historical mUSD amount for one unique match', () => {
      expect(
        getHistoricalVaultShareDisplayAmount(cardActivity(), [stored]),
      ).toEqual({
        type: 'historical',
        value: '968399999',
        decimals: 6,
      });
    });

    it('returns undefined for no matches or an ambiguous match', () => {
      expect(
        getHistoricalVaultShareDisplayAmount(cardActivity(), []),
      ).toBeUndefined();
      expect(
        getHistoricalVaultShareDisplayAmount(cardActivity(), [
          stored,
          { ...stored, logIndex: 157 },
        ]),
      ).toBeUndefined();
    });

    it('requires the transfer direction and exact share amount', () => {
      expect(
        getHistoricalVaultShareDisplayAmount(cardActivity(), [
          { ...stored, type: 'transfer_in' },
        ]),
      ).toBeUndefined();
      expect(
        getHistoricalVaultShareDisplayAmount(cardActivity({ amount: '1' }), [
          stored,
        ]),
      ).toBeUndefined();
    });
  });

  describe('getApproximateVaultShareDisplayAmount', () => {
    it('converts shares with the current decimal rate and floors to mUSD base units', () => {
      expect(
        getApproximateVaultShareDisplayAmount(cardActivity(), '1.017488'),
      ).toEqual({
        type: 'approximate',
        value: '968399999',
        decimals: 6,
      });
    });

    it.each([undefined, '', 'not-a-number', '-1'])(
      'returns unavailable for rate %s',
      (rate) => {
        expect(
          getApproximateVaultShareDisplayAmount(cardActivity(), rate),
        ).toEqual({ type: 'unavailable' });
      },
    );
  });

  it('normalizes cache identity casing and chain representation', () => {
    const key = {
      account: ACCOUNT,
      chainId: 143,
      vaultAddress: STANDARD_VAULT.toUpperCase().replace('0X', '0x'),
      txHash: TX_HASH.toUpperCase().replace('0X', '0x'),
    };

    expect(getVaultShareValuationCacheIdentity(key)).toBe(
      `${ACCOUNT.toLowerCase()}:143:${STANDARD_VAULT}:${TX_HASH}`,
    );
  });
});
