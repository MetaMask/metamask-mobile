/**
 * Unit tests for rewards formatting utilities
 */

import {
  formatRewardsDate,
  formatTimeRemaining,
  formatNumber,
  getIconName,
  formatUrl,
} from './formatUtils';
import { IconName } from '@metamask/design-system-react-native';
import { getTimeDifferenceFromNow } from '../../../../util/date';

const mockGetTimeDifferenceFromNow =
  getTimeDifferenceFromNow as jest.MockedFunction<
    typeof getTimeDifferenceFromNow
  >;

// Mock date utility
jest.mock('../../../../util/date', () => ({
  getTimeDifferenceFromNow: jest.fn(),
}));

// Mock i18n strings
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const t: Record<string, string> = {
      'rewards.events.to': 'to',
      'rewards.events.type.swap': 'Swap',
      'rewards.events.type.referral_action': 'Referral action',
      'rewards.events.type.sign_up_bonus': 'Sign up bonus',
      'rewards.events.type.loyalty_bonus': 'Loyalty bonus',
      'rewards.events.type.one_time_bonus': 'One-time bonus',
      'rewards.events.type.open_position': 'Opened position',
      'rewards.events.type.close_position': 'Closed position',
      'rewards.events.type.take_profit': 'Take profit',
      'rewards.events.type.stop_loss': 'Stop loss',
      'rewards.events.type.uncategorized_event': 'Uncategorized event',
      'perps.market.long': 'Long',
      'perps.market.short': 'Short',
    };
    return t[key] || key;
  }),
  default: {
    locale: 'en-US',
  },
}));

// Mock intl utility
const mockFormat = jest.fn((value: number) =>
  new Intl.NumberFormat('en-US').format(value),
);

const mockGetIntlNumberFormatter = jest.fn((_locale: string) => ({
  format: mockFormat,
}));

jest.mock('../../../../util/intl', () => ({
  getIntlNumberFormatter: mockGetIntlNumberFormatter,
}));

describe('formatUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatRewardsDate', () => {
    it('formats timestamp correctly with default locale', () => {
      const timestamp = new Date('2024-01-15T14:30:00Z');

      const result = formatRewardsDate(timestamp);

      expect(result).toMatch(/Jan 15, \d{1,2}:\d{2} (AM|PM)/);
    });

    it('formats timestamp correctly with custom locale', () => {
      // Given a timestamp and custom locale
      const timestamp = new Date('2024-01-15T14:30:00Z');
      const locale = 'fr-FR';

      // When formatting the date
      const result = formatRewardsDate(timestamp, locale);

      // Then it should return formatted date in French locale
      expect(result).toMatch(/15 janv., \d{1,2}:\d{2}/);
    });
  });

  describe('formatTimeRemaining', () => {
    it('returns formatted time with days, hours, and minutes when all are positive', () => {
      // Given: 2 days, 5 hours, 30 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 2,
        hours: 5,
        minutes: 30,
      });

      const endDate = new Date('2024-12-31T23:59:59Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days, hours, and minutes format
      expect(result).toBe('2d 5h 30m');
      expect(mockGetTimeDifferenceFromNow).toHaveBeenCalledWith(
        endDate.getTime(),
      );
    });

    it('returns formatted time with only minutes when hours and days are zero', () => {
      // Given: 0 hours, 45 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 0,
        minutes: 45,
      });

      const endDate = new Date('2024-01-01T12:45:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return minutes format
      expect(result).toBe('45m');
    });

    it('returns null when days, hours, and minutes are all zero', () => {
      // Given: 0 hours, 0 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 0,
        minutes: 0,
      });

      const endDate = new Date('2024-01-01T12:00:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return null
      expect(result).toBeNull();
    });

    it('returns null when time values are negative for past date', () => {
      // Given: negative minutes (past date)
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 0,
        minutes: -10,
      });

      const endDate = new Date('2023-01-01T12:00:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return null
      expect(result).toBeNull();
    });

    it('returns only hours when days and minutes are zero', () => {
      // Given: exactly 1 hour remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 1,
        minutes: 0,
      });

      const endDate = new Date('2024-01-01T13:00:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return hours format only
      expect(result).toBe('1h');
    });

    it('returns days, hours, and minutes for large time differences', () => {
      // Given: 365 days, 23 hours, 59 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 365,
        hours: 23,
        minutes: 59,
      });

      const endDate = new Date('2025-01-01T23:59:59Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days, hours, and minutes format
      expect(result).toBe('365d 23h 59m');
    });

    it('returns single digit values without padding', () => {
      // Given: 1 day, 1 hour, 1 minute remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 1,
        hours: 1,
        minutes: 1,
      });

      const endDate = new Date('2024-01-02T13:01:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days, hours, and minutes format without padding
      expect(result).toBe('1d 1h 1m');
    });

    it('returns hours and minutes when days are zero', () => {
      // Given: 0 days, 2 hours, 59 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 2,
        minutes: 59,
      });

      const endDate = new Date('2024-01-01T14:59:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return hours and minutes format
      expect(result).toBe('2h 59m');
    });

    it('returns exactly 1 minute when only minutes remain', () => {
      // Given: exactly 1 minute remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 0,
        minutes: 1,
      });

      const endDate = new Date('2024-01-01T12:01:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return minutes format
      expect(result).toBe('1m');
    });

    it('returns hours and minutes when days are zero', () => {
      // Given: 0 days, 12 hours, 30 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 12,
        minutes: 30,
      });

      const endDate = new Date('2024-01-02T00:30:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return hours and minutes format
      expect(result).toBe('12h 30m');
    });

    it('calls getTimeDifferenceFromNow with correct timestamp', () => {
      // Given: a specific end date
      const endDate = new Date('2024-06-15T10:30:00Z');
      const expectedTimestamp = endDate.getTime();

      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 1,
        hours: 2,
        minutes: 30,
      });

      // When: formatting time remaining
      formatTimeRemaining(endDate);

      // Then: should call getTimeDifferenceFromNow with correct timestamp
      expect(mockGetTimeDifferenceFromNow).toHaveBeenCalledWith(
        expectedTimestamp,
      );
      expect(mockGetTimeDifferenceFromNow).toHaveBeenCalledTimes(1);
    });

    it('returns days and minutes when hours are zero', () => {
      // Given: 3 days, 0 hours, 15 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 3,
        hours: 0,
        minutes: 15,
      });

      const endDate = new Date('2024-01-04T12:15:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days and minutes format
      expect(result).toBe('3d 15m');
    });

    it('returns only days when hours and minutes are zero', () => {
      // Given: 5 days, 0 hours, 0 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 5,
        hours: 0,
        minutes: 0,
      });

      const endDate = new Date('2024-01-06T12:00:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days format only
      expect(result).toBe('5d');
    });

    it('trims trailing space when minutes are zero', () => {
      // Given: 2 days, 3 hours, 0 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 2,
        hours: 3,
        minutes: 0,
      });

      const endDate = new Date('2024-12-31T15:00:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days and hours format without trailing space
      expect(result).toBe('2d 3h');
    });
  });

  describe('formatNumber', () => {
    it('should format positive numbers correctly', () => {
      expect(formatNumber(1234)).toBe('1234');
      expect(formatNumber(1000000)).toBe('1000000');
      expect(formatNumber(500)).toBe('500');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle null values', () => {
      expect(formatNumber(null)).toBe('0');
    });

    it('should handle undefined values', () => {
      expect(formatNumber(undefined as unknown as number)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1234');
      expect(formatNumber(-500)).toBe('-500');
    });

    it('should handle decimal numbers', () => {
      expect(formatNumber(1234.56)).toBe('1234.56');
      expect(formatNumber(999.99)).toBe('999.99');
    });

    it('should handle very large numbers', () => {
      expect(formatNumber(5000000)).toBe('5000000');
      expect(formatNumber(1500000)).toBe('1500000');
    });

    it('should fallback to string conversion on formatter error', () => {
      // Mock the formatter to throw an error
      const mockErrorFormatter = {
        format: jest.fn().mockImplementation(() => {
          throw new Error('Formatter error');
        }),
      };

      mockGetIntlNumberFormatter.mockReturnValue(mockErrorFormatter);

      expect(formatNumber(1234)).toBe('1234');

      // Restore original mock
      mockGetIntlNumberFormatter.mockReturnValue({ format: mockFormat });
    });
  });

  describe('getIconName', () => {
    it('should return valid IconName when provided valid icon name', () => {
      expect(getIconName('Star')).toBe(IconName.Star);
      expect(getIconName('ArrowDown')).toBe(IconName.ArrowDown);
      expect(getIconName('Lock')).toBe(IconName.Lock);
    });

    it('should return Star as fallback for invalid icon names', () => {
      expect(getIconName('InvalidIcon')).toBe(IconName.Star);
      expect(getIconName('NonExistentIcon')).toBe(IconName.Star);
      expect(getIconName('')).toBe(IconName.Star);
    });

    it('should handle null and undefined inputs', () => {
      expect(getIconName(null as unknown as string)).toBe(IconName.Star);
      expect(getIconName(undefined as unknown as string)).toBe(IconName.Star);
    });

    it('should handle case-sensitive icon names', () => {
      expect(getIconName('star')).toBe(IconName.Star); // lowercase should fallback
      expect(getIconName('STAR')).toBe(IconName.Star); // uppercase should fallback
    });

    it('should handle special characters and numbers', () => {
      expect(getIconName('Star123')).toBe(IconName.Star);
      expect(getIconName('Star-Icon')).toBe(IconName.Star);
      expect(getIconName('Star_Icon')).toBe(IconName.Star);
    });

    it('should work with all valid IconName enum values', () => {
      // Test a few common IconName values
      const validIcons = [
        'Add',
        'Arrow2Down',
        'Arrow2Left',
        'Arrow2Right',
        'Arrow2Up',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'Bank',
        'Bold',
        'Book',
        'Bookmark',
        'Calculator',
        'Calendar',
        'Camera',
        'Card',
        'CardPos',
        'CardToken',
        'Category',
        'Chart',
        'Check',
        'CheckBold',
        'CheckBoxOff',
        'CheckBoxOn',
        'Clock',
        'Close',
        'Coin',
        'Confirmation',
        'Connect',
        'Copy',
        'CopySuccess',
        'Danger',
        'Dark',
        'Data',
        'Diagram',
        'DocumentCode',
        'Download',
        'Edit',
        'Eraser',
        'Ethereum',
        'Expand',
        'Export',
        'EyeSlash',
        'File',
        'Filter',
        'Flag',
        'FlashSlash',
        'FullCircle',
        'Gas',
        'Global',
        'GlobalSearch',
        'Graph',
        'Hardware',
        'Heart',
        'Hierarchy',
        'Home',
        'Import',
        'Info',
        'Key',
        'Light',
        'Link',
        'Loading',
        'Lock',
        'LockCircle',
        'LockSlash',
        'Login',
        'Logout',
        'Menu',
        'MessageQuestion',
        'Messages',
        'MinusCircle',
        'Mobile',
        'Money',
        'Monitor',
        'MoreHorizontal',
        'MoreVertical',
        'Notification',
        'NotificationCircle',
        'PasswordCheck',
        'People',
        'PlusCircle',
        'Programming',
        'QrCode',
        'Question',
        'Received',
        'Refresh',
        'Save',
        'ScanBarcode',
        'ScanFocus',
        'Search',
        'Security',
        'SecurityCard',
        'SecurityCross',
        'SecurityKey',
        'SecuritySearch',
        'SecuritySlash',
        'SecurityTick',
        'SecurityTime',
        'SecurityUser',
        'Send1',
        'Send2',
        'Setting',
        'Slash',
        'SnapsMobile',
        'SpeedUp',
        'Star',
        'Swap',
        'SwapHorizontal',
        'SwapVertical',
        'Tag',
        'Tilde',
        'Timer',
        'Trash',
        'TrendDown',
        'TrendUp',
        'Twitter',
        'Upload',
        'Usb',
        'User',
        'UserAdd',
        'UserCheck',
        'UserCircle',
        'UserCircleAdd',
        'UserMinus',
        'UserRemove',
        'UserSearch',
        'UserTick',
        'Wallet',
        'WalletCard',
        'WalletMoney',
        'Warning',
      ];

      validIcons.forEach((iconName) => {
        if (Object.values(IconName).includes(iconName as IconName)) {
          expect(getIconName(iconName)).toBe(iconName);
        }
      });
    });
  });

  describe('formatUrl', () => {
    describe('valid URLs', () => {
      it('should extract hostname from https URLs', () => {
        expect(formatUrl('https://example.com')).toBe('example.com');
        expect(formatUrl('https://www.google.com')).toBe('www.google.com');
        expect(formatUrl('https://subdomain.example.com')).toBe(
          'subdomain.example.com',
        );
      });

      it('should extract hostname from http URLs', () => {
        expect(formatUrl('http://example.com')).toBe('example.com');
        expect(formatUrl('http://www.test.org')).toBe('www.test.org');
      });

      it('should extract hostname and ignore paths', () => {
        expect(formatUrl('https://example.com/path/to/page')).toBe(
          'example.com',
        );
        expect(formatUrl('https://api.github.com/users/username')).toBe(
          'api.github.com',
        );
        expect(formatUrl('http://localhost:3000/dashboard')).toBe('localhost');
      });

      it('should extract hostname and ignore query parameters', () => {
        expect(formatUrl('https://example.com?param=value')).toBe(
          'example.com',
        );
        expect(formatUrl('https://search.google.com?q=test&lang=en')).toBe(
          'search.google.com',
        );
        expect(
          formatUrl('http://example.com/path?param1=value1&param2=value2'),
        ).toBe('example.com');
      });

      it('should extract hostname and ignore fragments', () => {
        expect(formatUrl('https://example.com#section')).toBe('example.com');
        expect(formatUrl('https://docs.example.com/guide#installation')).toBe(
          'docs.example.com',
        );
      });

      it('should handle URLs with ports', () => {
        expect(formatUrl('https://example.com:8080')).toBe('example.com');
        expect(formatUrl('http://localhost:3000')).toBe('localhost');
        expect(formatUrl('https://api.example.com:443/v1/users')).toBe(
          'api.example.com',
        );
      });

      it('should handle complex URLs', () => {
        expect(
          formatUrl(
            'https://user:pass@example.com:8080/path?query=value#fragment',
          ),
        ).toBe('example.com');
        expect(
          formatUrl(
            'https://api.v2.example.com:443/users/123?include=profile&format=json',
          ),
        ).toBe('api.v2.example.com');
      });
    });

    describe('invalid URLs - fallback behavior', () => {
      it('should handle URLs without protocol using fallback', () => {
        expect(formatUrl('example.com')).toBe('example.com');
        expect(formatUrl('www.google.com')).toBe('www.google.com');
        expect(formatUrl('subdomain.example.org')).toBe(
          'subdomain.example.org',
        );
      });

      it('should handle URLs without protocol with paths using fallback', () => {
        expect(formatUrl('example.com/path/to/page')).toBe(
          'example.com/path/to/page',
        );
        expect(formatUrl('api.github.com/users')).toBe('api.github.com/users');
      });

      it('should handle URLs without protocol with query parameters using fallback', () => {
        expect(formatUrl('example.com?param=value')).toBe('example.com');
        expect(formatUrl('search.google.com?q=test&lang=en')).toBe(
          'search.google.com',
        );
        expect(formatUrl('example.com/path?param1=value1&param2=value2')).toBe(
          'example.com/path',
        );
      });

      it('should handle malformed URLs using fallback', () => {
        expect(formatUrl('not-a-url')).toBe('not-a-url');
        expect(formatUrl('just-text-here')).toBe('just-text-here');
        expect(formatUrl('ftp://example.com')).toBe('ftp://example.com');
      });

      it('should handle URLs with only protocol using fallback', () => {
        expect(formatUrl('https://')).toBe('');
        expect(formatUrl('http://')).toBe('');
      });
    });

    describe('edge cases', () => {
      it('should return empty string for empty input', () => {
        expect(formatUrl('')).toBe('');
      });

      it('should return empty string for whitespace-only input', () => {
        expect(formatUrl('   ')).toBe('');
        expect(formatUrl('\t\n')).toBe('');
      });

      it('should handle URLs with special characters', () => {
        expect(formatUrl('https://example-site.com')).toBe('example-site.com');
        expect(formatUrl('https://test_site.org')).toBe('test_site.org');
        expect(formatUrl('https://site123.net')).toBe('site123.net');
      });

      it('should handle international domain names', () => {
        expect(formatUrl('https://例え.テスト')).toBe('例え.テスト');
        expect(formatUrl('https://münchen.de')).toBe('münchen.de');
      });

      it('should handle URLs with backticks and spaces', () => {
        expect(formatUrl(' `https://例え.テスト` ')).toBe('例え.テスト');
        expect(formatUrl(' `https://münchen.de` ')).toBe('münchen.de');
        expect(formatUrl('  https://example.com  ')).toBe('example.com');
        expect(formatUrl('`https://example.com`')).toBe('example.com');
      });

      it('should handle very long URLs', () => {
        const longDomain =
          'very-long-subdomain-name-that-exceeds-normal-length.example.com';
        expect(formatUrl(`https://${longDomain}/very/long/path`)).toBe(
          longDomain,
        );
      });
    });

    describe('security considerations', () => {
      it('should handle non-http protocols safely', () => {
        expect(formatUrl('file:///etc/passwd')).toBe('file:///etc/passwd');
        expect(formatUrl('mailto:user@example.com')).toBe(
          'mailto:user@example.com',
        );
      });

      it('should handle URLs with encoded characters', () => {
        expect(formatUrl('https://example.com%2Fmalicious')).toBe(
          'example.com%2Fmalicious',
        );
        expect(formatUrl('https://example.com/path%20with%20spaces')).toBe(
          'example.com',
        );
      });
    });

    describe('real-world examples', () => {
      it('should handle common website URLs', () => {
        expect(formatUrl('https://www.github.com/user/repo')).toBe(
          'www.github.com',
        );
        expect(formatUrl('https://stackoverflow.com/questions/123456')).toBe(
          'stackoverflow.com',
        );
        expect(formatUrl('https://docs.google.com/document/d/abc123')).toBe(
          'docs.google.com',
        );
      });

      it('should handle API endpoints', () => {
        expect(formatUrl('https://api.twitter.com/v1/tweets')).toBe(
          'api.twitter.com',
        );
        expect(formatUrl('https://jsonplaceholder.typicode.com/posts/1')).toBe(
          'jsonplaceholder.typicode.com',
        );
      });

      it('should handle CDN URLs', () => {
        expect(
          formatUrl('https://cdn.jsdelivr.net/npm/package@1.0.0/dist/file.js'),
        ).toBe('cdn.jsdelivr.net');
        expect(formatUrl('https://unpkg.com/react@17.0.0/index.js')).toBe(
          'unpkg.com',
        );
      });
    });
  });
});
