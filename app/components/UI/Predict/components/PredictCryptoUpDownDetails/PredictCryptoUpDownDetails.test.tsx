import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictCryptoUpDownDetails from './PredictCryptoUpDownDetails';
import { PredictCryptoUpDownDetailsSelectorsIDs } from '../../Predict.testIds';
import type { PredictMarket, PredictSeries } from '../../types';
import usePredictShare from '../../hooks/usePredictShare';

const mockUsePredictShare = usePredictShare as jest.Mock;

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

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
  '../../../../../component-library/components-temp/HeaderStandardAnimated/useHeaderStandardAnimated',
  () => ({
    __esModule: true,
    default: () => ({
      scrollY: { value: 0 },
      titleSectionHeightSv: { value: 0 },
      setTitleSectionHeight: jest.fn(),
      onScroll: jest.fn(),
    }),
  }),
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

jest.mock('../../utils/format', () => ({
  formatMarketEndDate: jest.fn(() => 'April 9, 1:45 PM'),
}));

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
    recurrence: 'NONE',
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
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the screen container with correct testID', () => {
    const market = createMockMarket();

    render(
      <PredictCryptoUpDownDetails
        market={market}
        onBack={mockOnBack}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />,
    );

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

    render(
      <PredictCryptoUpDownDetails
        market={market}
        onBack={mockOnBack}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />,
    );

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

    render(
      <PredictCryptoUpDownDetails
        market={market}
        onBack={mockOnBack}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />,
    );

    expect(screen.getAllByText('April 9, 1:45 PM').length).toBeGreaterThan(0);
  });

  it('renders the share button in the header end area', () => {
    const market = createMockMarket();

    render(
      <PredictCryptoUpDownDetails
        market={market}
        onBack={mockOnBack}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />,
    );

    expect(
      screen.getByTestId(PredictCryptoUpDownDetailsSelectorsIDs.SHARE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls usePredictShare with market id and slug', () => {
    const market = createMockMarket({
      id: 'market-123',
      slug: 'btc-up-or-down-5m',
    });

    render(
      <PredictCryptoUpDownDetails
        market={market}
        onBack={mockOnBack}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />,
    );

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

    render(
      <PredictCryptoUpDownDetails
        market={market}
        onBack={mockOnBack}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />,
    );

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

    render(
      <PredictCryptoUpDownDetails
        market={market}
        onBack={mockOnBack}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />,
    );

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

    render(
      <PredictCryptoUpDownDetails
        market={market}
        onBack={mockOnBack}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />,
    );

    expect(screen.queryByText('April 9, 1:45 PM')).not.toBeOnTheScreen();
  });
});
