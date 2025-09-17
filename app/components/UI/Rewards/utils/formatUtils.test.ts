/**
 * Unit tests for rewards formatting utilities
 */

import {
  formatRewardsDate,
  formatTimeRemaining,
  getEventDetails,
  PerpsEventType,
  formatNumber,
  getIconName,
} from './formatUtils';
import {
  PointsEventDto,
  PointsEventEarnType,
} from '../../../../core/Engine/controllers/rewards-controller/types';
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
      const timestamp = new Date('2024-01-15T14:30:00Z').getTime();

      const result = formatRewardsDate(timestamp);

      expect(result).toMatch(/Jan 15, \d{1,2}:\d{2} (AM|PM)/);
    });

    it('formats timestamp correctly with custom locale', () => {
      // Given a timestamp and custom locale
      const timestamp = new Date('2024-01-15T14:30:00Z').getTime();
      const locale = 'fr-FR';

      // When formatting the date
      const result = formatRewardsDate(timestamp, locale);

      // Then it should return formatted date in French locale
      expect(result).toMatch(/15 janv., \d{1,2}:\d{2}/);
    });
  });

  describe('getEventDetails', () => {
    const createMockEvent = (
      type: PointsEventDto['type'],
      payload: PointsEventDto['payload'] = null,
    ): PointsEventDto => {
      const baseEvent = {
        id: 'test-id',
        timestamp: new Date('2024-01-15T14:30:00Z'),
        value: 100,
        bonus: null,
        accountAddress: null,
      };

      switch (type) {
        case 'SWAP':
          return {
            ...baseEvent,
            type: 'SWAP' as const,
            payload: payload as (PointsEventDto & { type: 'SWAP' })['payload'],
          };
        case 'PERPS':
          return {
            ...baseEvent,
            type: 'PERPS' as const,
            payload: payload as (PointsEventDto & { type: 'PERPS' })['payload'],
          };
        default:
          return {
            ...baseEvent,
            type: type as PointsEventEarnType,
            payload: null,
          };
      }
    };

    describe('SWAP events', () => {
      it('returns correct details for SWAP event', () => {
        // Given a SWAP event
        const event = createMockEvent('SWAP', {
          srcAsset: {
            symbol: 'ETH',
            amount: '420000000000',
            decimals: 9,
            type: 'eip155:1/slip44:60',
          },
          destAsset: {
            symbol: 'USDC',
            amount: '1000000',
            decimals: 6,
            type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          },
        });

        // When getting event details
        const result = getEventDetails(event);

        // Then it should return swap details
        expect(result).toEqual({
          title: 'Swap',
          details: '420 ETH to USDC',
          icon: IconName.SwapVertical,
        });
      });
    });

    describe('PERPS events', () => {
      it('returns correct details for perps OPEN_POSITION long event', () => {
        // Given a PERPS OPEN_POSITION event
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.OPEN_POSITION,
          direction: 'LONG',
          asset: {
            symbol: 'ETH',
            amount: '1000000000000000000', // 1 ETH with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
        });

        // When getting event details
        const result = getEventDetails(event);

        // Then it should return perps details
        expect(result).toEqual({
          title: 'Opened position',
          details: 'Long 1 ETH',
          icon: IconName.Candlestick,
        });
      });

      it('returns correct details for perps OPEN_POSITION short event', () => {
        // Given a PERPS OPEN_POSITION SHORT event
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.OPEN_POSITION,
          direction: 'SHORT',
          asset: {
            symbol: 'BTC',
            amount: '500000000000000000', // 0.5 BTC with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:0',
          },
        });

        // When getting event details
        const result = getEventDetails(event);

        // Then it should return perps details
        expect(result).toEqual({
          title: 'Opened position',
          details: 'Short 0.5 BTC',
          icon: IconName.Candlestick,
        });
      });

      it('returns correct details for perps CLOSE_POSITION event', () => {
        // Given a PERPS CLOSE_POSITION event
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.CLOSE_POSITION,
          asset: {
            symbol: 'ETH',
            amount: '1000000000000000000', // 1 ETH with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
        });

        // When getting event details
        const result = getEventDetails(event);

        // Then it should return perps details
        expect(result).toEqual({
          title: 'Closed position',
          details: '$ETH 1',
          icon: IconName.Candlestick,
        });
      });

      it('returns correct details for PERPS TAKE_PROFIT event', () => {
        // Given a PERPS TAKE_PROFIT event
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.TAKE_PROFIT,
          asset: {
            symbol: 'BTC',
            amount: '250000000000000000', // 0.25 BTC with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:0',
          },
        });

        // When getting event details
        const result = getEventDetails(event);

        // Then it should return perps details
        expect(result).toEqual({
          title: 'Take profit',
          details: '$BTC 0.25',
          icon: IconName.Candlestick,
        });
      });

      it('returns correct details for PERPS STOP_LOSS event', () => {
        // Given a PERPS STOP_LOSS event
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.STOP_LOSS,
          asset: {
            symbol: 'ETH',
            amount: '500000000000000000', // 0.5 ETH with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
        });

        // When getting event details
        const result = getEventDetails(event);

        // Then it should return perps details
        expect(result).toEqual({
          title: 'Stop loss',
          details: '$ETH 0.5',
          icon: IconName.Candlestick,
        });
      });

      it('returns undefined details for PERPS event with invalid payload', () => {
        // Given a PERPS event with invalid payload
        const event = createMockEvent('PERPS', {
          type: 'INVALID_TYPE' as PerpsEventType,
          asset: {
            symbol: 'ETH',
            amount: '1000000000000000000',
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
        });

        // When getting event details
        const result = getEventDetails(event);

        // Then it should return undefined details
        expect(result).toEqual({
          title: 'Uncategorized event',
          details: undefined,
          icon: IconName.Candlestick,
        });
      });

      it('returns undefined details for PERPS event with undefined asset decimals', () => {
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.OPEN_POSITION,
          direction: 'LONG',
          asset: {
            symbol: 'ETH',
            amount: '1000000000000000000',
            decimals: undefined as unknown as number,
            type: 'eip155:1/slip44:60',
          },
        });

        const result = getEventDetails(event);

        expect(result).toEqual({
          title: 'Opened position',
          details: undefined,
          icon: IconName.Candlestick,
        });
      });
    });

    describe('REFERRAL events', () => {
      it('returns correct details for REFERRAL event', () => {
        const event = createMockEvent('REFERRAL');

        const result = getEventDetails(event);

        expect(result).toEqual({
          title: 'Referral action',
          details: undefined,
          icon: IconName.UserCircleAdd,
        });
      });
    });

    describe('SIGN_UP_BONUS events', () => {
      it('returns correct details for SIGN_UP_BONUS event', () => {
        const event = createMockEvent('SIGN_UP_BONUS');

        const result = getEventDetails(event);

        expect(result).toEqual({
          title: 'Sign up bonus',
          details: undefined,
          icon: IconName.Edit,
        });
      });
    });

    describe('LOYALTY_BONUS events', () => {
      it('returns correct details for LOYALTY_BONUS event', () => {
        const event = createMockEvent('LOYALTY_BONUS');

        const result = getEventDetails(event);

        expect(result).toEqual({
          title: 'Loyalty bonus',
          details: undefined,
          icon: IconName.ThumbUp,
        });
      });
    });

    describe('ONE_TIME_BONUS events', () => {
      it('returns correct details for ONE_TIME_BONUS event', () => {
        const event = createMockEvent('ONE_TIME_BONUS');

        const result = getEventDetails(event);

        expect(result).toEqual({
          title: 'One-time bonus',
          details: undefined,
          icon: IconName.Gift,
        });
      });
    });

    describe('unknown event types', () => {
      it('returns uncategorized event details for unknown type', () => {
        const event = createMockEvent('UNKNOWN_TYPE' as PointsEventDto['type']);

        const result = getEventDetails(event);

        expect(result).toEqual({
          title: 'Uncategorized event',
          details: undefined,
          icon: IconName.Star,
        });
      });
    });

    describe('edge cases', () => {
      it('handles PERPS event with zero amount', () => {
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.OPEN_POSITION,
          direction: 'LONG',
          asset: {
            symbol: 'ETH',
            amount: '0',
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
        });

        const result = getEventDetails(event);

        expect(result).toEqual({
          title: 'Opened position',
          details: 'Long 0 ETH',
          icon: IconName.Candlestick,
        });
      });

      it('handles PERPS event with very large amount', () => {
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.OPEN_POSITION,
          direction: 'LONG',
          asset: {
            symbol: 'ETH',
            amount: '1000000000000000000000000', // 1,000,000 ETH with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
        });

        const result = getEventDetails(event);

        expect(result).toEqual({
          title: 'Opened position',
          details: 'Long 1000000 ETH',
          icon: IconName.Candlestick,
        });
      });

      it('handles PERPS event with decimal result', () => {
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.OPEN_POSITION,
          direction: 'LONG',
          asset: {
            symbol: 'ETH',
            amount: '1500000000000000000', // 1.5 ETH with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
        });

        const result = getEventDetails(event);

        expect(result).toEqual({
          title: 'Opened position',
          details: 'Long 1.5 ETH',
          icon: IconName.Candlestick,
        });
      });
    });
  });

  describe('formatTimeRemaining', () => {
    it('should return formatted time with days and hours when hours > 0', () => {
      // Given: 2 days, 5 hours, 30 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 2,
        hours: 5,
        minutes: 30,
      });

      const endDate = new Date('2024-12-31T23:59:59Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days and hours format
      expect(result).toBe('2d 5h');
      expect(mockGetTimeDifferenceFromNow).toHaveBeenCalledWith(
        endDate.getTime(),
      );
    });

    it('should return formatted time with only minutes when hours = 0 and minutes > 0', () => {
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

    it('should return null when both hours and minutes are 0', () => {
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

    it('should return null when minutes are negative (past date)', () => {
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

    it('should handle edge case with 0 days, 1 hour, 0 minutes', () => {
      // Given: exactly 1 hour remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 1,
        minutes: 0,
      });

      const endDate = new Date('2024-01-01T13:00:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days and hours format
      expect(result).toBe('0d 1h');
    });

    it('should handle large time differences correctly', () => {
      // Given: 365 days, 23 hours, 59 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 365,
        hours: 23,
        minutes: 59,
      });

      const endDate = new Date('2025-01-01T23:59:59Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days and hours format
      expect(result).toBe('365d 23h');
    });

    it('should handle single digit values correctly', () => {
      // Given: 1 day, 1 hour, 1 minute remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 1,
        hours: 1,
        minutes: 1,
      });

      const endDate = new Date('2024-01-02T13:01:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days and hours format without padding
      expect(result).toBe('1d 1h');
    });

    it('should prioritize hours over minutes when hours > 0', () => {
      // Given: 0 days, 2 hours, 59 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 2,
        minutes: 59,
      });

      const endDate = new Date('2024-01-01T14:59:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days and hours format (ignoring minutes)
      expect(result).toBe('0d 2h');
    });

    it('should handle exactly 1 minute remaining', () => {
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

    it('should handle zero days with hours correctly', () => {
      // Given: 0 days, 12 hours, 30 minutes remaining
      mockGetTimeDifferenceFromNow.mockReturnValue({
        days: 0,
        hours: 12,
        minutes: 30,
      });

      const endDate = new Date('2024-01-02T00:30:00Z');

      // When: formatting time remaining
      const result = formatTimeRemaining(endDate);

      // Then: should return days and hours format with 0 days
      expect(result).toBe('0d 12h');
    });

    it('should call getTimeDifferenceFromNow with correct timestamp', () => {
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
});
