import {
  CARD_SPEND_RATE_HISTORY_INITIAL_LOOKBACK_MS,
  CARD_SPEND_RATE_HISTORY_MAX_LOOKBACK_MS,
  fetchCardSpendRateHistory,
  parseRate18,
  selectHistoricalRateForBlock,
} from './moneyAccountCardSpendRate';
import type {
  RateHistoryEntry,
  RateHistoryResponse,
} from '@metamask/money-account-api-data-service';

const createRate = (block_number: number, rate: string): RateHistoryEntry => ({
  timestamp: new Date(block_number * 1000).toISOString(),
  block_number,
  rate,
  tx_hash: `0x${block_number}`,
});

describe('parseRate18', () => {
  it('parses API decimal rates as 18-decimal integers', () => {
    // Arrange
    const rate = '1.234567890123456789';

    // Act
    const result = parseRate18(rate);

    // Assert
    expect(result).toBe(1234567890123456789n);
  });

  it('parses integer rate values to the 18-decimal scale', () => {
    // Arrange
    const rate = '2';

    // Act
    const result = parseRate18(rate);

    // Assert
    expect(result).toBe(2000000000000000000n);
  });

  it('rejects rates with more than 18 decimal places', () => {
    // Arrange
    const rate = '1.0000000000000000001';

    // Act
    const result = parseRate18(rate);

    // Assert
    expect(result).toBeUndefined();
  });
});

describe('selectHistoricalRateForBlock', () => {
  it('selects an exact block rate and excludes later updates', () => {
    // Arrange
    const rates = [createRate(101, '1.2'), createRate(103, '1.5')];

    // Act
    const result = selectHistoricalRateForBlock(rates, 101);

    // Assert
    expect(result).toBe('1200000000000000000');
  });

  it('selects the latest rate at or before the activity block', () => {
    // Arrange
    const rates = [
      createRate(99, '1.1'),
      createRate(102, '1.25'),
      createRate(104, '1.5'),
    ];

    // Act
    const result = selectHistoricalRateForBlock(rates, 103);

    // Assert
    expect(result).toBe('1250000000000000000');
  });

  it('chooses the later time-sorted update within a matching block', () => {
    // Arrange
    const rates = [
      {
        ...createRate(101, '1.1'),
        timestamp: '2026-06-04T11:00:00.000Z',
      },
      {
        ...createRate(101, '1.2'),
        timestamp: '2026-06-04T12:00:00.000Z',
      },
    ];

    // Act
    const result = selectHistoricalRateForBlock(rates, 101);

    // Assert
    expect(result).toBe('1200000000000000000');
  });

  it('returns no rate when no indexed point is at or before the block', () => {
    // Arrange
    const rates = [createRate(102, '1.25')];

    // Act
    const result = selectHistoricalRateForBlock(rates, 101);

    // Assert
    expect(result).toBeUndefined();
  });
});

describe('fetchCardSpendRateHistory', () => {
  const vaultAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const chainId = 143;
  const activityTime = Date.parse('2026-06-04T11:53:51.000Z');
  const response = (
    rates: RateHistoryEntry[],
    overrides: Partial<RateHistoryResponse> = {},
  ) =>
    ({
      vault_address: vaultAddress,
      chain_id: chainId,
      range_start: '',
      range_end: '',
      rates,
      as_of_block: 200,
      as_of_timestamp: '',
      data_freshness: 'live',
      indexer_lag_seconds: 0,
      ...overrides,
    }) as RateHistoryResponse;

  it('fetches one batched bounded range for activities with an available rate', async () => {
    // Arrange
    const fetchRange = jest
      .fn()
      .mockResolvedValue(response([createRate(101, '1.2')]));

    // Act
    const result = await fetchCardSpendRateHistory(
      fetchRange,
      vaultAddress,
      chainId,
      [
        { blockNumber: 101, time: activityTime },
        { blockNumber: 101, time: activityTime + 1000 },
      ],
    );

    // Assert
    expect(result).toHaveLength(1);
    expect(fetchRange).toHaveBeenCalledTimes(1);
    expect(fetchRange).toHaveBeenCalledWith(vaultAddress, {
      chainId,
      from: new Date(
        activityTime - CARD_SPEND_RATE_HISTORY_INITIAL_LOOKBACK_MS,
      ).toISOString(),
      to: new Date(activityTime + 1000 + 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  it('expands bounded history when the initial window has no matching prior rate', async () => {
    // Arrange
    const fetchRange = jest
      .fn()
      .mockResolvedValueOnce(response([]))
      .mockResolvedValue(response([createRate(99, '1.1')]));

    // Act
    await fetchCardSpendRateHistory(fetchRange, vaultAddress, chainId, [
      { blockNumber: 101, time: activityTime },
    ]);

    // Assert
    expect(fetchRange).toHaveBeenCalledTimes(2);
    expect(fetchRange.mock.calls[1][1].from).toBe(
      new Date(
        activityTime -
          Math.min(
            CARD_SPEND_RATE_HISTORY_INITIAL_LOOKBACK_MS * 2,
            CARD_SPEND_RATE_HISTORY_MAX_LOOKBACK_MS,
          ),
      ).toISOString(),
    );
    expect(fetchRange.mock.calls[1][1].to).toBe(
      new Date(activityTime + 24 * 60 * 60 * 1000).toISOString(),
    );
  });

  it('returns bounded history without a matching prior rate after the maximum lookback', async () => {
    // Arrange
    const fetchRange = jest.fn().mockResolvedValue(response([]));

    // Act
    const result = await fetchCardSpendRateHistory(
      fetchRange,
      vaultAddress,
      chainId,
      [{ blockNumber: 101, time: activityTime }],
    );

    // Assert
    expect(result).toEqual([]);
    expect(fetchRange).toHaveBeenCalledTimes(5);
    expect(fetchRange.mock.calls.at(-1)?.[1].from).toBe(
      new Date(
        activityTime - CARD_SPEND_RATE_HISTORY_MAX_LOOKBACK_MS,
      ).toISOString(),
    );
  });

  it('rejects rate-history responses for another vault or chain', async () => {
    // Arrange
    const fetchRange = jest
      .fn()
      .mockResolvedValue(response([], { chain_id: 1 }));

    // Act & Assert
    await expect(
      fetchCardSpendRateHistory(fetchRange, vaultAddress, chainId, [
        { blockNumber: 101, time: activityTime },
      ]),
    ).rejects.toThrow('Rate history response did not match configured vault');
  });
});
