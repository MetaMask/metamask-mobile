import { IconName } from '@metamask/design-system-react-native';
import TEST_ADDRESS from '../../../../constants/address';
import {
  PointsEventDto,
  PointsEventEarnType,
  SwapEventPayload,
  SeasonActivityTypeDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { PerpsEventType } from './eventConstants';
import {
  getEventDetails,
  formatAssetAmount,
  hasValidAsset,
  getPerpsEventDirection,
  formatSwapDetails,
} from './eventDetailsUtils';

// Mock i18n strings
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    const t: Record<string, string> = {
      'rewards.events.to': 'to',
      'rewards.events.type.swap': 'Swap',
      'rewards.events.type.card_spend': 'Card spend',
      'rewards.events.type.referral_action': 'Referral action',
      'rewards.events.type.sign_up_bonus': 'Sign up bonus',
      'rewards.events.type.loyalty_bonus': 'Loyalty bonus',
      'rewards.events.type.one_time_bonus': 'One-time bonus',
      'rewards.events.type.open_position': 'Opened position',
      'rewards.events.type.close_position': 'Closed position',
      'rewards.events.type.take_profit': 'Take profit',
      'rewards.events.type.stop_loss': 'Stop loss',
      'rewards.events.type.predict': 'Prediction',
      'rewards.events.type.musd_deposit': 'mUSD deposit',
      'rewards.events.musd_deposit_for': 'For {{date}}',
      'rewards.events.type.uncategorized_event': 'Uncategorized event',
      'perps.market.long': 'Long',
      'perps.market.short': 'Short',
    };
    const template = t[key] || key;
    if (params && template.includes('{{date}}')) {
      return template.replace('{{date}}', params.date || '');
    }
    return template;
  }),
  default: {
    locale: 'en-US',
  },
}));

// Mock formatUtils
jest.mock('./formatUtils', () => {
  const { IconName: IconEnum } = jest.requireActual(
    '@metamask/design-system-react-native',
  );
  return {
    formatNumber: jest.fn((value: number) => value.toString()),
    formatRewardsMusdDepositPayloadDate: jest.fn(
      (isoDate: string | undefined) => {
        if (
          !isoDate ||
          typeof isoDate !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)
        ) {
          return null;
        }
        const date = new Date(`${isoDate}T00:00:00Z`);
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }).format(date);
      },
    ),
    resolveTemplate: jest.fn(
      (template: string, values: Record<string, string>) =>
        template.replace(/\$\{(\w+)\}/g, (match, placeholder) => {
          const value = values[placeholder as keyof typeof values];
          return value !== undefined ? String(value) : match;
        }),
    ),
    getIconName: jest.fn((name: string) => {
      const map: Record<string, (typeof IconEnum)[keyof typeof IconEnum]> = {
        Star: IconEnum.Star,
        ArrowDown: IconEnum.ArrowDown,
        ArrowUp: IconEnum.ArrowUp,
        ArrowRight: IconEnum.ArrowRight,
        Lock: IconEnum.Lock,
        Gift: IconEnum.Gift,
        Edit: IconEnum.Edit,
        ThumbUp: IconEnum.ThumbUp,
        Speedometer: IconEnum.Speedometer,
        Coin: IconEnum.Coin,
        Card: IconEnum.Card,
        Candlestick: IconEnum.Candlestick,
        SwapVertical: IconEnum.SwapVertical,
        UserCircleAdd: IconEnum.UserCircleAdd,
      };
      return map[name] ?? IconEnum.Star;
    }),
  };
});

describe('eventDetailsUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatAssetAmount', () => {
    it('formats asset amount with proper decimals', () => {
      // Given an amount and decimals
      const amount = '1000000000000000000'; // 1 ETH with 18 decimals
      const decimals = 18;

      // When formatting the asset amount
      const result = formatAssetAmount(amount, decimals);

      // Then it should return the formatted amount
      expect(result).toBe('1');
    });

    it('formats asset amount with decimal places', () => {
      // Given an amount with decimal places
      const amount = '1500000000000000000'; // 1.5 ETH with 18 decimals
      const decimals = 18;

      // When formatting the asset amount
      const result = formatAssetAmount(amount, decimals);

      // Then it should return the formatted amount with decimals
      expect(result).toBe('1.5');
    });

    it('formats asset amount with many decimal places and rounds to 5', () => {
      // Given an amount with many decimal places
      const amount = '1234560000000000000'; // 1.23456 ETH with 18 decimals
      const decimals = 18;

      // When formatting the asset amount
      const result = formatAssetAmount(amount, decimals);

      // Then it should round to 5 decimal places
      expect(result).toBe('1.23456');
    });

    it('formats asset amount with 6 decimals', () => {
      // Given an amount with 6 decimals (like USDC)
      const amount = '1000000'; // 1 USDC with 6 decimals
      const decimals = 6;

      // When formatting the asset amount
      const result = formatAssetAmount(amount, decimals);

      // Then it should return the formatted amount
      expect(result).toBe('1');
    });

    it('formats zero amount', () => {
      // Given a zero amount
      const amount = '0';
      const decimals = 18;

      // When formatting the asset amount
      const result = formatAssetAmount(amount, decimals);

      // Then it should return zero
      expect(result).toBe('0');
    });
  });

  describe('hasValidAsset', () => {
    it('returns true for valid asset with all properties', () => {
      // Given a valid asset
      const asset = {
        amount: '1000000000000000000',
        decimals: 18,
        symbol: 'ETH',
        type: 'eip155:1/slip44:60',
      };

      // When checking if asset is valid
      const result = hasValidAsset(asset);

      // Then it should return true
      expect(result).toBe(true);
    });

    it('returns false for undefined asset', () => {
      // Given an undefined asset
      const asset = undefined;

      // When checking if asset is valid
      const result = hasValidAsset(asset);

      // Then it should return false
      expect(result).toBe(false);
    });

    it('returns false for asset with undefined amount', () => {
      // Given an asset with undefined amount
      const asset = {
        amount: undefined,
        decimals: 18,
        symbol: 'ETH',
        type: 'eip155:1/slip44:60',
      };

      // When checking if asset is valid
      // @ts-expect-error - We are testing the function with undefined amount
      const result = hasValidAsset(asset);

      // Then it should return false
      expect(result).toBe(false);
    });

    it('returns false for asset with undefined decimals', () => {
      // Given an asset with undefined decimals
      const asset = {
        amount: '1000000000000000000',
        decimals: undefined,
        symbol: 'ETH',
        type: 'eip155:1/slip44:60',
      };

      // When checking if asset is valid
      // @ts-expect-error - We are testing the function with undefined decimals
      const result = hasValidAsset(asset);

      // Then it should return false
      expect(result).toBe(false);
    });

    it('returns false for asset with undefined symbol', () => {
      // Given an asset with undefined symbol
      const asset = {
        amount: '1000000000000000000',
        decimals: 18,
        symbol: undefined,
        type: 'eip155:1/slip44:60',
      };

      // When checking if asset is valid
      const result = hasValidAsset(asset);

      // Then it should return false
      expect(result).toBe(false);
    });
  });

  describe('getPerpsEventDirection', () => {
    it('returns "Long" for LONG direction', () => {
      // Given a LONG direction
      const direction = 'LONG';

      // When getting the direction text
      const result = getPerpsEventDirection(direction);

      // Then it should return "Long"
      expect(result).toBe('Long');
    });

    it('returns "Short" for SHORT direction', () => {
      // Given a SHORT direction
      const direction = 'SHORT';

      // When getting the direction text
      const result = getPerpsEventDirection(direction);

      // Then it should return "Short"
      expect(result).toBe('Short');
    });

    it('returns undefined for unknown direction', () => {
      // Given an unknown direction
      const direction = 'UNKNOWN';

      // When getting the direction text
      const result = getPerpsEventDirection(direction);

      // Then it should return undefined
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty direction', () => {
      // Given an empty direction
      const direction = '';

      // When getting the direction text
      const result = getPerpsEventDirection(direction);

      // Then it should return undefined
      expect(result).toBeUndefined();
    });
  });

  describe('formatSwapDetails', () => {
    const createMockSwapPayload = (
      overrides: Partial<SwapEventPayload> = {},
    ) => ({
      srcAsset: {
        amount: '1000000000000000000', // 1 ETH with 18 decimals
        decimals: 18,
        symbol: 'ETH',
        type: 'eip155:1/slip44:60',
      },
      destAsset: {
        amount: '1000000', // 1 USDC with 6 decimals
        decimals: 6,
        symbol: 'USDC',
        type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      },
      ...overrides,
    });

    it('formats swap details with source asset only', () => {
      // Given a swap payload with valid source asset
      const payload = createMockSwapPayload();

      // When formatting swap details without destination amount
      const result = formatSwapDetails(payload, false);

      // Then it should return formatted source asset with destination symbol
      expect(result).toBe('1 ETH to USDC');
    });

    it('formats swap details with both source and destination amounts', () => {
      // Given a swap payload with valid source and destination assets
      const payload = createMockSwapPayload();

      // When formatting swap details with destination amount
      const result = formatSwapDetails(payload, true);

      // Then it should return formatted both assets
      expect(result).toBe('1 ETH to 1 USDC');
    });

    it('formats swap details with source asset only when destAsset is undefined', () => {
      // Given a swap payload with undefined destination asset
      const payload = createMockSwapPayload({
        destAsset: undefined,
      });

      // When formatting swap details
      const result = formatSwapDetails(payload, false);

      // Then it should return only source asset
      expect(result).toBe('1 ETH');
    });

    it('formats swap details with source asset only when destAsset has no symbol', () => {
      // Given a swap payload with destination asset missing symbol
      const payload = createMockSwapPayload({
        destAsset: {
          amount: '1000000',
          decimals: 6,
          symbol: undefined,
          type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        },
      });

      // When formatting swap details
      const result = formatSwapDetails(payload, false);

      // Then it should return only source asset
      expect(result).toBe('1 ETH');
    });

    it('returns undefined when source asset is invalid', () => {
      // Given a swap payload with invalid source asset
      const payload = createMockSwapPayload({
        srcAsset: {
          // @ts-expect-error - We are testing the function with undefined amount
          amount: undefined,
          decimals: 18,
          symbol: 'ETH',
          type: 'eip155:1/slip44:60',
        },
      });

      // When formatting swap details
      const result = formatSwapDetails(payload, false);

      // Then it should return undefined
      expect(result).toBeUndefined();
    });

    it('returns undefined when source asset is missing', () => {
      // Given a swap payload with missing source asset
      const payload = createMockSwapPayload({
        srcAsset: undefined,
      });

      // When formatting swap details
      const result = formatSwapDetails(payload, false);

      // Then it should return undefined
      expect(result).toBeUndefined();
    });

    it('formats swap details without destination amount when destAsset is invalid', () => {
      // Given a swap payload with invalid destination asset
      const payload = createMockSwapPayload({
        destAsset: {
          // @ts-expect-error - We are testing the function with undefined amount
          amount: undefined,
          decimals: 6,
          symbol: 'USDC',
          type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        },
      });

      // When formatting swap details with destination amount
      const result = formatSwapDetails(payload, true);

      // Then it should return only source asset with destination symbol
      expect(result).toBe('1 ETH to USDC');
    });

    it('formats swap details without destination amount when destAsset is missing', () => {
      // Given a swap payload with missing destination asset
      const payload = createMockSwapPayload({
        destAsset: undefined,
      });

      // When formatting swap details with destination amount
      const result = formatSwapDetails(payload, true);

      // Then it should return only source asset
      expect(result).toBe('1 ETH');
    });

    it('formats swap details with decimal amounts', () => {
      // Given a swap payload with decimal amounts
      const payload = createMockSwapPayload({
        srcAsset: {
          amount: '1500000000000000000', // 1.5 ETH with 18 decimals
          decimals: 18,
          symbol: 'ETH',
          type: 'eip155:1/slip44:60',
        },
        destAsset: {
          amount: '2500000', // 2.5 USDC with 6 decimals
          decimals: 6,
          symbol: 'USDC',
          type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        },
      });

      // When formatting swap details with destination amount
      const result = formatSwapDetails(payload, true);

      // Then it should return formatted decimal amounts
      expect(result).toBe('1.5 ETH to 2.5 USDC');
    });

    it('formats swap details with large amounts', () => {
      // Given a swap payload with large amounts
      const payload = createMockSwapPayload({
        srcAsset: {
          amount: '1000000000000000000000000', // 1,000,000 ETH with 18 decimals
          decimals: 18,
          symbol: 'ETH',
          type: 'eip155:1/slip44:60',
        },
        destAsset: {
          amount: '1000000000000', // 1,000,000 USDC with 6 decimals
          decimals: 6,
          symbol: 'USDC',
          type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        },
      });

      // When formatting swap details with destination amount
      const result = formatSwapDetails(payload, true);

      // Then it should return formatted large amounts with thousand separators
      expect(result).toBe('1,000,000 ETH to 1,000,000 USDC');
    });

    it('formats swap details with zero amounts', () => {
      // Given a swap payload with zero amounts
      const payload = createMockSwapPayload({
        srcAsset: {
          amount: '0',
          decimals: 18,
          symbol: 'ETH',
          type: 'eip155:1/slip44:60',
        },
        destAsset: {
          amount: '0',
          decimals: 6,
          symbol: 'USDC',
          type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        },
      });

      // When formatting swap details with destination amount
      const result = formatSwapDetails(payload, true);

      // Then it should return formatted zero amounts
      expect(result).toBe('0 ETH to 0 USDC');
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
        accountAddress: TEST_ADDRESS,
        updatedAt: new Date('2024-01-15T14:30:00Z'),
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
        case 'CARD':
          return {
            ...baseEvent,
            type: 'CARD' as const,
            payload: payload as (PointsEventDto & { type: 'CARD' })['payload'],
          };
        case 'PREDICT':
          return {
            ...baseEvent,
            type: 'PREDICT' as const,
            payload: null,
          };
        case 'MUSD_DEPOSIT':
          return {
            ...baseEvent,
            type: 'MUSD_DEPOSIT' as const,
            payload: payload as (PointsEventDto & {
              type: 'MUSD_DEPOSIT';
            })['payload'],
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
        const result = getEventDetails(event, [], TEST_ADDRESS);

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
        const result = getEventDetails(event, [], TEST_ADDRESS);

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
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return perps details
        expect(result).toEqual({
          title: 'Opened position',
          details: 'Short 0.5 BTC',
          icon: IconName.Candlestick,
        });
      });

      it('returns correct details for perps CLOSE_POSITION event with zero amount', () => {
        // Given a PERPS CLOSE_POSITION event
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.CLOSE_POSITION,
          asset: {
            symbol: 'ETH',
            amount: '0',
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
          pnl: '0',
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return perps details
        expect(result).toEqual({
          title: 'Closed position',
          details: '0 ETH',
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
          pnl: '100',
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return perps details
        expect(result).toEqual({
          title: 'Take profit',
          details: '0.25 BTC',
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
          pnl: '100',
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return perps details
        expect(result).toEqual({
          title: 'Stop loss',
          details: '0.5 ETH',
          icon: IconName.Candlestick,
        });
      });

      it('returns correct details for PERPS STOP_LOSS event with low amount', () => {
        // Given a PERPS STOP_LOSS event
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.STOP_LOSS,
          asset: {
            symbol: 'ETH',
            amount: '4006000000000000', // 0.5 ETH with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
          pnl: '100',
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return perps details
        expect(result).toEqual({
          title: 'Stop loss',
          details: '0.00401 ETH',
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
        const result = getEventDetails(event, [], TEST_ADDRESS);

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

        const result = getEventDetails(event, [], TEST_ADDRESS);

        expect(result).toEqual({
          title: 'Opened position',
          details: undefined,
          icon: IconName.Candlestick,
        });
      });
    });

    describe('CARD events', () => {
      it('returns correct details for CARD event with whole number amount', () => {
        // Given a CARD event with amount
        const event = createMockEvent('CARD', {
          asset: {
            amount: '43000000',
            type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC',
          },
          txHash: '0x123...',
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return card spend details
        expect(result).toEqual({
          title: 'Card spend',
          details: '43 USDC',
          icon: IconName.Card,
        });
      });

      it('returns correct details for CARD event with decimal amount', () => {
        // Given a CARD event with decimal amount
        const event = createMockEvent('CARD', {
          asset: {
            amount: '43250000',
            type: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            decimals: 6,
            name: 'USD Coin',
            symbol: 'USDC',
          },
          txHash: '0xabc123def456789012345678901234567890abcd',
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return card spend details with decimals
        expect(result).toEqual({
          title: 'Card spend',
          details: '43.25 USDC',
          icon: IconName.Card,
        });
      });

      it('returns undefined details for CARD event without payload', () => {
        // Given a CARD event without payload
        const event = createMockEvent('CARD', null);

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return card spend title with undefined details
        expect(result).toEqual({
          title: 'Card spend',
          details: undefined,
          icon: IconName.Card,
        });
      });
    });

    describe('REFERRAL events', () => {
      it('returns correct details for REFERRAL event', () => {
        const event = createMockEvent('REFERRAL');

        const result = getEventDetails(event, [], TEST_ADDRESS);

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

        const result = getEventDetails(event, [], TEST_ADDRESS);

        expect(result).toEqual({
          title: 'Sign up bonus',
          details: TEST_ADDRESS,
          icon: IconName.Edit,
        });
      });

      it('returns empty details when account name is not provided', () => {
        const event = createMockEvent('SIGN_UP_BONUS');

        const result = getEventDetails(event, [], undefined);

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

        const result = getEventDetails(event, [], TEST_ADDRESS);

        expect(result).toEqual({
          title: 'Loyalty bonus',
          details: TEST_ADDRESS,
          icon: IconName.ThumbUp,
        });
      });
    });

    describe('ONE_TIME_BONUS events', () => {
      it('returns correct details for ONE_TIME_BONUS event', () => {
        const event = createMockEvent('ONE_TIME_BONUS');

        const result = getEventDetails(event, [], TEST_ADDRESS);

        expect(result).toEqual({
          title: 'One-time bonus',
          details: undefined,
          icon: IconName.Gift,
        });
      });
    });

    describe('PREDICT events', () => {
      it('returns correct details for PREDICT event', () => {
        const event = createMockEvent('PREDICT');

        const result = getEventDetails(event, [], TEST_ADDRESS);

        expect(result).toEqual({
          title: 'Prediction',
          details: undefined,
          icon: IconName.Speedometer,
        });
      });
    });

    describe('MUSD_DEPOSIT events', () => {
      it('returns correct details for MUSD_DEPOSIT event with date', () => {
        // Given a MUSD_DEPOSIT event with a date
        const event = createMockEvent('MUSD_DEPOSIT', {
          date: '2025-01-15',
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return mUSD deposit details with formatted date
        expect(result).toEqual({
          title: 'mUSD deposit',
          details: 'For Jan 15, 2025',
          icon: IconName.Coin,
        });
      });

      it('returns correct details for MUSD_DEPOSIT event with different date format', () => {
        // Given a MUSD_DEPOSIT event with a different date
        const event = createMockEvent('MUSD_DEPOSIT', {
          date: '2025-11-11',
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return mUSD deposit details with formatted date
        expect(result).toEqual({
          title: 'mUSD deposit',
          details: 'For Nov 11, 2025',
          icon: IconName.Coin,
        });
      });

      it('returns undefined details for MUSD_DEPOSIT event without payload', () => {
        // Given a MUSD_DEPOSIT event without payload
        const event = createMockEvent('MUSD_DEPOSIT', null);

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return mUSD deposit title with undefined details
        expect(result).toEqual({
          title: 'mUSD deposit',
          details: undefined,
          icon: IconName.Coin,
        });
      });

      it('returns undefined details for MUSD_DEPOSIT event with payload but no date', () => {
        // Given a MUSD_DEPOSIT event with payload but no date
        const event = createMockEvent('MUSD_DEPOSIT', {
          // @ts-expect-error - We are testing the function with undefined date
          date: undefined,
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return mUSD deposit title with undefined details
        expect(result).toEqual({
          title: 'mUSD deposit',
          details: undefined,
          icon: IconName.Coin,
        });
      });

      it('returns undefined details for MUSD_DEPOSIT event with date that is not a string', () => {
        // Given a MUSD_DEPOSIT event with date that is not a string
        const event = createMockEvent('MUSD_DEPOSIT', {
          // @ts-expect-error - We are testing the function with non-string date
          date: 20250115,
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return mUSD deposit title with undefined details
        expect(result).toEqual({
          title: 'mUSD deposit',
          details: undefined,
          icon: IconName.Coin,
        });
      });

      it('returns undefined details for MUSD_DEPOSIT event with date that does not match YYYY-MM-DD format', () => {
        // Given a MUSD_DEPOSIT event with date in wrong format
        const event = createMockEvent('MUSD_DEPOSIT', {
          date: '2025-1-15', // Missing leading zero in month
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return mUSD deposit title with undefined details
        expect(result).toEqual({
          title: 'mUSD deposit',
          details: undefined,
          icon: IconName.Coin,
        });
      });

      it('returns undefined details for MUSD_DEPOSIT event with date in ISO format with time', () => {
        // Given a MUSD_DEPOSIT event with date in ISO format with time
        const event = createMockEvent('MUSD_DEPOSIT', {
          date: '2025-01-15T00:00:00Z', // ISO format with time
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return mUSD deposit title with undefined details
        expect(result).toEqual({
          title: 'mUSD deposit',
          details: undefined,
          icon: IconName.Coin,
        });
      });

      it('returns undefined details for MUSD_DEPOSIT event with invalid date string', () => {
        // Given a MUSD_DEPOSIT event with invalid date string
        const event = createMockEvent('MUSD_DEPOSIT', {
          date: 'invalid-date',
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return mUSD deposit title with undefined details
        expect(result).toEqual({
          title: 'mUSD deposit',
          details: undefined,
          icon: IconName.Coin,
        });
      });

      it('returns undefined details for MUSD_DEPOSIT event with empty date string', () => {
        // Given a MUSD_DEPOSIT event with empty date string
        const event = createMockEvent('MUSD_DEPOSIT', {
          date: '',
        });

        // When getting event details
        const result = getEventDetails(event, [], TEST_ADDRESS);

        // Then it should return mUSD deposit title with undefined details
        expect(result).toEqual({
          title: 'mUSD deposit',
          details: undefined,
          icon: IconName.Coin,
        });
      });
    });

    describe('unknown event types', () => {
      it('returns uncategorized event details for unknown type', () => {
        const event = createMockEvent('UNKNOWN_TYPE' as PointsEventDto['type']);

        const result = getEventDetails(event, [], TEST_ADDRESS);

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

        const result = getEventDetails(event, [], TEST_ADDRESS);

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

        const result = getEventDetails(event, [], TEST_ADDRESS);

        expect(result).toEqual({
          title: 'Opened position',
          details: 'Long 1,000,000 ETH',
          icon: IconName.Candlestick,
        });
      });

      it('handles PERPS event with decimal result (1.5 should display as 1.5, not 1.50)', () => {
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

        const result = getEventDetails(event, [], TEST_ADDRESS);

        expect(result).toEqual({
          title: 'Opened position',
          details: 'Long 1.5 ETH',
          icon: IconName.Candlestick,
        });
      });

      it('formats PERPS event amounts to at most 5 decimal places (0.012345 should display as 0.01235)', () => {
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.OPEN_POSITION,
          direction: 'LONG',
          asset: {
            symbol: 'ETH',
            amount: '12345600000000000', // 0.0123456 ETH with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
        });

        const result = getEventDetails(event, [], TEST_ADDRESS);

        expect(result).toEqual({
          title: 'Opened position',
          details: 'Long 0.01235 ETH',
          icon: IconName.Candlestick,
        });
      });

      it('formats whole numbers without decimal places (50 should display as 50, not 50.00)', () => {
        const event = createMockEvent('PERPS', {
          type: PerpsEventType.OPEN_POSITION,
          direction: 'LONG',
          asset: {
            symbol: 'ETH',
            amount: '50000000000000000000', // 50 ETH with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
        });

        const result = getEventDetails(event, [], TEST_ADDRESS);

        expect(result).toEqual({
          title: 'Opened position',
          details: 'Long 50 ETH',
          icon: IconName.Candlestick,
        });
      });

      it('formats SWAP event amounts to at most 5 decimal places', () => {
        const event = createMockEvent('SWAP', {
          srcAsset: {
            symbol: 'ETH',
            amount: '1234560000000000000', // 1.23456 ETH with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
          destAsset: {
            symbol: 'USDC',
            amount: '2000000000', // 2000 USDC with 6 decimals
            decimals: 6,
            type: 'eip155:1/slip44:60',
          },
        });

        const result = getEventDetails(event, [], TEST_ADDRESS);

        expect(result).toEqual({
          title: 'Swap',
          details: '1.23456 ETH to USDC',
          icon: IconName.SwapVertical,
        });
      });

      it('formats SWAP event with whole numbers without decimal places (50 should display as 50, not 50.00)', () => {
        const event = createMockEvent('SWAP', {
          srcAsset: {
            symbol: 'ETH',
            amount: '50000000000000000000', // 50 ETH with 18 decimals
            decimals: 18,
            type: 'eip155:1/slip44:60',
          },
          destAsset: {
            symbol: 'USDC',
            amount: '100000000', // 100 USDC with 6 decimals
            decimals: 6,
            type: 'eip155:1/slip44:60',
          },
        });

        const result = getEventDetails(event, [], TEST_ADDRESS);

        expect(result).toEqual({
          title: 'Swap',
          details: '50 ETH to USDC',
          icon: IconName.SwapVertical,
        });
      });
    });
  });

  describe('Custom activity types', () => {
    const CUSTOM_TYPE = 'CUSTOM_ACTION' as PointsEventDto['type'];

    const makeCustomActivity = (
      icon: string,
      description: string = 'Custom description',
    ): SeasonActivityTypeDto => ({
      type: CUSTOM_TYPE as unknown as PointsEventEarnType,
      title: 'Custom Title',
      description,
      icon,
    });

    const makeEvent = (): PointsEventDto => ({
      id: 'custom-id',
      timestamp: new Date('2024-02-01T00:00:00Z'),
      value: 5,
      bonus: null,
      accountAddress: TEST_ADDRESS,
      updatedAt: new Date('2024-02-01T00:00:00Z'),
      type: CUSTOM_TYPE as PointsEventEarnType,
      payload: null,
    });

    it('uses custom title, description, and icon when activityTypes provides a match', () => {
      const activityTypes: SeasonActivityTypeDto[] = [
        makeCustomActivity('Lock'),
      ];
      const event = makeEvent();

      const result = getEventDetails(event, activityTypes, TEST_ADDRESS);

      expect(result).toEqual({
        title: 'Custom Title',
        details: 'Custom description',
        icon: IconName.Lock,
      });
    });

    it('falls back to Star icon when provided invalid icon name', () => {
      const activityTypes: SeasonActivityTypeDto[] = [
        makeCustomActivity('NotARealIcon'),
      ];
      const event = makeEvent();

      const result = getEventDetails(event, activityTypes, TEST_ADDRESS);

      expect(result).toEqual({
        title: 'Custom Title',
        details: 'Custom description',
        icon: IconName.Star,
      });
    });

    it('returns uncategorized event when no matching activity type is found', () => {
      const activityTypes: SeasonActivityTypeDto[] = [
        // Different type that should not match
        {
          type: 'OTHER_ACTION' as unknown as PointsEventEarnType,
          title: 'Other',
          description: 'Other desc',
          icon: 'Gift',
        },
      ];
      const event = makeEvent();

      const result = getEventDetails(event, activityTypes, TEST_ADDRESS);

      expect(result).toEqual({
        title: 'Uncategorized event',
        details: undefined,
        icon: IconName.Star,
      });
    });

    it('preserves empty description value when provided by activityTypes', () => {
      const activityTypes: SeasonActivityTypeDto[] = [
        makeCustomActivity('ArrowDown', ''),
      ];
      const event = makeEvent();

      const result = getEventDetails(event, activityTypes, TEST_ADDRESS);

      expect(result).toEqual({
        title: 'Custom Title',
        details: '',
        icon: IconName.ArrowDown,
      });
    });

    it('resolves ${...} tokens in description using payload values', () => {
      const activityTypes: SeasonActivityTypeDto[] = [
        makeCustomActivity('Lock', 'Tx: ${txHash}'),
      ];
      const event: PointsEventDto = {
        ...makeEvent(),
        payload: { txHash: '0xabc123' } as unknown as Record<string, string>,
      };

      const result = getEventDetails(event, activityTypes, TEST_ADDRESS);

      expect(result).toEqual({
        title: 'Custom Title',
        details: 'Tx: 0xabc123',
        icon: IconName.Lock,
      });
    });

    it('leaves ${...} tokens intact when payload is null', () => {
      const activityTypes: SeasonActivityTypeDto[] = [
        makeCustomActivity('ArrowRight', 'Tx: ${txHash}'),
      ];
      const event: PointsEventDto = {
        ...makeEvent(),
        payload: null,
      };

      const result = getEventDetails(event, activityTypes, TEST_ADDRESS);

      expect(result).toEqual({
        title: 'Custom Title',
        details: 'Tx: ${txHash}',
        icon: IconName.ArrowRight,
      });
    });
  });
});
