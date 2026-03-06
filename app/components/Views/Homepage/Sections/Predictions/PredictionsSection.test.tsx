import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictionsSection from './PredictionsSection';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockClaim = jest.fn();
const mockRefreshPositions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../components/FadingScrollContainer', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
    }: {
      children: (props: {
        onScroll: () => void;
        scrollEventThrottle: number;
      }) => React.ReactNode;
    }) => (
      <View testID="fading-scroll-container">
        {children({ onScroll: jest.fn(), scrollEventThrottle: 16 })}
      </View>
    ),
  };
});

jest.mock('../../../../UI/Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: jest.fn(() => true),
}));

jest.mock('../../../../UI/Predict/hooks/usePredictClaim', () => ({
  usePredictClaim: () => ({ claim: mockClaim }),
}));

// Mock the hooks
jest.mock('./hooks', () => ({
  usePredictMarketsForHomepage: jest.fn(() => ({
    markets: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  })),
  usePredictPositionsForHomepage: jest.fn(() => ({
    positions: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  })),
}));

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(),
  HomeSectionNames: {
    TOKENS: 'tokens',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
  },
}));

const mockUsePredictMarketsForHomepage =
  jest.requireMock('./hooks').usePredictMarketsForHomepage;
const mockUsePredictPositionsForHomepage =
  jest.requireMock('./hooks').usePredictPositionsForHomepage;

const mockActivePositions = [
  {
    outcomeId: 'outcome-1',
    outcomeIndex: 0,
    marketId: 'market-1',
    title: 'Test Position 1',
    outcome: 'Yes',
    icon: 'https://example.com/icon1.png',
    initialValue: 10,
    currentValue: 12,
    size: 15,
    percentPnl: 20,
    claimable: false,
  },
  {
    outcomeId: 'outcome-2',
    outcomeIndex: 0,
    marketId: 'market-2',
    title: 'Test Position 2',
    outcome: 'No',
    icon: 'https://example.com/icon2.png',
    initialValue: 5,
    currentValue: 3,
    size: 8,
    percentPnl: -40,
    claimable: false,
  },
];

const mockClaimablePositions = [
  {
    outcomeId: 'claimable-outcome-1',
    outcomeIndex: 0,
    marketId: 'claimable-market-1',
    title: 'Claimable Position',
    outcome: 'Yes',
    icon: 'https://example.com/icon-claimable.png',
    initialValue: 10,
    currentValue: 75,
    size: 75,
    percentPnl: 650,
    claimable: true,
  },
  {
    outcomeId: 'claimable-outcome-2',
    outcomeIndex: 0,
    marketId: 'claimable-market-2',
    title: 'Claimable Position 2',
    outcome: 'Yes',
    icon: 'https://example.com/icon-claimable2.png',
    initialValue: 10,
    currentValue: 125,
    size: 125,
    percentPnl: 1150,
    claimable: true,
  },
];

describe('PredictionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClaim.mockResolvedValue({ wasCancelled: false });
    mockRefreshPositions.mockResolvedValue(undefined);

    // Reset mock return value to default (true) to ensure test isolation
    jest
      .requireMock('../../../../UI/Predict/selectors/featureFlags')
      .selectPredictEnabledFlag.mockReturnValue(true);

    // Reset hooks to default state - include a market so the section renders
    mockUsePredictMarketsForHomepage.mockReturnValue({
      markets: [
        {
          id: 'default-market',
          title: 'Default Market',
          endDate: '2026-06-01',
          outcomes: [
            {
              id: 'outcome-1',
              title: 'Yes',
              tokens: [{ title: 'Yes', price: 0.5 }],
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    mockUsePredictPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: false,
      error: null,
      refresh: mockRefreshPositions,
    });
  });

  it('renders section title when enabled', () => {
    renderWithProvider(
      <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('Predictions')).toBeOnTheScreen();
  });

  it('navigates to predictions market list on title press', () => {
    renderWithProvider(
      <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByText('Predictions'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
    });
  });

  it('returns null when predict is disabled', () => {
    jest
      .requireMock('../../../../UI/Predict/selectors/featureFlags')
      .selectPredictEnabledFlag.mockReturnValue(false);

    const { toJSON } = renderWithProvider(
      <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(toJSON()).toBeNull();
  });

  describe('when user has positions', () => {
    beforeEach(() => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: mockActivePositions,
        isLoading: false,
        error: null,
        refresh: mockRefreshPositions,
      });
    });

    it('renders positions when user has them', async () => {
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Test Position 1')).toBeOnTheScreen();
        expect(screen.getByText('Test Position 2')).toBeOnTheScreen();
      });
    });

    it('shows position skeletons when loading positions', () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: true,
        error: null,
        refresh: mockRefreshPositions,
      });

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.queryByText('Test Position 1')).not.toBeOnTheScreen();
    });
  });

  describe('when user has no positions', () => {
    const mockMarkets = [
      {
        id: 'market-1',
        title: 'Will ETH reach $5000?',
        endDate: '2026-03-01',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            image: 'https://example.com/yes.png',
            tokens: [{ title: 'Yes', price: 0.55 }],
          },
          {
            id: 'outcome-2',
            title: 'No',
            image: 'https://example.com/no.png',
            tokens: [{ title: 'No', price: 0.45 }],
          },
        ],
      },
    ];

    it('renders trending markets when user has no positions', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Will ETH reach $5000?')).toBeOnTheScreen();
      });
    });

    it('shows market skeletons when loading markets', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
      });

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      // Should still show the title
      expect(screen.getByText('Predictions')).toBeOnTheScreen();
    });

    it('returns null when markets are empty and not loading', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('error state', () => {
    it('renders error state when markets fail to load', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: 'Network error',
        refresh: jest.fn(),
      });

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByText('Unable to load predictions')).toBeOnTheScreen();
      expect(screen.getByText('Retry')).toBeOnTheScreen();
    });

    it('does not render error state while still loading', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
      });

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(
        screen.queryByText('Unable to load predictions'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('claim button', () => {
    beforeEach(() => {
      // Show active positions so the positions branch renders
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: mockActivePositions,
        isLoading: false,
        error: null,
        refresh: mockRefreshPositions,
      });
    });

    it('does not show claim button when there are no claimable positions', () => {
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.queryByText(/Claim \$/)).not.toBeOnTheScreen();
    });

    it('shows claim button with total amount when claimable positions exist', async () => {
      // totalClaimable = 75 + 125 = 200
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [...mockActivePositions, ...mockClaimablePositions],
        isLoading: false,
        error: null,
        refresh: mockRefreshPositions,
      });

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });
    });

    it('does not show claim button while positions are loading', () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: true,
        error: null,
        refresh: mockRefreshPositions,
      });

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.queryByText(/Claim \$/)).not.toBeOnTheScreen();
    });

    it('calls claim and then refreshes positions on press', async () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [...mockActivePositions, ...mockClaimablePositions],
        isLoading: false,
        error: null,
        refresh: mockRefreshPositions,
      });

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });

      fireEvent.press(screen.getByText('Claim $200.00'));

      await waitFor(() => {
        expect(mockClaim).toHaveBeenCalledTimes(1);
        expect(mockRefreshPositions).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('refresh functionality', () => {
    it('refreshes positions and markets on refresh', async () => {
      const mockRefreshMarkets = jest.fn().mockResolvedValue(undefined);

      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refresh: mockRefreshMarkets,
      });

      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={1}
          ref={ref}
        />,
      );

      await ref.current?.refresh();

      expect(mockRefreshPositions).toHaveBeenCalled();
      expect(mockRefreshMarkets).toHaveBeenCalled();
    });
  });
});
