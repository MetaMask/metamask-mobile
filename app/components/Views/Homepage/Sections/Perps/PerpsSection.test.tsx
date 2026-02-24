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

jest.mock('../../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(() => true),
}));

// Mock the hooks
jest.mock('./hooks', () => ({
  usePerpsMarketsStandalone: jest.fn(() => ({
    markets: [{ name: 'BTC', maxLeverage: 50 }],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  })),
  usePerpsPositionsStandalone: jest.fn(() => ({
    positions: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  })),
}));

const mockUsePerpsMarketsStandalone =
  jest.requireMock('./hooks').usePerpsMarketsStandalone;
const mockUsePerpsPositionsStandalone =
  jest.requireMock('./hooks').usePerpsPositionsStandalone;

// Mock PerpsMarketCard to simplify tests
jest.mock('./components/PerpsMarketCard', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ market }: { market: { name: string } }) => (
      <Text testID={`market-card-${market.name}`}>{market.name}</Text>
    ),
  };
});

// Mock PerpsPositionRow to simplify tests
jest.mock('./components/PerpsPositionRow', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ position }: { position: { symbol: string; size: string } }) => (
      <Text testID={`position-row-${position.symbol}`}>{position.symbol}</Text>
    ),
  };
});

// Mock PerpsPositionRowSkeleton
jest.mock('./components/PerpsPositionRow/PerpsPositionRowSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="position-skeleton" />,
  };
});

describe('PerpsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .requireMock('../../../../UI/Perps')
      .selectPerpsEnabledFlag.mockReturnValue(true);

    mockUsePerpsMarketsStandalone.mockReturnValue({
      markets: [{ name: 'BTC', maxLeverage: 50 }],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUsePerpsPositionsStandalone.mockReturnValue({
      positions: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  it('renders section title when enabled', () => {
    renderWithProvider(<PerpsSection />);

    expect(screen.getByText('Perpetuals')).toBeOnTheScreen();
  });

  it('navigates to perps home on title press', () => {
    renderWithProvider(<PerpsSection />);

    fireEvent.press(screen.getByText('Perpetuals'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  });

  it('returns null when perps is disabled', () => {
    jest
      .requireMock('../../../../UI/Perps')
      .selectPerpsEnabledFlag.mockReturnValue(false);

    const { toJSON } = renderWithProvider(<PerpsSection />);

    expect(toJSON()).toBeNull();
  });

  describe('when user has positions', () => {
    it('renders position rows', () => {
      mockUsePerpsPositionsStandalone.mockReturnValue({
        positions: [
          { symbol: 'BTC', size: '0.01' },
          { symbol: 'ETH', size: '-1' },
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      renderWithProvider(<PerpsSection />);

      expect(screen.getByTestId('position-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
    });

    it('renders position skeleton when loading', () => {
      mockUsePerpsPositionsStandalone.mockReturnValue({
        positions: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
      });

      renderWithProvider(<PerpsSection />);

      expect(screen.getByTestId('position-skeleton')).toBeOnTheScreen();
    });
  });

  describe('when user has no positions', () => {
    it('renders market cards carousel', () => {
      mockUsePerpsMarketsStandalone.mockReturnValue({
        markets: [
          { name: 'BTC', maxLeverage: 50 },
          { name: 'ETH', maxLeverage: 25 },
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      renderWithProvider(<PerpsSection />);

      expect(screen.getByTestId('market-card-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-card-ETH')).toBeOnTheScreen();
    });

    it('returns null when markets are empty and not loading', () => {
      mockUsePerpsMarketsStandalone.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { toJSON } = renderWithProvider(<PerpsSection />);

      expect(toJSON()).toBeNull();
    });
  });

  describe('error state', () => {
    it('renders error state when markets fail to load', () => {
      mockUsePerpsMarketsStandalone.mockReturnValue({
        markets: [],
        isLoading: false,
        error: 'Network error',
        refresh: jest.fn(),
      });

      renderWithProvider(<PerpsSection />);

      expect(screen.getByText('Unable to load perpetuals')).toBeOnTheScreen();
      expect(screen.getByText('Retry')).toBeOnTheScreen();
    });
  });

  describe('refresh functionality', () => {
    it('refreshes only markets when user has no positions', async () => {
      const mockRefreshPositions = jest.fn();
      const mockRefreshMarkets = jest.fn();

      mockUsePerpsPositionsStandalone.mockReturnValue({
        positions: [],
        isLoading: false,
        error: null,
        refresh: mockRefreshPositions,
      });
      mockUsePerpsMarketsStandalone.mockReturnValue({
        markets: [{ name: 'BTC', maxLeverage: 50 }],
        isLoading: false,
        error: null,
        refresh: mockRefreshMarkets,
      });

      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      renderWithProvider(<PerpsSection ref={ref} />);

      await ref.current?.refresh();

      expect(mockRefreshPositions).not.toHaveBeenCalled();
      expect(mockRefreshMarkets).toHaveBeenCalled();
    });

    it('refreshes both when user has positions', async () => {
      const mockRefreshPositions = jest.fn();
      const mockRefreshMarkets = jest.fn();

      mockUsePerpsPositionsStandalone.mockReturnValue({
        positions: [{ symbol: 'BTC', size: '0.01' }],
        isLoading: false,
        error: null,
        refresh: mockRefreshPositions,
      });
      mockUsePerpsMarketsStandalone.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refresh: mockRefreshMarkets,
      });

      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      renderWithProvider(<PerpsSection ref={ref} />);

      await ref.current?.refresh();

      expect(mockRefreshPositions).toHaveBeenCalled();
      expect(mockRefreshMarkets).toHaveBeenCalled();
    });
  });
});
