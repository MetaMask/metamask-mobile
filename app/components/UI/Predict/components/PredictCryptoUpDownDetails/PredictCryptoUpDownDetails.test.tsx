import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react-native';
import PredictCryptoUpDownDetails from './PredictCryptoUpDownDetails';
import { PredictCryptoUpDownDetailsSelectorsIDs } from '../../Predict.testIds';
import {
  Recurrence,
  type PredictMarket,
  type PredictSeries,
} from '../../types';
import usePredictShare from '../../hooks/usePredictShare';
import { usePredictSeries } from '../../hooks/usePredictSeries';
import { useCryptoTargetPrice } from '../../hooks/useCryptoTargetPrice';

const mockUsePredictShare = usePredictShare as jest.Mock;
const mockUsePredictSeries = usePredictSeries as jest.Mock;
const mockUseCryptoTargetPrice = useCryptoTargetPrice as jest.Mock;
let mockChartCurrentPrice: number | undefined;

interface HeaderCompactStandardMockProps {
  testID?: string;
  endButtonIconProps?: {
    testID?: string;
    onPress?: () => void;
  }[];
}

interface TimeSlotPickerMockProps {
  onMarketSelected: (market: PredictMarket) => void;
  markets: PredictMarket[];
}

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: {
        default: 'rgb(68, 89, 255)',
      },
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: jest.fn(() => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  };
});

jest.mock('react-native-reanimated', () => {
  const { ScrollView, View } = jest.requireActual('react-native');
  const actual = jest.requireActual('react-native-reanimated');
  // The component uses `import Animated from 'react-native-reanimated'` (default export)
  // and then accesses `Animated.ScrollView`. The default export must include ScrollView.
  const MockAnimated = {
    ...actual.default,
    ScrollView,
    View,
  };
  return {
    __esModule: true,
    ...actual,
    default: MockAnimated,
    useSharedValue: jest.fn((initialValue: number) => ({
      value: initialValue,
    })),
    useAnimatedScrollHandler: jest.fn(() => jest.fn()),
  };
});

jest.mock(
  '../../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const { View, TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: jest.fn((props: HeaderCompactStandardMockProps) => (
        <View testID={props.testID} {...props}>
          {props.endButtonIconProps?.map((btn, index) => (
            <TouchableOpacity
              key={index}
              testID={btn.testID}
              onPress={btn.onPress}
            />
          ))}
        </View>
      )),
    };
  },
);

jest.mock('../../hooks/usePredictShare', () => {
  const mockUsePredictShareFn = jest.fn(
    ({ marketId, marketSlug }: { marketId?: string; marketSlug?: string }) => ({
      handleSharePress: jest.fn(),
      marketId,
      marketSlug,
    }),
  );
  return {
    __esModule: true,
    default: mockUsePredictShareFn,
  };
});

jest.mock('../../hooks/usePredictSeries', () => ({
  usePredictSeries: jest.fn(),
}));

jest.mock('../../hooks/useCryptoTargetPrice', () => ({
  useCryptoTargetPrice: jest.fn(() => ({ data: undefined })),
}));

jest.mock('../../utils/format', () => ({
  ...jest.requireActual('../../utils/format'),
  formatMarketEndDate: jest.fn(() => 'April 9, 1:45 PM'),
}));

jest.mock('../TimeSlotPicker', () => {
  const { View, TouchableOpacity } = jest.requireActual('react-native');
  return {
    TimeSlotPicker: jest.fn(
      ({ onMarketSelected, markets }: TimeSlotPickerMockProps) => (
        <View testID="mock-time-slot-picker">
          {markets.map((m) => (
            <TouchableOpacity
              key={m.id}
              testID={`mock-time-slot-${m.id}`}
              onPress={() => onMarketSelected(m)}
            />
          ))}
        </View>
      ),
    ),
  };
});

jest.mock('../PredictCryptoUpDownChart', () => {
  const { TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ market, targetPrice, onCurrentPriceChange }) => (
      <TouchableOpacity
        testID="mock-predict-crypto-up-down-chart"
        accessibilityLabel={`market:${market.id};target:${targetPrice ?? 'none'}`}
        onPress={() => {
          if (typeof mockChartCurrentPrice === 'number') {
            onCurrentPriceChange?.(mockChartCurrentPrice);
          }
        }}
      />
    )),
  };
});

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket & { series: PredictSeries } =>
  ({
    id: 'market-1',
    providerId: 'polymarket',
    slug: 'btc-up-or-down-5m',
    title: 'BTC Up or Down - 5 Minutes',
    description: 'Will BTC go up or down?',
    image: 'https://example.com/btc.png',
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'crypto',
    tags: ['crypto', 'up-or-down'],
    outcomes: [],
    liquidity: 100,
    volume: 200,
    endDate: '2026-04-09T19:45:00Z',
    series: {
      id: 's1',
      slug: 'btc-up-or-down-5m',
      title: 'BTC Up or Down - 5 Minutes',
      recurrence: '5m',
    },
    ...overrides,
  }) as PredictMarket & { series: PredictSeries };

const getChartMarketId = () => {
  const chart = screen.getByTestId('mock-predict-crypto-up-down-chart');
  const label = chart.props.accessibilityLabel as string | undefined;
  return label?.match(/^market:([^;]+)/)?.[1];
};

describe('PredictCryptoUpDownDetails', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockChartCurrentPrice = undefined;
    mockUsePredictSeries.mockReturnValue({
      data: [
        createMockMarket({ id: 'market-1' }),
        createMockMarket({ id: 'market-2', endDate: '2026-04-09T19:50:00Z' }),
      ],
    });
    mockUseCryptoTargetPrice.mockReturnValue({ data: 78000 });
  });

  it('renders the screen container with correct testID', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    expect(
      screen.getByTestId(PredictCryptoUpDownDetailsSelectorsIDs.SCREEN),
    ).toBeOnTheScreen();
  });

  it('renders the header with the series title text', () => {
    const market = createMockMarket({
      series: {
        id: 's1',
        slug: 'btc-up-or-down-5m',
        title: 'BTC Up or Down - 5 Minutes',
        recurrence: '5m',
      },
    });

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    expect(
      screen.getByTestId(PredictCryptoUpDownDetailsSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.getAllByText('BTC Up or Down - 5 Minutes').length,
    ).toBeGreaterThan(0);
  });

  it('renders the formatted endDate as subtitle in the header', () => {
    const market = createMockMarket({
      endDate: '2026-04-09T19:45:00Z',
    });

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    expect(screen.getAllByText('April 9, 1:45 PM').length).toBeGreaterThan(0);
  });

  it('renders the share button in the header end area', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    expect(
      screen.getByTestId(PredictCryptoUpDownDetailsSelectorsIDs.SHARE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls usePredictShare with market id and slug', () => {
    const market = createMockMarket({
      id: 'market-123',
      slug: 'btc-up-or-down-5m',
    });

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    expect(mockUsePredictShare).toHaveBeenCalledWith({
      marketId: 'market-123',
      marketSlug: 'btc-up-or-down-5m',
    });
  });

  it('updates usePredictShare params when a different time slot is selected', () => {
    const initialMarket = createMockMarket({
      id: 'market-1',
      slug: 'btc-up-or-down-5m',
    });
    const selectedMarket = createMockMarket({
      id: 'market-2',
      slug: 'btc-up-or-down-15m',
      endDate: '2026-04-09T19:50:00Z',
    });
    mockUsePredictSeries.mockReturnValue({
      data: [initialMarket, selectedMarket],
    });

    render(
      <PredictCryptoUpDownDetails market={initialMarket} onBack={mockOnBack} />,
    );

    fireEvent.press(screen.getByTestId('mock-time-slot-market-2'));

    expect(mockUsePredictShare).toHaveBeenLastCalledWith({
      marketId: 'market-2',
      marketSlug: 'btc-up-or-down-15m',
    });
  });

  it('renders the title section with the series title text', () => {
    const market = createMockMarket({
      series: {
        id: 's1',
        slug: 'btc-up-or-down-5m',
        title: 'BTC Up or Down - 5 Minutes',
        recurrence: '5m',
      },
    });

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    const titleSection = screen.getByTestId(
      PredictCryptoUpDownDetailsSelectorsIDs.TITLE_SECTION,
    );
    expect(titleSection).toBeOnTheScreen();
    expect(
      screen.getAllByText('BTC Up or Down - 5 Minutes').length,
    ).toBeGreaterThan(0);
  });

  it('renders the title section with formatted endDate as bottom label', () => {
    const market = createMockMarket({
      endDate: '2026-04-09T19:45:00Z',
    });

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    const titleSection = screen.getByTestId(
      PredictCryptoUpDownDetailsSelectorsIDs.TITLE_SECTION,
    );
    expect(titleSection).toBeOnTheScreen();
    expect(screen.getAllByText('April 9, 1:45 PM').length).toBeGreaterThan(0);
  });

  it('renders no subtitle text when endDate is undefined', () => {
    const market = createMockMarket({
      endDate: undefined,
    });
    mockUsePredictSeries.mockReturnValue({
      data: [market],
    });

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    expect(screen.queryByText('April 9, 1:45 PM')).not.toBeOnTheScreen();
  });

  it('renders TimeSlotPicker', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    expect(screen.getByTestId('mock-time-slot-picker')).toBeOnTheScreen();
  });

  it('renders PredictCryptoUpDownChart', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    expect(
      screen.getByTestId('mock-predict-crypto-up-down-chart'),
    ).toBeOnTheScreen();
  });

  it('attaches pull-to-refresh props to the scroll view', () => {
    const market = createMockMarket();
    const onRefresh = jest.fn();

    const { UNSAFE_getByType } = render(
      <PredictCryptoUpDownDetails
        market={market}
        onBack={mockOnBack}
        onRefresh={onRefresh}
        refreshing
      />,
    );

    const { ScrollView } = jest.requireActual('react-native');
    const scrollView = UNSAFE_getByType(ScrollView);
    expect(scrollView.props.testID).toBe(
      PredictCryptoUpDownDetailsSelectorsIDs.SCROLL_VIEW,
    );
    expect(scrollView.props.refreshControl.props.refreshing).toBe(true);
    expect(scrollView.props.refreshControl.props.onRefresh).toBe(onRefresh);
  });

  it('renders the target price summary above the chart', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    expect(
      screen.getByTestId(PredictCryptoUpDownDetailsSelectorsIDs.PRICE_SUMMARY),
    ).toBeOnTheScreen();
    expect(screen.getByText('Price to beat')).toBeOnTheScreen();
    expect(screen.getByText('$78,000.00')).toBeOnTheScreen();
  });

  it('renders signed positive current price deltas with USD formatting', () => {
    const market = createMockMarket();
    mockChartCurrentPrice = 78010;

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    fireEvent.press(screen.getByTestId('mock-predict-crypto-up-down-chart'));

    expect(screen.getByText('$78,010.00')).toBeOnTheScreen();
    expect(screen.getByText('+$10.00')).toBeOnTheScreen();
  });

  it('renders signed negative current price deltas with USD formatting', () => {
    const market = createMockMarket();
    mockChartCurrentPrice = 77998.77;

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    fireEvent.press(screen.getByTestId('mock-predict-crypto-up-down-chart'));

    expect(screen.getByText('$77,998.77')).toBeOnTheScreen();
    expect(screen.getByText('-$1.23')).toBeOnTheScreen();
  });

  it('keeps series query params stable across live price updates in the same window', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const previousDateNow = Date.now;
    const dateNowMock = jest.fn(() => now);
    Date.now = dateNowMock;
    const market = createMockMarket();
    mockChartCurrentPrice = 78010;

    try {
      render(
        <PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />,
      );
      const initialQueryParams =
        mockUsePredictSeries.mock.calls[
          mockUsePredictSeries.mock.calls.length - 1
        ][0];

      dateNowMock.mockReturnValue(now + 1000);
      fireEvent.press(screen.getByTestId('mock-predict-crypto-up-down-chart'));

      const updatedQueryParams =
        mockUsePredictSeries.mock.calls[
          mockUsePredictSeries.mock.calls.length - 1
        ][0];
      expect(updatedQueryParams).toEqual(initialQueryParams);
    } finally {
      Date.now = previousDateNow;
    }
  });

  it('refreshes series query params when the current recurrence window elapses', () => {
    const now = Date.UTC(2026, 0, 1, 0, 1, 0);
    jest.useFakeTimers();
    jest.setSystemTime(now);
    const market = createMockMarket({ endDate: undefined });
    mockUsePredictSeries.mockReturnValue({ data: [market] });

    try {
      render(
        <PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />,
      );
      const initialQueryParams =
        mockUsePredictSeries.mock.calls[
          mockUsePredictSeries.mock.calls.length - 1
        ][0];

      act(() => {
        jest.advanceTimersByTime(4 * 60 * 1000);
      });

      const updatedQueryParams =
        mockUsePredictSeries.mock.calls[
          mockUsePredictSeries.mock.calls.length - 1
        ][0];
      expect(updatedQueryParams.endDateMin).not.toBe(
        initialQueryParams.endDateMin,
      );
      expect(updatedQueryParams.endDateMax).not.toBe(
        initialQueryParams.endDateMax,
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops refreshing series query params after unmount', () => {
    const now = Date.UTC(2026, 0, 1, 0, 1, 0);
    jest.useFakeTimers();
    jest.setSystemTime(now);
    const market = createMockMarket({ endDate: undefined });
    mockUsePredictSeries.mockReturnValue({ data: [market] });

    try {
      const { unmount } = render(
        <PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />,
      );
      const callCountBeforeUnmount = mockUsePredictSeries.mock.calls.length;

      unmount();
      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      expect(mockUsePredictSeries).toHaveBeenCalledTimes(
        callCountBeforeUnmount,
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses the selected market recurrence for series query window duration', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    const fiveMinuteMarket = createMockMarket({
      id: 'market-5m',
      endDate: new Date(now + 5 * 60 * 1000).toISOString(),
      series: {
        id: 's1',
        slug: 'btc-up-or-down-5m',
        title: 'BTC Up or Down - 5 Minutes',
        recurrence: '5m',
      },
    });
    const fifteenMinuteMarket = createMockMarket({
      id: 'market-15m',
      endDate: new Date(now + 15 * 60 * 1000).toISOString(),
      series: {
        id: 's1',
        slug: 'btc-up-or-down-15m',
        title: 'BTC Up or Down - 15 Minutes',
        recurrence: '15m',
      },
    });
    mockUsePredictSeries.mockReturnValue({
      data: [fiveMinuteMarket, fifteenMinuteMarket],
    });

    try {
      render(
        <PredictCryptoUpDownDetails
          market={fiveMinuteMarket}
          onBack={mockOnBack}
        />,
      );

      fireEvent.press(screen.getByTestId('mock-time-slot-market-15m'));

      const selectedQueryParams =
        mockUsePredictSeries.mock.calls[
          mockUsePredictSeries.mock.calls.length - 1
        ][0];
      const queryWindowMs =
        new Date(selectedQueryParams.endDateMax).getTime() -
        new Date(selectedQueryParams.endDateMin).getTime();

      expect(queryWindowMs).toBe(13 * 15 * 60 * 1000);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('anchors the series query window to the selected slot instead of the prop market', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    const laterPropMarket = createMockMarket({
      id: 'later-market',
      endDate: new Date(now + 60 * 60 * 1000).toISOString(),
    });
    const earlierSelectedMarket = createMockMarket({
      id: 'earlier-market',
      endDate: new Date(now + 5 * 60 * 1000).toISOString(),
    });
    mockUsePredictSeries.mockReturnValue({
      data: [laterPropMarket, earlierSelectedMarket],
    });

    try {
      render(
        <PredictCryptoUpDownDetails
          market={laterPropMarket}
          onBack={mockOnBack}
        />,
      );

      fireEvent.press(screen.getByTestId('mock-time-slot-earlier-market'));

      const selectedQueryParams =
        mockUsePredictSeries.mock.calls[
          mockUsePredictSeries.mock.calls.length - 1
        ][0];

      expect(new Date(selectedQueryParams.endDateMin).getTime()).toBe(
        now - 2 * 5 * 60 * 1000,
      );
      expect(new Date(selectedQueryParams.endDateMax).getTime()).toBe(
        now + 11 * 5 * 60 * 1000,
      );
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('passes selected market to chart component and updates subtitle when a different time slot is selected', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    expect(getChartMarketId()).toBe('market-1');

    const timeSlot2 = screen.getByTestId('mock-time-slot-market-2');
    fireEvent.press(timeSlot2);

    expect(getChartMarketId()).toBe('market-2');
  });

  it('syncs selected market when the market prop changes', () => {
    const market = createMockMarket();
    const nextMarket = createMockMarket({
      id: 'market-3',
      slug: 'eth-up-or-down-5m',
      endDate: '2026-04-09T19:55:00Z',
    });

    const { rerender } = render(
      <PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />,
    );

    rerender(
      <PredictCryptoUpDownDetails market={nextMarket} onBack={mockOnBack} />,
    );

    expect(getChartMarketId()).toBe('market-3');
  });

  it('auto-advances to the live market slot when the initial market has already ended', async () => {
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(123);
    // Date.now() is mocked to 123 ms (near epoch).
    // An endDate of new Date(0).toISOString() (epoch zero) is in the past relative
    // to Date.now()=123, so hasEnded is true and the hook auto-advances to the
    // live market returned by findLiveMarket (market-2 whose endDate 2026-04-09
    // is in the future relative to epoch 123).
    const expiredMarket = createMockMarket({
      id: 'expired-market',
      endDate: new Date(0).toISOString(), // epoch 0 is in the past vs Date.now()=123
    });

    try {
      render(
        <PredictCryptoUpDownDetails
          market={expiredMarket}
          onBack={mockOnBack}
        />,
      );

      // findLiveMarket picks market-1 (closest future endDate from epoch 123)
      await waitFor(() => expect(getChartMarketId()).toBe('market-1'));
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('auto-advances to the live market when an expired slot is selected', async () => {
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(123);
    const liveMarket = createMockMarket({ id: 'live-market' });
    const expiredMarket = createMockMarket({
      id: 'expired-market',
      endDate: new Date(0).toISOString(),
    });
    mockUsePredictSeries.mockReturnValue({
      data: [liveMarket, expiredMarket],
    });

    try {
      render(
        <PredictCryptoUpDownDetails market={liveMarket} onBack={mockOnBack} />,
      );

      fireEvent.press(screen.getByTestId('mock-time-slot-expired-market'));

      await waitFor(() => expect(getChartMarketId()).toBe('live-market'));
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('keeps the current slot when an old rollover callback runs', () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const scheduledCallbacks: (() => void)[] = [];
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    const setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((callback: Parameters<typeof setTimeout>[0]) => {
        if (typeof callback === 'function') {
          scheduledCallbacks.push(() => callback());
        }

        return scheduledCallbacks.length as unknown as ReturnType<
          typeof setTimeout
        >;
      });
    const clearTimeoutSpy = jest
      .spyOn(global, 'clearTimeout')
      .mockImplementation(() => undefined);
    const expiringMarket = createMockMarket({
      id: 'expiring-market',
      endDate: new Date(now + 1000).toISOString(),
    });
    const liveMarket = createMockMarket({
      id: 'live-market',
      endDate: new Date(now + 2000).toISOString(),
    });
    const laterMarket = createMockMarket({
      id: 'later-market',
      endDate: new Date(now + 3000).toISOString(),
    });
    mockUsePredictSeries.mockReturnValue({
      data: [expiringMarket, liveMarket, laterMarket],
    });

    try {
      render(
        <PredictCryptoUpDownDetails
          market={expiringMarket}
          onBack={mockOnBack}
        />,
      );

      fireEvent.press(screen.getByTestId('mock-time-slot-later-market'));
      act(() => {
        scheduledCallbacks[0]();
      });

      expect(getChartMarketId()).toBe('later-market');
    } finally {
      clearTimeoutSpy.mockRestore();
      setTimeoutSpy.mockRestore();
      dateNowSpy.mockRestore();
    }
  });
});
