import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TimeSlotPicker from './TimeSlotPicker';
import { PredictMarket, Recurrence } from '../../types';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...classes: (string | boolean | undefined)[]) => ({
      testStyle: classes.filter(Boolean).join(' '),
    }),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text: RNText } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      onLayout,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      onLayout?: (e: unknown) => void;
      [key: string]: unknown;
    }) => (
      <View testID={testID} onLayout={onLayout} {...props}>
        {children}
      </View>
    ),
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { Center: 'center' },
    BoxBackgroundColor: {
      ErrorMuted: 'bg-error-muted',
      IconDefault: 'bg-icon-default',
      BackgroundMuted: 'bg-muted',
    },
    BoxBorderColor: { ErrorDefault: 'border-error-default' },
    Text: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => <RNText {...props}>{children}</RNText>,
    TextVariant: { BodySm: 'body-sm' },
    TextColor: {
      TextInverse: 'text-inverse',
      TextDefault: 'text-default',
    },
    FontWeight: { Medium: 'medium', Regular: 'regular' },
  };
});

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withRepeat: (v: number) => v,
    withTiming: (v: number) => v,
    Easing: { out: (fn: unknown) => fn, ease: {} },
  };
});

jest.mock('./useCountdown', () => ({
  useCountdown: jest.fn(() => null),
}));

const { useCountdown } = jest.requireMock('./useCountdown') as {
  useCountdown: jest.Mock;
};

const createMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'btc-updown-5m',
  title: 'BTC Up/Down 5m',
  description: 'Will BTC go up?',
  endDate: '2026-04-09T12:05:00.000Z',
  image: '',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['up-or-down'],
  outcomes: [],
  liquidity: 1000,
  volume: 5000,
  ...overrides,
});

const createMarkets = (): PredictMarket[] => {
  const now = Date.now();
  return [
    createMarket({
      id: 'past-1',
      endDate: new Date(now - 60_000).toISOString(),
      status: 'closed',
    }),
    createMarket({
      id: 'live-1',
      endDate: new Date(now + 120_000).toISOString(),
    }),
    createMarket({
      id: 'future-1',
      endDate: new Date(now + 600_000).toISOString(),
    }),
    createMarket({
      id: 'future-2',
      endDate: new Date(now + 1_200_000).toISOString(),
    }),
  ];
};

describe('TimeSlotPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-09T12:00:00.000Z'));
    useCountdown.mockReturnValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('renders a pill for each market', () => {
      const markets = createMarkets();

      const { getAllByText } = render(
        <TimeSlotPicker markets={markets} onMarketSelected={jest.fn()} />,
      );

      const timeTexts = getAllByText(/.+/);
      expect(timeTexts.length).toBeGreaterThanOrEqual(markets.length);
    });

    it('renders nothing when markets array is empty', () => {
      const { toJSON } = render(
        <TimeSlotPicker markets={[]} onMarketSelected={jest.fn()} />,
      );

      expect(toJSON()).toBeNull();
    });

    it('displays "Live" text for the live market when countdown is active', () => {
      useCountdown.mockReturnValue('02:00');
      const markets = createMarkets();

      const { getByText } = render(
        <TimeSlotPicker markets={markets} onMarketSelected={jest.fn()} />,
      );

      expect(getByText('Live')).toBeTruthy();
      expect(getByText('02:00')).toBeTruthy();
    });
  });

  describe('selection', () => {
    it('auto-selects the live market when no selectedMarketId is provided', () => {
      useCountdown.mockReturnValue('02:00');
      const markets = createMarkets();

      const { getByText } = render(
        <TimeSlotPicker markets={markets} onMarketSelected={jest.fn()} />,
      );

      expect(getByText('Live')).toBeTruthy();
    });

    it('selects the market matching selectedMarketId', () => {
      const markets = createMarkets();
      const onSelected = jest.fn();

      render(
        <TimeSlotPicker
          markets={markets}
          selectedMarketId="future-1"
          onMarketSelected={onSelected}
        />,
      );

      expect(useCountdown).toHaveBeenCalled();
    });
  });

  describe('interactions', () => {
    it('calls onMarketSelected with the tapped market', () => {
      const markets = createMarkets();
      const onSelected = jest.fn();

      const { getAllByText } = render(
        <TimeSlotPicker markets={markets} onMarketSelected={onSelected} />,
      );

      const timeTexts = getAllByText(/.+/);
      fireEvent.press(timeTexts[0]);

      expect(onSelected).toHaveBeenCalledTimes(1);
      expect(onSelected).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
      );
    });
  });

  describe('edge cases', () => {
    it('falls back to nearest market when no live market exists', () => {
      const now = Date.now();
      const markets = [
        createMarket({
          id: 'past-1',
          endDate: new Date(now - 120_000).toISOString(),
          status: 'closed',
        }),
        createMarket({
          id: 'past-2',
          endDate: new Date(now - 60_000).toISOString(),
          status: 'closed',
        }),
      ];

      const { toJSON } = render(
        <TimeSlotPicker markets={markets} onMarketSelected={jest.fn()} />,
      );

      expect(toJSON()).not.toBeNull();
    });

    it('renders markets without endDate gracefully', () => {
      const markets = [createMarket({ id: 'no-end', endDate: undefined })];

      const { toJSON } = render(
        <TimeSlotPicker markets={markets} onMarketSelected={jest.fn()} />,
      );

      expect(toJSON()).not.toBeNull();
    });
  });
});
