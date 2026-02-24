import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsSection from './PerpsSection';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      startMarketDataPreload: jest.fn(),
      stopMarketDataPreload: jest.fn(),
    },
  },
}));

jest.mock('../../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(() => true),
}));

jest.mock('../../../../UI/Perps/selectors/perpsController', () => ({
  selectCachedPositions: jest.fn(() => []),
  selectCachedMarketData: jest.fn(() => null),
}));

jest.mock('react-native-skeleton-placeholder', () => {
  const { View } = jest.requireActual('react-native');
  return function MockSkeletonPlaceholder({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <View testID="skeleton-placeholder">{children}</View>;
  };
});

jest.mock('../../../../UI/Perps/components/PerpsTokenLogo', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="token-logo" />,
  };
});

jest.mock('../../../../UI/Perps/components/PerpsLeverage/PerpsLeverage', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ maxLeverage }: { maxLeverage: string }) => (
      <Text>{maxLeverage}</Text>
    ),
  };
});

const makePosition = (overrides: Record<string, unknown> = {}) => ({
  symbol: 'BTC',
  size: '-0.0015',
  entryPrice: '98500',
  positionValue: '100',
  unrealizedPnl: '9.4',
  marginUsed: '10',
  leverage: { type: 'isolated', value: 10 },
  liquidationPrice: '108000',
  maxLeverage: 50,
  returnOnEquity: '0.094',
  cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  takeProfitPrice: undefined,
  stopLossPrice: undefined,
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

const setCachedPositions = (positions: unknown[] | null) =>
  jest
    .requireMock('../../../../UI/Perps/selectors/perpsController')
    .selectCachedPositions.mockReturnValue(positions);

const setCachedMarketData = (markets: unknown[] | null) =>
  jest
    .requireMock('../../../../UI/Perps/selectors/perpsController')
    .selectCachedMarketData.mockReturnValue(markets);

describe('PerpsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .requireMock('../../../../UI/Perps')
      .selectPerpsEnabledFlag.mockReturnValue(true);
    setCachedPositions([]);
    setCachedMarketData(null);
  });

  it('renders section title', () => {
    renderWithProvider(<PerpsSection />);

    expect(screen.getByText('Perpetuals')).toBeOnTheScreen();
  });

  it('renders cached positions', () => {
    setCachedPositions([
      makePosition({ symbol: 'BTC', size: '-0.0015' }),
      makePosition({
        symbol: 'ETH',
        size: '0.03',
        entryPrice: '3200',
        leverage: { type: 'isolated', value: 40 },
        takeProfitPrice: '3680',
        stopLossPrice: '2720',
      }),
    ]);

    renderWithProvider(<PerpsSection />);

    expect(screen.getByText('Short BTC')).toBeOnTheScreen();
    expect(screen.getByText('Long ETH')).toBeOnTheScreen();
  });

  it('shows leverage badges', () => {
    setCachedPositions([
      makePosition({ symbol: 'BTC', size: '-1' }),
      makePosition({
        symbol: 'ETH',
        size: '1',
        leverage: { type: 'isolated', value: 40 },
      }),
    ]);

    renderWithProvider(<PerpsSection />);

    expect(screen.getByText('10X short')).toBeOnTheScreen();
    expect(screen.getByText('40X long')).toBeOnTheScreen();
  });

  it('shows TP/SL labels where configured', () => {
    setCachedPositions([
      makePosition({ symbol: 'BTC' }),
      makePosition({
        symbol: 'ETH',
        size: '0.03',
        entryPrice: '3200',
        takeProfitPrice: '3680',
        stopLossPrice: '2720',
      }),
    ]);

    renderWithProvider(<PerpsSection />);

    expect(screen.getByText('TP 15%, SL 15%')).toBeOnTheScreen();
    expect(screen.getByText('No TP/SL')).toBeOnTheScreen();
  });

  it('shows position value and ROE', () => {
    setCachedPositions([
      makePosition(),
      makePosition({ symbol: 'ETH', size: '0.03' }),
    ]);

    renderWithProvider(<PerpsSection />);

    const roeElements = screen.getAllByText('+9.4%');
    expect(roeElements.length).toBeGreaterThanOrEqual(2);
  });

  it('navigates to perps home on title press', () => {
    renderWithProvider(<PerpsSection />);

    fireEvent.press(screen.getByText('Perpetuals'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  });

  it('navigates with full market data when cached market is available', () => {
    const fullMarket = {
      symbol: 'BTC',
      maxLeverage: 50,
      marketType: 'crypto',
      marketSource: 'HyperLiquid',
    };
    setCachedPositions([makePosition()]);
    setCachedMarketData([fullMarket]);

    renderWithProvider(<PerpsSection />);

    fireEvent.press(screen.getByTestId('perps-position-row-BTC'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: fullMarket,
        initialTab: 'position',
      },
    });
  });

  it('falls back to partial market when cached market is unavailable', () => {
    setCachedPositions([makePosition()]);
    setCachedMarketData(null);

    renderWithProvider(<PerpsSection />);

    fireEvent.press(screen.getByTestId('perps-position-row-BTC'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: { symbol: 'BTC', maxLeverage: 50 },
        initialTab: 'position',
      },
    });
  });

  it('limits positions to max 5', () => {
    setCachedPositions([
      makePosition({ symbol: 'BTC', size: '-1' }),
      makePosition({ symbol: 'ETH', size: '1' }),
      makePosition({ symbol: 'SOL', size: '10' }),
      makePosition({ symbol: 'DOGE', size: '-50000' }),
      makePosition({ symbol: 'AVAX', size: '5' }),
      makePosition({ symbol: 'LINK', size: '100' }),
    ]);

    renderWithProvider(<PerpsSection />);

    expect(screen.getByText('Short BTC')).toBeOnTheScreen();
    expect(screen.getByText('Long ETH')).toBeOnTheScreen();
    expect(screen.getByText('Long SOL')).toBeOnTheScreen();
    expect(screen.getByText('Short DOGE')).toBeOnTheScreen();
    expect(screen.getByText('Long AVAX')).toBeOnTheScreen();
    expect(screen.queryByText('Long LINK')).toBeNull();
  });

  it('returns null when perps is disabled', () => {
    jest
      .requireMock('../../../../UI/Perps')
      .selectPerpsEnabledFlag.mockReturnValue(false);

    const { toJSON } = renderWithProvider(<PerpsSection />);

    expect(toJSON()).toBeNull();
  });

  it('starts market data preload on mount but does not stop on unmount', () => {
    const { unmount } = renderWithProvider(<PerpsSection />);
    const EngineMock = jest.requireMock('../../../../../core/Engine');

    expect(
      EngineMock.context.PerpsController.startMarketDataPreload,
    ).toHaveBeenCalled();

    unmount();

    expect(
      EngineMock.context.PerpsController.stopMarketDataPreload,
    ).not.toHaveBeenCalled();
  });

  it('does not crash when PerpsController is absent from Engine.context', () => {
    const EngineMock = jest.requireMock('../../../../../core/Engine');
    const original = EngineMock.context.PerpsController;
    EngineMock.context.PerpsController = undefined;

    expect(() => renderWithProvider(<PerpsSection />)).not.toThrow();

    EngineMock.context.PerpsController = original;
  });

  it('does not call stopMarketDataPreload when perps is disabled', () => {
    jest
      .requireMock('../../../../UI/Perps')
      .selectPerpsEnabledFlag.mockReturnValue(false);

    const { unmount } = renderWithProvider(<PerpsSection />);
    const EngineMock = jest.requireMock('../../../../../core/Engine');

    expect(
      EngineMock.context.PerpsController.startMarketDataPreload,
    ).not.toHaveBeenCalled();

    unmount();

    expect(
      EngineMock.context.PerpsController.stopMarketDataPreload,
    ).not.toHaveBeenCalled();
  });

  it('shows skeleton placeholder while positions are loading', () => {
    jest
      .requireMock('../../../../UI/Perps/selectors/perpsController')
      .selectCachedPositions.mockReturnValue(null);

    renderWithProvider(<PerpsSection />);

    expect(screen.getByTestId('skeleton-placeholder')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('homepage-perps-positions'),
    ).not.toBeOnTheScreen();
  });

  it('hides skeleton and shows positions after data loads', () => {
    jest
      .requireMock('../../../../UI/Perps/selectors/perpsController')
      .selectCachedPositions.mockReturnValue([]);

    renderWithProvider(<PerpsSection />);

    expect(screen.getByTestId('homepage-perps-positions')).toBeOnTheScreen();
    expect(screen.queryByTestId('skeleton-placeholder')).not.toBeOnTheScreen();
  });
});
