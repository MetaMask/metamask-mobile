import type { InterestHistoryEntry } from '../../hooks/useMoneyHistoricalEarnings';
import {
  EARNINGS_RANGES,
  getDailyEarningsPoints,
  getRangeEntries,
  hasInvalidHistoryEntries,
  sumEarnings,
  type EarningsPoint,
  type EarningsRange,
} from './earningsHistory';

const createEntry = (
  timestamp: string,
  interestEarnedUsd = '1',
): InterestHistoryEntry => ({
  timestamp,
  interest_earned_usd: interestEarnedUsd,
});

const createDailyEntries = (numberOfDays: number): InterestHistoryEntry[] =>
  Array.from({ length: numberOfDays }, (_, index) =>
    createEntry(
      new Date(Date.UTC(2026, 10, 16 - index, 12)).toISOString(),
      String(index + 1),
    ),
  );

describe('earningsHistory', () => {
  describe('EARNINGS_RANGES', () => {
    it('lists ranges from shortest to longest', () => {
      const expectedRanges = [
        '1W',
        '30D',
        '3M',
        '6M',
        '1Y',
      ] satisfies readonly EarningsRange[];

      expect(EARNINGS_RANGES).toEqual(expectedRanges);
    });
  });

  describe('getRangeEntries', () => {
    it.each([
      { range: '1W', expectedDays: 7 },
      { range: '30D', expectedDays: 30 },
      { range: '3M', expectedDays: 90 },
      { range: '6M', expectedDays: 180 },
      { range: '1Y', expectedDays: 365 },
    ] as const)(
      'returns the latest $expectedDays days for $range',
      ({ range, expectedDays }) => {
        const entries = createDailyEntries(400);

        const result = getRangeEntries(entries, range);

        expect(result).toHaveLength(expectedDays);
      },
    );

    it('anchors the range to the newest valid API timestamp', () => {
      const entries = [
        createEntry('2020-01-02T12:00:00.000Z'),
        createEntry('2020-01-01T12:00:00.000Z'),
        createEntry('2019-12-27T12:00:00.000Z'),
        createEntry('2019-12-26T12:00:00.000Z'),
        createEntry('not-a-date'),
      ];

      const result = getRangeEntries(entries, '1W');

      expect(result).toEqual(entries.slice(0, 3));
    });

    it('rejects impossible calendar dates when choosing the newest timestamp', () => {
      const validEntries = [
        createEntry('2026-02-28T12:00:00.000Z'),
        createEntry('2026-02-27T12:00:00.000Z'),
      ];
      const entries = [
        ...validEntries,
        createEntry('2026-02-30T12:00:00.000Z'),
      ];

      const result = getRangeEntries(entries, '1W');

      expect(result).toEqual(validEntries);
    });

    it('includes every entry on UTC boundary dates', () => {
      const entries = [
        createEntry('2026-11-16T23:59:59.999Z'),
        createEntry('2026-11-10T00:00:00.000Z'),
        createEntry('2026-11-09T23:59:59.999Z'),
      ];

      const result = getRangeEntries(entries, '1W');

      expect(result).toEqual(entries.slice(0, 2));
    });

    it('returns no entries when every timestamp is malformed', () => {
      const entries = [
        createEntry('not-a-date'),
        createEntry('also-not-a-date'),
      ];

      const result = getRangeEntries(entries, '30D');

      expect(result).toEqual([]);
    });
  });

  describe('getDailyEarningsPoints', () => {
    it('groups repeated timestamps by UTC calendar day', () => {
      const entries = [
        createEntry('2026-11-13T23:30:00.000Z', '1.05'),
        createEntry('2026-11-13T00:30:00.000Z', '2'),
      ];

      const result = getDailyEarningsPoints(entries);

      expect(result).toEqual([
        { timestamp: '2026-11-13T00:00:00.000Z', amount: 3.05 },
      ]);
    });

    it('orders points from oldest to newest', () => {
      const entries = [
        createEntry('2026-11-15T12:00:00.000Z', '3'),
        createEntry('2026-11-13T12:00:00.000Z', '1'),
        createEntry('2026-11-14T12:00:00.000Z', '2'),
      ];

      const result = getDailyEarningsPoints(entries);

      expect(result).toEqual([
        { timestamp: '2026-11-13T00:00:00.000Z', amount: 1 },
        { timestamp: '2026-11-14T00:00:00.000Z', amount: 2 },
        { timestamp: '2026-11-15T00:00:00.000Z', amount: 3 },
      ]);
    });

    it('fills missing UTC days with zero values for an explicit range', () => {
      const entries = [
        createEntry('2026-11-16T12:00:00.000Z', '3'),
        createEntry('2026-11-13T12:00:00.000Z', '1'),
      ];

      const result = getDailyEarningsPoints(entries, '1W');

      expect(result).toHaveLength(7);
      expect(result).toEqual([
        { timestamp: '2026-11-10T00:00:00.000Z', amount: 0 },
        { timestamp: '2026-11-11T00:00:00.000Z', amount: 0 },
        { timestamp: '2026-11-12T00:00:00.000Z', amount: 0 },
        { timestamp: '2026-11-13T00:00:00.000Z', amount: 1 },
        { timestamp: '2026-11-14T00:00:00.000Z', amount: 0 },
        { timestamp: '2026-11-15T00:00:00.000Z', amount: 0 },
        { timestamp: '2026-11-16T00:00:00.000Z', amount: 3 },
      ]);
    });

    it('omits malformed timestamps and non-finite numeric values', () => {
      const entries = [
        createEntry('2026-11-13T12:00:00.000Z', '84.2'),
        createEntry('2026-11-13T13:00:00.000Z', 'NaN'),
        createEntry('2026-11-13T14:00:00.000Z', 'Infinity'),
        createEntry('2026-11-13T15:00:00.000Z', ''),
        createEntry('not-a-date', '5'),
      ];

      const result = getDailyEarningsPoints(entries);

      expect(result).toEqual([
        { timestamp: '2026-11-13T00:00:00.000Z', amount: 84.2 },
      ]);
    });

    it('does not manufacture a point for a day without valid values', () => {
      const entries = [
        createEntry('2026-11-13T12:00:00.000Z', 'invalid'),
        createEntry('2026-11-13T13:00:00.000Z', 'NaN'),
      ];

      const result = getDailyEarningsPoints(entries);

      expect(result).toEqual([]);
    });

    it('does not throw for null or missing runtime values', () => {
      const entries = [
        null,
        { timestamp: null, interest_earned_usd: '1' },
        {
          timestamp: '2026-11-13T12:00:00.000Z',
          interest_earned_usd: null,
        },
        { timestamp: '2026-11-13T12:00:00.000Z' },
      ] as unknown as InterestHistoryEntry[];

      const result = getDailyEarningsPoints(entries);

      expect(result).toEqual([]);
    });

    it('throws when same-day addition exceeds the finite numeric range', () => {
      const entries = [
        createEntry('2026-11-13T12:00:00.000Z', String(Number.MAX_VALUE)),
        createEntry('2026-11-13T13:00:00.000Z', String(Number.MAX_VALUE)),
      ];

      const aggregateEntries = (): EarningsPoint[] =>
        getDailyEarningsPoints(entries);

      expect(aggregateEntries).toThrow(
        'Historical earnings aggregation exceeded the finite numeric range',
      );
    });
  });

  describe('hasInvalidHistoryEntries', () => {
    it.each([
      {
        description: 'null entry',
        entries: [null],
      },
      {
        description: 'missing timestamp',
        entries: [{ interest_earned_usd: '1' }],
      },
      {
        description: 'impossible timestamp',
        entries: [
          {
            timestamp: '2026-02-30T12:00:00.000Z',
            interest_earned_usd: '1',
          },
        ],
      },
      {
        description: 'missing amount',
        entries: [{ timestamp: '2026-11-13T12:00:00.000Z' }],
      },
      {
        description: 'non-string amount',
        entries: [
          {
            timestamp: '2026-11-13T12:00:00.000Z',
            interest_earned_usd: null,
          },
        ],
      },
      {
        description: 'non-finite amount',
        entries: [
          {
            timestamp: '2026-11-13T12:00:00.000Z',
            interest_earned_usd: 'Infinity',
          },
        ],
      },
    ])('returns true for $description', ({ entries }) => {
      const result = hasInvalidHistoryEntries(entries);

      expect(result).toBe(true);
    });

    it('returns false when every entry has a valid timestamp and amount', () => {
      const entries = [
        createEntry('2026-11-13T12:00:00.000Z', '0'),
        createEntry('2026-11-14T12:00:00.000Z', '-1.5'),
      ];

      const result = hasInvalidHistoryEntries(entries);

      expect(result).toBe(false);
    });

    it('returns true when same-day aggregation exceeds the finite range', () => {
      const entries = [
        createEntry('2026-11-13T12:00:00.000Z', String(Number.MAX_VALUE)),
        createEntry('2026-11-13T13:00:00.000Z', String(Number.MAX_VALUE)),
      ];

      const result = hasInvalidHistoryEntries(entries);

      expect(result).toBe(true);
    });
  });

  describe('sumEarnings', () => {
    it('sums finite earnings values', () => {
      const entries = [
        createEntry('2026-11-13T12:00:00.000Z', '80'),
        createEntry('2026-11-14T12:00:00.000Z', '4.2'),
      ];

      const result = sumEarnings(entries);

      expect(result).toBeCloseTo(84.2);
    });

    it('excludes malformed numeric values', () => {
      const entries = [
        createEntry('2026-11-13T12:00:00.000Z', '10'),
        createEntry('2026-11-14T12:00:00.000Z', 'invalid'),
        createEntry('2026-11-15T12:00:00.000Z', 'Infinity'),
        createEntry('2026-11-16T12:00:00.000Z', ' '),
      ];

      const result = sumEarnings(entries);

      expect(result).toBe(10);
    });

    it('throws when total addition exceeds the finite numeric range', () => {
      const entries = [
        createEntry('2026-11-13T12:00:00.000Z', String(Number.MAX_VALUE)),
        createEntry('2026-11-14T12:00:00.000Z', String(Number.MAX_VALUE)),
      ];

      const totalEntries = (): number => sumEarnings(entries);

      expect(totalEntries).toThrow(
        'Historical earnings aggregation exceeded the finite numeric range',
      );
    });
  });
});
