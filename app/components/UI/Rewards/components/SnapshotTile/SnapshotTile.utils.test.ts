import { IconName } from '@metamask/design-system-react-native';
import type {
  SnapshotDto,
  SnapshotStatus,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  getSnapshotStatus,
  formatSnapshotStatusLabel,
  getSnapshotPillLabel,
  getSnapshotStatusInfo,
} from './SnapshotTile.utils';

// Mock the strings function - must return the key-based string for assertions
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { date?: string }) => {
    const keyPart = key.split('.').pop() || key;
    if (params?.date) {
      return `${keyPart}: ${params.date}`;
    }
    return keyPart;
  },
}));

/**
 * Creates a test snapshot with sensible defaults.
 * @param overrides - Partial SnapshotDto to override defaults
 * @returns Complete SnapshotDto for testing
 */
const createTestSnapshot = (
  overrides: Partial<SnapshotDto> = {},
): SnapshotDto => ({
  id: 'test-snapshot-id',
  seasonId: 'test-season-id',
  name: 'Test Snapshot',
  description: 'Test description',
  tokenSymbol: 'TEST',
  tokenAmount: '1000000000000000000',
  tokenChainId: '1',
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678',
  receivingBlockchain: 'Ethereum',
  opensAt: '2025-03-01T00:00:00.000Z',
  closesAt: '2025-03-15T00:00:00.000Z',
  backgroundImage: {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  },
  ...overrides,
});

/**
 * Helper to format a date for comparison in the America/Toronto timezone
 * The production code uses new Date().getHours() which returns local time
 */
const getExpectedFormattedDate = (isoString: string): string => {
  const date = new Date(isoString);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const paddedMinutes = minutes.toString().padStart(2, '0');

  return `${month} ${day}, ${hour12}:${paddedMinutes} ${ampm}`;
};

describe('SnapshotTile.utils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  describe('getSnapshotStatus', () => {
    it('returns "complete" when distributedAt is set', () => {
      jest.setSystemTime(new Date('2025-03-20T00:00:00.000Z'));
      const snapshot = createTestSnapshot({
        calculatedAt: '2025-03-16T00:00:00.000Z',
        distributedAt: '2025-03-20T00:00:00.000Z',
      });

      const result = getSnapshotStatus(snapshot);

      expect(result).toBe('complete');
    });

    it('returns "distributing" when calculatedAt is set but distributedAt is not', () => {
      jest.setSystemTime(new Date('2025-03-18T00:00:00.000Z'));
      const snapshot = createTestSnapshot({
        calculatedAt: '2025-03-16T00:00:00.000Z',
        distributedAt: undefined,
      });

      const result = getSnapshotStatus(snapshot);

      expect(result).toBe('distributing');
    });

    it('returns "upcoming" when current time is before opensAt', () => {
      jest.setSystemTime(new Date('2025-02-28T00:00:00.000Z'));
      const snapshot = createTestSnapshot();

      const result = getSnapshotStatus(snapshot);

      expect(result).toBe('upcoming');
    });

    it('returns "live" when current time is between opensAt and closesAt', () => {
      jest.setSystemTime(new Date('2025-03-10T00:00:00.000Z'));
      const snapshot = createTestSnapshot();

      const result = getSnapshotStatus(snapshot);

      expect(result).toBe('live');
    });

    it('returns "live" when current time equals opensAt exactly', () => {
      jest.setSystemTime(new Date('2025-03-01T00:00:00.000Z'));
      const snapshot = createTestSnapshot();

      const result = getSnapshotStatus(snapshot);

      expect(result).toBe('live');
    });

    it('returns "calculating" when current time is past closesAt and calculatedAt is not set', () => {
      jest.setSystemTime(new Date('2025-03-16T00:00:00.000Z'));
      const snapshot = createTestSnapshot({
        calculatedAt: undefined,
        distributedAt: undefined,
      });

      const result = getSnapshotStatus(snapshot);

      expect(result).toBe('calculating');
    });

    it('returns "calculating" when current time equals closesAt exactly', () => {
      jest.setSystemTime(new Date('2025-03-15T00:00:00.000Z'));
      const snapshot = createTestSnapshot({
        calculatedAt: undefined,
        distributedAt: undefined,
      });

      const result = getSnapshotStatus(snapshot);

      expect(result).toBe('calculating');
    });

    it('prioritizes "complete" over other statuses when distributedAt is set', () => {
      jest.setSystemTime(new Date('2025-02-01T00:00:00.000Z'));
      const snapshot = createTestSnapshot({
        calculatedAt: '2025-03-16T00:00:00.000Z',
        distributedAt: '2025-03-20T00:00:00.000Z',
      });

      const result = getSnapshotStatus(snapshot);

      expect(result).toBe('complete');
    });

    it('prioritizes "distributing" over date-based statuses when calculatedAt is set', () => {
      jest.setSystemTime(new Date('2025-02-01T00:00:00.000Z'));
      const snapshot = createTestSnapshot({
        calculatedAt: '2025-03-16T00:00:00.000Z',
        distributedAt: undefined,
      });

      const result = getSnapshotStatus(snapshot);

      expect(result).toBe('distributing');
    });
  });

  describe('formatSnapshotStatusLabel', () => {
    it('returns starts_date label with formatted opensAt for upcoming status', () => {
      const opensAtDate = '2025-03-01T14:30:00.000Z';
      const snapshot = createTestSnapshot({
        opensAt: opensAtDate,
      });
      const expectedDate = getExpectedFormattedDate(opensAtDate);

      const result = formatSnapshotStatusLabel('upcoming', snapshot);

      expect(result).toBe(`starts_date: ${expectedDate}`);
    });

    it('returns ends_date label with formatted closesAt for live status', () => {
      const closesAtDate = '2025-03-15T09:00:00.000Z';
      const snapshot = createTestSnapshot({
        closesAt: closesAtDate,
      });
      const expectedDate = getExpectedFormattedDate(closesAtDate);

      const result = formatSnapshotStatusLabel('live', snapshot);

      expect(result).toBe(`ends_date: ${expectedDate}`);
    });

    it('returns results_coming_soon label for calculating status', () => {
      const snapshot = createTestSnapshot();

      const result = formatSnapshotStatusLabel('calculating', snapshot);

      expect(result).toBe('results_coming_soon');
    });

    it('returns tokens_on_the_way label for distributing status', () => {
      const snapshot = createTestSnapshot();

      const result = formatSnapshotStatusLabel('distributing', snapshot);

      expect(result).toBe('tokens_on_the_way');
    });

    it('returns formatted distributedAt date for complete status', () => {
      const distributedAtDate = '2025-03-20T16:45:00.000Z';
      const snapshot = createTestSnapshot({
        distributedAt: distributedAtDate,
      });
      const expectedDate = getExpectedFormattedDate(distributedAtDate);

      const result = formatSnapshotStatusLabel('complete', snapshot);

      expect(result).toBe(expectedDate);
    });

    it('returns formatted current date for complete status when distributedAt is undefined', () => {
      const currentDate = '2025-04-01T10:00:00.000Z';
      jest.setSystemTime(new Date(currentDate));
      const snapshot = createTestSnapshot({
        distributedAt: undefined,
      });
      const expectedDate = getExpectedFormattedDate(currentDate);

      const result = formatSnapshotStatusLabel('complete', snapshot);

      expect(result).toBe(expectedDate);
    });

    it('returns empty string for unknown status', () => {
      const snapshot = createTestSnapshot();

      const result = formatSnapshotStatusLabel(
        'unknown' as SnapshotStatus,
        snapshot,
      );

      expect(result).toBe('');
    });

    it('formats midnight correctly (12:00 AM)', () => {
      const opensAtDate = '2025-03-01T05:00:00.000Z'; // Midnight in America/Toronto (UTC-5)
      const snapshot = createTestSnapshot({
        opensAt: opensAtDate,
      });
      const expectedDate = getExpectedFormattedDate(opensAtDate);

      const result = formatSnapshotStatusLabel('upcoming', snapshot);

      expect(result).toBe(`starts_date: ${expectedDate}`);
    });

    it('formats noon correctly (12:00 PM)', () => {
      const opensAtDate = '2025-03-01T17:00:00.000Z'; // Noon in America/Toronto (UTC-5)
      const snapshot = createTestSnapshot({
        opensAt: opensAtDate,
      });
      const expectedDate = getExpectedFormattedDate(opensAtDate);

      const result = formatSnapshotStatusLabel('upcoming', snapshot);

      expect(result).toBe(`starts_date: ${expectedDate}`);
    });

    it('pads single-digit minutes with leading zero', () => {
      const opensAtDate = '2025-03-01T19:05:00.000Z';
      const snapshot = createTestSnapshot({
        opensAt: opensAtDate,
      });
      const expectedDate = getExpectedFormattedDate(opensAtDate);

      const result = formatSnapshotStatusLabel('upcoming', snapshot);

      expect(result).toBe(`starts_date: ${expectedDate}`);
      expect(result).toContain(':05');
    });
  });

  describe('getSnapshotPillLabel', () => {
    it.each([
      ['upcoming', 'pill_up_next'],
      ['live', 'pill_live_now'],
      ['calculating', 'pill_calculating'],
      ['distributing', 'pill_results_ready'],
      ['complete', 'pill_complete'],
    ] as const)('returns %s for %s status', (status, expectedLabel) => {
      const result = getSnapshotPillLabel(status);

      expect(result).toBe(expectedLabel);
    });

    it('returns empty string for unknown status', () => {
      const result = getSnapshotPillLabel('unknown' as SnapshotStatus);

      expect(result).toBe('');
    });
  });

  describe('getSnapshotStatusInfo', () => {
    it('returns complete status info object for upcoming snapshot', () => {
      jest.setSystemTime(new Date('2025-02-28T00:00:00.000Z'));
      const opensAtDate = '2025-03-01T14:30:00.000Z';
      const snapshot = createTestSnapshot({
        opensAt: opensAtDate,
      });
      const expectedDate = getExpectedFormattedDate(opensAtDate);

      const result = getSnapshotStatusInfo(snapshot);

      expect(result).toEqual({
        status: 'upcoming',
        statusLabel: 'pill_up_next',
        statusDescription: `starts_date: ${expectedDate}`,
        statusDescriptionIcon: IconName.Speed,
      });
    });

    it('returns complete status info object for live snapshot', () => {
      jest.setSystemTime(new Date('2025-03-10T00:00:00.000Z'));
      const closesAtDate = '2025-03-15T09:00:00.000Z';
      const snapshot = createTestSnapshot({
        closesAt: closesAtDate,
      });
      const expectedDate = getExpectedFormattedDate(closesAtDate);

      const result = getSnapshotStatusInfo(snapshot);

      expect(result).toEqual({
        status: 'live',
        statusLabel: 'pill_live_now',
        statusDescription: `ends_date: ${expectedDate}`,
        statusDescriptionIcon: IconName.Clock,
      });
    });

    it('returns complete status info object for calculating snapshot', () => {
      jest.setSystemTime(new Date('2025-03-16T00:00:00.000Z'));
      const snapshot = createTestSnapshot({
        calculatedAt: undefined,
        distributedAt: undefined,
      });

      const result = getSnapshotStatusInfo(snapshot);

      expect(result).toEqual({
        status: 'calculating',
        statusLabel: 'pill_calculating',
        statusDescription: 'results_coming_soon',
        statusDescriptionIcon: IconName.Loading,
      });
    });

    it('returns complete status info object for distributing snapshot', () => {
      jest.setSystemTime(new Date('2025-03-18T00:00:00.000Z'));
      const snapshot = createTestSnapshot({
        calculatedAt: '2025-03-16T00:00:00.000Z',
        distributedAt: undefined,
      });

      const result = getSnapshotStatusInfo(snapshot);

      expect(result).toEqual({
        status: 'distributing',
        statusLabel: 'pill_results_ready',
        statusDescription: 'tokens_on_the_way',
        statusDescriptionIcon: IconName.Send,
      });
    });

    it('returns complete status info object for complete snapshot', () => {
      jest.setSystemTime(new Date('2025-03-25T00:00:00.000Z'));
      const distributedAtDate = '2025-03-20T16:45:00.000Z';
      const snapshot = createTestSnapshot({
        calculatedAt: '2025-03-16T00:00:00.000Z',
        distributedAt: distributedAtDate,
      });
      const expectedDate = getExpectedFormattedDate(distributedAtDate);

      const result = getSnapshotStatusInfo(snapshot);

      expect(result).toEqual({
        status: 'complete',
        statusLabel: 'pill_complete',
        statusDescription: expectedDate,
        statusDescriptionIcon: IconName.Confirmation,
      });
    });

    it('integrates all utility functions correctly', () => {
      jest.setSystemTime(new Date('2025-03-10T12:00:00.000Z'));
      const closesAtDate = '2025-03-15T18:30:00.000Z';
      const snapshot = createTestSnapshot({
        opensAt: '2025-03-01T00:00:00.000Z',
        closesAt: closesAtDate,
      });
      const expectedDate = getExpectedFormattedDate(closesAtDate);

      const result = getSnapshotStatusInfo(snapshot);

      expect(result.status).toBe('live');
      expect(result.statusLabel).toBe('pill_live_now');
      expect(result.statusDescription).toBe(`ends_date: ${expectedDate}`);
      expect(result.statusDescriptionIcon).toBe(IconName.Clock);
    });
  });

  describe('date formatting edge cases', () => {
    it('formats all months correctly', () => {
      const months = [
        { date: '2025-01-15T12:00:00.000Z', expected: 'Jan' },
        { date: '2025-02-15T12:00:00.000Z', expected: 'Feb' },
        { date: '2025-03-15T12:00:00.000Z', expected: 'Mar' },
        { date: '2025-04-15T12:00:00.000Z', expected: 'Apr' },
        { date: '2025-05-15T12:00:00.000Z', expected: 'May' },
        { date: '2025-06-15T12:00:00.000Z', expected: 'Jun' },
        { date: '2025-07-15T12:00:00.000Z', expected: 'Jul' },
        { date: '2025-08-15T12:00:00.000Z', expected: 'Aug' },
        { date: '2025-09-15T12:00:00.000Z', expected: 'Sep' },
        { date: '2025-10-15T12:00:00.000Z', expected: 'Oct' },
        { date: '2025-11-15T12:00:00.000Z', expected: 'Nov' },
        { date: '2025-12-15T12:00:00.000Z', expected: 'Dec' },
      ];

      months.forEach(({ date, expected }) => {
        const snapshot = createTestSnapshot({
          distributedAt: date,
        });

        const result = formatSnapshotStatusLabel('complete', snapshot);

        expect(result).toContain(expected);
      });
    });

    it('handles AM hours correctly (before noon)', () => {
      const opensAtDate = '2025-03-01T15:59:00.000Z'; // 10:59 AM in America/Toronto (UTC-5)
      const snapshot = createTestSnapshot({
        opensAt: opensAtDate,
      });
      const expectedDate = getExpectedFormattedDate(opensAtDate);

      const result = formatSnapshotStatusLabel('upcoming', snapshot);

      expect(result).toBe(`starts_date: ${expectedDate}`);
      expect(result).toContain('AM');
    });

    it('handles PM hours correctly (after noon)', () => {
      const opensAtDate = '2025-03-01T18:01:00.000Z'; // 1:01 PM in America/Toronto (UTC-5)
      const snapshot = createTestSnapshot({
        opensAt: opensAtDate,
      });
      const expectedDate = getExpectedFormattedDate(opensAtDate);

      const result = formatSnapshotStatusLabel('upcoming', snapshot);

      expect(result).toBe(`starts_date: ${expectedDate}`);
      expect(result).toContain('PM');
    });

    it('handles late night hours correctly', () => {
      const opensAtDate = '2025-03-02T04:59:00.000Z'; // 11:59 PM in America/Toronto (UTC-5)
      const snapshot = createTestSnapshot({
        opensAt: opensAtDate,
      });
      const expectedDate = getExpectedFormattedDate(opensAtDate);

      const result = formatSnapshotStatusLabel('upcoming', snapshot);

      expect(result).toBe(`starts_date: ${expectedDate}`);
    });
  });
});
