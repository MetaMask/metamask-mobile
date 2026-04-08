import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsExploreSection from './PerpsExploreSection';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ['MKT1']),
}));

jest.mock('@metamask/perps-controller', () => ({
  PERPS_EVENT_VALUE: { SOURCE: { EXPLORE: 'explore' } },
}));

jest.mock('../../../../../../constants/navigation/Routes', () => ({
  __esModule: true,
  default: {
    PERPS: {
      ROOT: 'PerpsRoot',
      MARKET_LIST: 'PerpsMarketList',
      MARKET_DETAILS: 'PerpsMarketDetails',
    },
  },
}));

const mockUseHomepageSparklines = jest.fn(() => ({ sparklines: {} }));
jest.mock(
  '../../../../Homepage/Sections/Perpetuals/hooks/useHomepageSparklines',
  () => ({
    useHomepageSparklines: (
      ...args: Parameters<typeof mockUseHomepageSparklines>
    ) => mockUseHomepageSparklines(...args),
  }),
);

jest.mock('../../../../../UI/Perps/selectors/perpsController', () => ({
  selectPerpsWatchlistMarkets: jest.fn(),
}));

jest.mock(
  '../../../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCard',
  () => {
    const ReactNative = jest.requireActual('react-native');
    return ({
      market,
      testID,
    }: {
      market: { symbol: string };
      testID?: string;
    }) => (
      <ReactNative.View testID={testID}>
        <ReactNative.Text>{market.symbol}</ReactNative.Text>
      </ReactNative.View>
    );
  },
);

jest.mock(
  '../../../../Homepage/Sections/Perpetuals/components/PerpsMarketTileCardSkeleton',
  () => {
    const ReactNative = jest.requireActual('react-native');
    return () => <ReactNative.View testID="mock-skeleton" />;
  },
);

jest.mock('../../../../Homepage/components/ViewMoreCard', () => {
  const ReactNative = jest.requireActual('react-native');
  return ({ onPress, testID }: { onPress: () => void; testID?: string }) => (
    <ReactNative.TouchableOpacity onPress={onPress} testID={testID}>
      <ReactNative.Text>View more</ReactNative.Text>
    </ReactNative.TouchableOpacity>
  );
});

const createMarkets = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    symbol: `MKT${i}`,
    name: `Market ${i}`,
    change24hPercent: '0',
  }));

describe('PerpsExploreSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHomepageSparklines.mockReturnValue({ sparklines: {} });
  });

  it('renders skeleton when loading', () => {
    render(<PerpsExploreSection sectionId="perps" data={[]} isLoading />);

    expect(screen.getByTestId('mock-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('explore-perps-carousel')).toBeNull();
  });

  it('renders items and ViewMoreCard when not loading', () => {
    const data = createMarkets(3);

    render(
      <PerpsExploreSection sectionId="perps" data={data} isLoading={false} />,
    );

    expect(screen.getByTestId('explore-perps-carousel')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-market-tile-card-MKT0')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-market-tile-card-MKT1')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-market-tile-card-MKT2')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-view-more-card')).toBeOnTheScreen();
  });

  it('limits displayed items to 5', () => {
    const data = createMarkets(8);

    render(
      <PerpsExploreSection sectionId="perps" data={data} isLoading={false} />,
    );

    expect(screen.getByTestId('perps-market-tile-card-MKT0')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-market-tile-card-MKT4')).toBeOnTheScreen();
    expect(screen.queryByTestId('perps-market-tile-card-MKT5')).toBeNull();
    expect(screen.queryByTestId('perps-market-tile-card-MKT7')).toBeNull();
  });

  it('navigates to market list when ViewMoreCard is pressed', () => {
    render(
      <PerpsExploreSection
        sectionId="perps"
        data={createMarkets(2)}
        isLoading={false}
      />,
    );

    fireEvent.press(screen.getByTestId('perps-view-more-card'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'PerpsRoot',
      expect.objectContaining({ screen: 'PerpsMarketList' }),
    );
  });

  it('renders only ViewMoreCard when data is empty', () => {
    render(
      <PerpsExploreSection sectionId="perps" data={[]} isLoading={false} />,
    );

    expect(screen.getByTestId('explore-perps-carousel')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-view-more-card')).toBeOnTheScreen();
  });

  it('batches sparkline subscriptions for displayed symbols only', () => {
    const data = createMarkets(8);

    render(
      <PerpsExploreSection sectionId="perps" data={data} isLoading={false} />,
    );

    expect(mockUseHomepageSparklines).toHaveBeenCalledWith([
      'MKT0',
      'MKT1',
      'MKT2',
      'MKT3',
      'MKT4',
    ]);
  });
});
