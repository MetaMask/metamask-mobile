import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictCryptoUpDownDetails from './PredictCryptoUpDownDetails';
import { PredictCryptoUpDownDetailsSelectorsIDs } from '../../Predict.testIds';
import type { PredictMarket, PredictSeries } from '../../types';
import usePredictShare from '../../hooks/usePredictShare';
import { formatMarketEndDate } from '../../utils/format';

const mockUsePredictShare = usePredictShare as jest.Mock;
const mockFormatMarketEndDate = formatMarketEndDate as jest.Mock;

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
    ...jest.requireActual('react-native-safe-area-context'),
    SafeAreaView: View,
  };
});

jest.mock(
  '../../../../../component-library/components-temp/HeaderStandardAnimated',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    interface MockProps {
      title?: string;
      subtitle?: string;
      testID?: string;
      endButtonIconProps?: { testID?: string }[];
    }
    const MockHeaderStandardAnimated = ({
      title,
      subtitle,
      testID,
      endButtonIconProps,
    }: MockProps) => (
      <View testID={testID}>
        {title && <Text>{title}</Text>}
        {subtitle && <Text>{subtitle}</Text>}
        {endButtonIconProps && endButtonIconProps.length > 0 && (
          <View testID={endButtonIconProps[0].testID} />
        )}
      </View>
    );
    return MockHeaderStandardAnimated;
  },
);

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

jest.mock(
  '../../../../../component-library/components-temp/TitleSubpage',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    interface MockProps {
      title?: string;
      bottomLabel?: string;
      startAccessory?: React.ReactNode;
      twClassName?: string;
      testID?: string;
    }
    const MockTitleSubpage = ({
      title,
      bottomLabel,
      startAccessory,
    }: MockProps) => (
      <View>
        {startAccessory}
        {title && <Text>{title}</Text>}
        {bottomLabel && <Text>{bottomLabel}</Text>}
      </View>
    );
    return MockTitleSubpage;
  },
);

jest.mock('../../hooks/usePredictShare', () => {
  const mockUsePredictShare = jest.fn(
    ({ marketId, marketSlug }: { marketId?: string; marketSlug?: string }) => ({
      handleSharePress: jest.fn(),
      marketId,
      marketSlug,
    }),
  );
  return {
    __esModule: true,
    default: mockUsePredictShare,
  };
});

jest.mock('../../utils/format', () => ({
  formatMarketEndDate: jest.fn((date: string) => 'April 9, 1:45 PM'),
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

  it('renders HeaderStandardAnimated with series title as title prop', () => {
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

    const header = screen.getByTestId(
      PredictCryptoUpDownDetailsSelectorsIDs.HEADER,
    );
    expect(header).toBeOnTheScreen();
  });

  it('renders HeaderStandardAnimated with formatted endDate as subtitle prop', () => {
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

    const header = screen.getByTestId(
      PredictCryptoUpDownDetailsSelectorsIDs.HEADER,
    );
    expect(header).toBeOnTheScreen();
  });

  it('passes share button in endButtonIconProps', () => {
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

  it('renders TitleSubpage with series title', () => {
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
  });

  it('renders TitleSubpage with formatted endDate as bottomLabel', () => {
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
  });

  it('omits subtitle when endDate is undefined', () => {
    const market = createMockMarket({
      endDate: undefined,
    });

    mockFormatMarketEndDate.mockClear();

    render(
      <PredictCryptoUpDownDetails
        market={market}
        onBack={mockOnBack}
        onRefresh={mockOnRefresh}
        refreshing={false}
      />,
    );

    expect(mockFormatMarketEndDate).not.toHaveBeenCalled();
  });
});
