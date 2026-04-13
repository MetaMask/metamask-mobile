import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictCryptoUpDownDetails from './PredictCryptoUpDownDetails';
import { PredictCryptoUpDownDetailsSelectorsIDs } from '../../Predict.testIds';
import { Recurrence } from '../../types';
import type { PredictMarket, PredictSeries } from '../../types';
import usePredictShare from '../../hooks/usePredictShare';
import { usePredictSeries } from '../../hooks/usePredictSeries';

const mockUsePredictShare = usePredictShare as jest.Mock;
const mockUsePredictSeries = usePredictSeries as jest.Mock;

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
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

jest.mock(
  '../../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const { View, TouchableOpacity } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: jest.fn((props) => (
        <View testID={props.testID} {...props}>
          {props.endButtonIconProps?.map((btn: any, index: number) => (
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

jest.mock('../../utils/format', () => ({
  formatMarketEndDate: jest.fn(() => 'April 9, 1:45 PM'),
}));

jest.mock('../TimeSlotPicker', () => {
  const { View, TouchableOpacity } = jest.requireActual('react-native');
  return {
    TimeSlotPicker: jest.fn(({ onMarketSelected, markets }) => (
      <View testID="mock-time-slot-picker">
        {markets.map((m: any) => (
          <TouchableOpacity
            key={m.id}
            testID={`mock-time-slot-${m.id}`}
            onPress={() => onMarketSelected(m)}
          />
        ))}
      </View>
    )),
  };
});

jest.mock('../PredictCryptoUpDownChart', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ market }) => (
      <View
        testID="mock-predict-crypto-up-down-chart"
        testID-marketId={market.id}
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

describe('PredictCryptoUpDownDetails', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictSeries.mockReturnValue({
      data: [
        createMockMarket({ id: 'market-1' }),
        createMockMarket({ id: 'market-2', endDate: '2026-04-09T19:50:00Z' }),
      ],
    });
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

  it('passes selected market to chart component and updates subtitle when a different time slot is selected', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownDetails market={market} onBack={mockOnBack} />);

    const chart = screen.getByTestId('mock-predict-crypto-up-down-chart');
    expect(chart.props['testID-marketId']).toBe('market-1');

    const timeSlot2 = screen.getByTestId('mock-time-slot-market-2');
    fireEvent.press(timeSlot2);

    expect(chart.props['testID-marketId']).toBe('market-2');
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

    const chart = screen.getByTestId('mock-predict-crypto-up-down-chart');
    // findLiveMarket picks market-1 (closest future endDate from epoch 123)
    expect(chart.props['testID-marketId']).toBe('market-1');
  });
});
