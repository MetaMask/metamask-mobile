import { renderHook } from '@testing-library/react-native';
import { useQueries } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { Hex } from '@metamask/utils';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { annotateTrace, trace } from '../../../../util/trace';
import type { AccountsApiActivity } from '../types/moneyActivity';
import {
  readCachedVaultShareValuations,
  writeCachedVaultShareValuations,
} from '../utils/moneyVaultShareValuationCache';
import {
  getVaultShareValuationCacheIdentity,
  type VaultShareValuationCacheEntry,
} from '../utils/vaultShareValuations';
import { useMoneyActivityValuations } from './useMoneyActivityValuations';

jest.mock('@tanstack/react-query', () => ({
  useQueries: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

jest.mock('../../../../util/trace', () => ({
  annotateTrace: jest.fn(),
  trace: jest.fn((_request, callback) => callback(undefined)),
  TraceName: {
    MoneyActivityVaultShareValuationsFetch: 'Vault Share Valuations',
  },
  TraceOperation: { MoneyAccountDataFetch: 'money.account.data_fetch' },
}));

jest.mock('../utils/moneyVaultShareValuationCache', () => ({
  readCachedVaultShareValuations: jest.fn(),
  writeCachedVaultShareValuations: jest.fn(),
}));

const mockUseQueries = jest.mocked(useQueries);
const mockNetworkTier = jest.mocked(useNetworkTier);
const mockEngineCall = jest.mocked(Engine.controllerMessenger.call);
const mockReadCache = jest.mocked(readCachedVaultShareValuations);
const mockWriteCache = jest.mocked(writeCachedVaultShareValuations);
const mockTrace = jest.mocked(trace);
const mockAnnotateTrace = jest.mocked(annotateTrace);

const ACCOUNT = '0xAbCdEf0123456789012345678901234567890123';
const VAULT = '0x1111111111111111111111111111111111111111' as const;
const TX_HASH =
  '0x8b6975a5d81b44bbe4487b5e5237e25be7ffc71e38d48146e8a501299fddc9f1' as const;
const TX_HASH_2 =
  '0x6c6975a5d81b44bbe4487b5e5237e25be7ffc71e38d48146e8a501299fddc9f2' as const;
const vaultTokens = [{ chainId: '0x8f' as const, address: VAULT }];

function txHash(index: number): Hex {
  return `0x${index.toString(16).padStart(64, '0')}`;
}

function activity(hash: Hex, amount = '951755696'): AccountsApiActivity {
  return {
    kind: 'card',
    hash,
    time: 1_700_000_000_000,
    chainId: '0x8f',
    blockNumber: 108974623,
    token: { address: VAULT, symbol: 'vmUSD', decimals: 6 },
    amount,
    paidTo: '0x4444444444444444444444444444444444444444',
  };
}

function cacheEntry(
  row: AccountsApiActivity,
  assetsWei = '968399999',
): VaultShareValuationCacheEntry {
  return {
    account: ACCOUNT.toLowerCase(),
    chainId: 143,
    vaultAddress: VAULT,
    txHash: row.hash.toLowerCase(),
    valuations: [
      {
        type: row.kind === 'cashback' ? 'transfer_in' : 'transfer_out',
        logIndex: 1,
        blockNumber: row.blockNumber ?? 0,
        sharesWei: row.amount,
        assetsWei,
        assetDecimals: 6,
      },
    ],
  };
}

function valuationResponse(rows: AccountsApiActivity[]) {
  return {
    address: ACCOUNT.toLowerCase(),
    chain_id: 143,
    results: rows.map((row) => ({
      tx_hash: row.hash.toLowerCase(),
      found: true,
      valuations: [
        {
          vault_address: VAULT,
          vault_key: 'standard',
          asset_symbol: 'mUSD',
          asset_decimals: 6,
          type: 'transfer_out' as const,
          log_index: 1,
          block_number: row.blockNumber ?? 0,
          timestamp: '2026-09-29T07:17:22Z',
          shares_wei: row.amount,
          assets_wei: '968399999',
          rate: '1.017488',
          source: 'erc20_transfer' as const,
        },
      ],
    })),
    as_of_block: 1,
    as_of_timestamp: '2026-11-10T12:34:56Z',
    data_freshness: 'live' as const,
    indexer_lag_seconds: 4,
  };
}

function queryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

function renderValuations({
  pages,
  enabled = true,
}: {
  pages: AccountsApiActivity[][];
  enabled?: boolean;
}) {
  return renderHook(() =>
    useMoneyActivityValuations({
      pageActivities: pages,
      moneyAddress: ACCOUNT,
      vaultShareTokens: vaultTokens,
      enabled,
    }),
  );
}

function getQueryOptions(callIndex: number) {
  const options = mockUseQueries.mock.calls[callIndex][0] as unknown as {
    queries: {
      queryKey: unknown[];
      enabled: boolean;
      initialData?: VaultShareValuationCacheEntry[];
      queryFn?: () => Promise<VaultShareValuationCacheEntry[]>;
    }[];
  };
  return options.queries;
}

describe('useMoneyActivityValuations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkTier.mockReturnValue('WIFI');
    mockReadCache.mockReturnValue([]);
    mockWriteCache.mockResolvedValue(undefined);
    mockUseQueries.mockReturnValue(
      [] as unknown as ReturnType<typeof useQueries>,
    );
  });

  it('requests each page once and returns historical amounts from the response', async () => {
    const row = activity(TX_HASH);
    mockEngineCall.mockResolvedValue(valuationResponse([row]));
    renderValuations({ pages: [[row]] });

    const [query] = getQueryOptions(0);
    const entries = await query.queryFn?.();
    mockUseQueries.mockReturnValue([
      queryResult({ data: entries }),
    ] as unknown as ReturnType<typeof useQueries>);

    expect(mockEngineCall).toHaveBeenCalledWith(
      'MoneyAccountApiDataService:fetchVaultShareValuations',
      ACCOUNT,
      { chainId: 143, txHashes: [TX_HASH] },
    );
    expect(mockWriteCache).toHaveBeenCalledWith([cacheEntry(row)]);
    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Vault Share Valuations',
        tags: { page_index: 0 },
      }),
      expect.any(Function),
    );
    expect(mockAnnotateTrace).toHaveBeenCalledWith(undefined, {
      requested_count: 1,
      cache_hit_count: 0,
      chunk_count: 1,
    });
  });

  it('requests only page targets missing from the persistent cache', async () => {
    const cached = activity(TX_HASH);
    const missing = activity(TX_HASH_2);
    mockReadCache.mockReturnValue([cacheEntry(cached)]);
    mockEngineCall.mockResolvedValue(valuationResponse([missing]));
    renderValuations({ pages: [[cached, missing]] });

    const [query] = getQueryOptions(0);
    await query.queryFn?.();

    expect(JSON.stringify(query.queryKey)).toContain(TX_HASH_2);
    expect(JSON.stringify(query.queryKey)).not.toContain(TX_HASH);
    expect(mockEngineCall).toHaveBeenCalledWith(
      'MoneyAccountApiDataService:fetchVaultShareValuations',
      ACCOUNT,
      { chainId: 143, txHashes: [TX_HASH_2] },
    );
  });

  it('splits an oversized page at 50 hashes without dropping rows', async () => {
    const rows = Array.from({ length: 51 }, (_, index) =>
      activity(txHash(index), `${index + 1}`),
    );
    mockEngineCall.mockResolvedValue(valuationResponse(rows));
    renderValuations({ pages: [rows] });

    const [query] = getQueryOptions(0);
    await query.queryFn?.();

    expect(mockEngineCall).toHaveBeenCalledTimes(2);
    expect(mockEngineCall).toHaveBeenNthCalledWith(
      1,
      'MoneyAccountApiDataService:fetchVaultShareValuations',
      ACCOUNT,
      { chainId: 143, txHashes: rows.slice(0, 50).map((row) => row.hash) },
    );
    expect(mockEngineCall).toHaveBeenNthCalledWith(
      2,
      'MoneyAccountApiDataService:fetchVaultShareValuations',
      ACCOUNT,
      { chainId: 143, txHashes: [rows[50].hash] },
    );
  });

  it('performs no requests when every target is cached', () => {
    const row = activity(TX_HASH);
    mockReadCache.mockReturnValue([cacheEntry(row)]);
    const { result } = renderValuations({ pages: [[row]] });

    const [query] = getQueryOptions(0);

    expect(query.enabled).toBe(false);
    expect(mockEngineCall).not.toHaveBeenCalled();
    expect(result.current.getDisplayAmount(row)).toEqual({
      type: 'historical',
      value: '968399999',
      decimals: 6,
    });
    expect(result.current.isSettling).toBe(false);
  });

  it('uses the current rate while historical data is unresolved', () => {
    const row = activity(TX_HASH);
    mockUseQueries
      .mockReturnValueOnce([
        { ...queryResult(), isLoading: true },
      ] as unknown as ReturnType<typeof useQueries>)
      .mockReturnValueOnce([
        queryResult({ data: { rate: '1.017488' } }),
      ] as unknown as ReturnType<typeof useQueries>);
    const { result } = renderValuations({ pages: [[row]] });

    expect(result.current.getDisplayAmount(row)).toEqual({
      type: 'approximate',
      value: '968399999',
      decimals: 6,
    });
    expect(result.current.isSettling).toBe(true);
  });

  it('shows unavailable rather than raw shares when no rate is available', () => {
    const row = activity(TX_HASH);
    const { result } = renderValuations({ pages: [[row]] });

    expect(result.current.getDisplayAmount(row)).toEqual({
      type: 'unavailable',
    });
  });

  it('uses cached history on a known-offline device without starting requests', () => {
    const row = activity(TX_HASH);
    mockReadCache.mockReturnValue([cacheEntry(row)]);
    mockNetworkTier.mockReturnValue('NONE');
    const { result } = renderValuations({ pages: [[row]] });

    expect(getQueryOptions(0)[0].enabled).toBe(false);
    expect(result.current.getDisplayAmount(row)).toEqual({
      type: 'historical',
      value: '968399999',
      decimals: 6,
    });
  });

  it('leaves non-target rows on their legacy display path', () => {
    const row = {
      ...activity(TX_HASH),
      token: {
        ...activity(TX_HASH).token,
        address: '0x9999999999999999999999999999999999999999' as const,
      },
    };
    const { result } = renderValuations({ pages: [[row]] });

    expect(result.current.getDisplayAmount(row)).toBeUndefined();
  });

  it('bypasses cache and display resolution when the flag is off', () => {
    const row = activity(TX_HASH);
    mockReadCache.mockReturnValue([cacheEntry(row)]);
    const { result } = renderValuations({ pages: [[row]], enabled: false });

    expect(mockReadCache).not.toHaveBeenCalled();
    expect(result.current.getDisplayAmount(row)).toBeUndefined();
    expect(result.current.isSettling).toBe(false);
  });

  it('keeps the exact cache identity for account, chain, vault and hash', () => {
    const row = activity(TX_HASH);
    const entry = cacheEntry(row);

    expect(getVaultShareValuationCacheIdentity(entry)).toBe(
      `${ACCOUNT.toLowerCase()}:143:${VAULT}:${TX_HASH}`,
    );
  });
});
