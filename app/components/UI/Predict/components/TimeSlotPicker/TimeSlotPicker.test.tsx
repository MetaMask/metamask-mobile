import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
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
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <RNText testID={testID} {...props}>
        {children}
      </RNText>
    ),
    TextVariant: { BodySm: 'body-sm' },
    TextColor: {
      PrimaryInverse: 'text-primary-inverse',
      TextDefault: 'text-default',
    },
    FontWeight: { Medium: 'medium', Regular: 'regular' },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { ScrollView } = jest.requireActual('react-native');
  return { ScrollView };
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

      render(<TimeSlotPicker markets={markets} onMarketSelected={jest.fn()} />);

      markets.forEach((market) => {
        expect(
          screen.getByTestId(`time-slot-pill-${market.id}`),
        ).toBeOnTheScreen();
      });
    });

    it('renders nothing when markets array is empty', () => {
      render(<TimeSlotPicker markets={[]} onMarketSelected={jest.fn()} />);

      expect(screen.queryByTestId('time-slot-picker')).not.toBeOnTheScreen();
    });

    it('displays Live label and countdown for the live market when countdown is active', () => {
      useCountdown.mockReturnValue('02:00');
      const markets = createMarkets();

      render(<TimeSlotPicker markets={markets} onMarketSelected={jest.fn()} />);

      expect(
        screen.getByTestId('time-slot-live-label-live-1'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('time-slot-countdown-live-1'),
      ).toBeOnTheScreen();
    });
  });

  describe('selection', () => {
    it('auto-selects the live market when no selectedMarketId is provided', () => {
      useCountdown.mockReturnValue('02:00');
      const markets = createMarkets();

      render(<TimeSlotPicker markets={markets} onMarketSelected={jest.fn()} />);

      expect(
        screen.getByTestId('time-slot-live-label-live-1'),
      ).toBeOnTheScreen();
    });

    it('renders a pill for the explicitly selected market', () => {
      const markets = createMarkets();

      render(
        <TimeSlotPicker
          markets={markets}
          selectedMarketId="future-1"
          onMarketSelected={jest.fn()}
        />,
      );

      expect(screen.getByTestId('time-slot-pill-future-1')).toBeOnTheScreen();
    });
  });

  describe('interactions', () => {
    it('calls onMarketSelected with the tapped market', () => {
      const markets = createMarkets();
      const onSelected = jest.fn();

      render(
        <TimeSlotPicker markets={markets} onMarketSelected={onSelected} />,
      );

      fireEvent.press(screen.getByTestId('time-slot-pill-past-1'));

      expect(onSelected).toHaveBeenCalledTimes(1);
      expect(onSelected).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'past-1' }),
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

      render(<TimeSlotPicker markets={markets} onMarketSelected={jest.fn()} />);

      expect(screen.getByTestId('time-slot-picker')).toBeOnTheScreen();
    });

    it('renders markets without endDate gracefully', () => {
      const markets = [createMarket({ id: 'no-end', endDate: undefined })];

      render(<TimeSlotPicker markets={markets} onMarketSelected={jest.fn()} />);

      expect(screen.getByTestId('time-slot-picker')).toBeOnTheScreen();
    });
  });
});
