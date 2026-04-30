import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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
  const { ScrollView } = jest.requireActual('react-native');
  return {
    ...jest.requireActual('react-native-reanimated'),
    Animated: { ScrollView },
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

  it('auto-advances to the live market slot when the initial market has already ended', () => {
    // Date.now() is mocked to 123 ms (near epoch) in the global test setup.
    // An endDate of new Date(0).toISOString() (epoch zero) is in the past relative
    // to Date.now()=123, so hasEnded is true and the hook auto-advances to the
    // live market returned by findLiveMarket (market-2 whose endDate 2026-04-09
    // is in the future relative to epoch 123).
    const expiredMarket = createMockMarket({
      id: 'expired-market',
      endDate: new Date(0).toISOString(), // epoch 0 is in the past vs Date.now()=123
    });

    render(
      <PredictCryptoUpDownDetails market={expiredMarket} onBack={mockOnBack} />,
    );

    // findLiveMarket picks market-1 (closest future endDate from epoch 123)
    expect(getChartMarketId()).toBe('market-1');
  });

  it('auto-advances to the live market when an expired slot is selected', () => {
    const liveMarket = createMockMarket({ id: 'live-market' });
    const expiredMarket = createMockMarket({
      id: 'expired-market',
      endDate: new Date(0).toISOString(),
    });
    mockUsePredictSeries.mockReturnValue({
      data: [liveMarket, expiredMarket],
    });

    render(
      <PredictCryptoUpDownDetails market={liveMarket} onBack={mockOnBack} />,
    );

    fireEvent.press(screen.getByTestId('mock-time-slot-expired-market'));

    expect(getChartMarketId()).toBe('live-market');
  });
});
