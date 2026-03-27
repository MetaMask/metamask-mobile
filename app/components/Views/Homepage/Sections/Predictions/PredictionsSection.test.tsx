import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictionsSection from './PredictionsSection';
import Routes from '../../../../../constants/navigation/Routes';
import { PREDICT_CLAIM_BUTTON_TEST_IDS } from '../../../../UI/Predict/components/PredictActionButtons/PredictClaimButton.testIds';

const mockNavigate = jest.fn();
const mockClaim = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../UI/Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: jest.fn(() => true),
}));

jest.mock('../../../../UI/Predict/hooks/usePredictClaim', () => ({
  usePredictClaim: () => ({ claim: mockClaim }),
}));

jest.mock('../../../../UI/Predict/hooks/useUnrealizedPnL', () => ({
  useUnrealizedPnL: jest.fn(() => ({
    data: { cashUpnl: 10, percentUpnl: 5, user: '0x0' },
    isLoading: false,
    error: null,
  })),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: jest.fn(() => false),
}));

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(() => Promise.resolve()),
    })),
  };
});

// Mock the hooks
jest.mock('./hooks', () => ({
  usePredictMarketsForHomepage: jest.fn(() => ({
    markets: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  usePredictPositionsForHomepage: jest.fn(() => ({
    positions: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(() => ({ onLayout: jest.fn() })),
  HomeSectionNames: {
    TOKENS: 'tokens',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
    TRENDING_TOKENS: 'trending_tokens',
    TRENDING_PERPS: 'trending_perps',
    TRENDING_PREDICT: 'trending_predict',
  },
}));

const mockUsePredictMarketsForHomepage =
  jest.requireMock('./hooks').usePredictMarketsForHomepage;
const mockUsePredictPositionsForHomepage =
  jest.requireMock('./hooks').usePredictPositionsForHomepage;
const mockSelectPrivacyMode = jest.requireMock(
  '../../../../../selectors/preferencesController',
).selectPrivacyMode as jest.Mock;

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

const mockMarkets = [
  {
    id: 'market-1',
    title: 'Will BTC reach 100k?',
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

describe('PredictionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClaim.mockResolvedValue(undefined);
    mockSelectPrivacyMode.mockReturnValue(false);

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
      refetch: jest.fn(),
    });

    mockUsePredictPositionsForHomepage.mockImplementation(
      (_options: { maxPositions?: number; claimable?: boolean } = {}) => ({
        positions: [],
        isLoading: false,
        error: null,
        totalClaimableValue: 0,
        refetch: jest.fn(),
      }),
    );
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
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? [] : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );
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
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: [],
          isLoading: !claimable, // only active positions loading
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );

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
        refetch: jest.fn(),
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
        refetch: jest.fn(),
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
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('error state', () => {
    it('returns null when markets fail to load', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: 'Network error',
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders loading state instead of returning null while data is still loading', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).not.toBeNull();
    });
  });

  describe('claim button', () => {
    beforeEach(() => {
      // Show positions so the positions branch renders
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? [] : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );
    });

    it('does not show claim button when there are no claimable positions', () => {
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.queryByText(/Claim \$/)).not.toBeOnTheScreen();
    });

    it('shows claim button with total amount when claimable positions exist', async () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? mockClaimablePositions : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: claimable ? 200 : 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });
    });

    it('does not show claim button while claimable positions are loading', () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: [],
          isLoading: claimable, // claimable fetch still loading
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.queryByText(/Claim \$/)).not.toBeOnTheScreen();
    });

    it('does not show claim button while active positions are loading', () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: [],
          isLoading: !claimable, // active fetch still loading
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.queryByText(/Claim \$/)).not.toBeOnTheScreen();
    });

    it('calls claim on press without manual refresh', async () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? mockClaimablePositions : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: claimable ? 200 : 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });

      fireEvent.press(screen.getByText('Claim $200.00'));

      await waitFor(() => {
        expect(mockClaim).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('privacy mode', () => {
    beforeEach(() => {
      mockSelectPrivacyMode.mockReturnValue(true);
    });

    it('hides monetary values on position rows', async () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? [] : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Test Position 1')).toBeOnTheScreen();
      });

      expect(screen.queryByText('$10 on Yes to win $15')).toBeNull();
      expect(screen.queryByText('$12')).toBeNull();
      expect(screen.queryByText('20%')).toBeNull();
      expect(screen.queryByText('-40%')).toBeNull();
      expect(screen.queryAllByText(/•+/).length).toBeGreaterThan(0);
    });

    it('masks claim amount and still invokes claim on press', async () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? mockClaimablePositions : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: claimable ? 200 : 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(
            PREDICT_CLAIM_BUTTON_TEST_IDS.PREDICT_CLAIM_BUTTON,
          ),
        ).toBeOnTheScreen();
      });

      expect(screen.queryByText('Claim $200.00')).toBeNull();

      fireEvent.press(
        screen.getByTestId(PREDICT_CLAIM_BUTTON_TEST_IDS.PREDICT_CLAIM_BUTTON),
      );

      await waitFor(() => {
        expect(mockClaim).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('refresh functionality', () => {
    it('refreshes both positions and markets on pull-to-refresh', async () => {
      const mockRefetchPositions = jest.fn().mockResolvedValue(undefined);
      const mockRefetchMarkets = jest.fn().mockResolvedValue(undefined);

      mockUsePredictPositionsForHomepage.mockImplementation(
        (_options: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: [],
          isLoading: false,
          error: null,
          totalClaimableValue: 0,
          refetch: mockRefetchPositions,
        }),
      );
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: mockRefetchMarkets,
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

      expect(mockRefetchPositions).toHaveBeenCalled();
      expect(mockRefetchMarkets).toHaveBeenCalled();
    });
  });

  describe('mode="positions-only"', () => {
    it('renders positions when user has positions', () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: mockActivePositions,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="positions-only"
        />,
      );

      expect(screen.getByText('Test Position 1')).toBeOnTheScreen();
    });

    it('returns null when no positions after loading', () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="positions-only"
        />,
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('mode="trending-only"', () => {
    it('renders markets carousel when markets are available', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="trending-only"
        />,
      );

      expect(screen.getByText('Will BTC reach 100k?')).toBeOnTheScreen();
    });

    it('uses titleOverride when provided', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="trending-only"
          titleOverride="Trending predictions"
        />,
      );

      expect(screen.getByText('Trending predictions')).toBeOnTheScreen();
    });

    it('returns null when no markets after loading', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="trending-only"
        />,
      );

      expect(toJSON()).toBeNull();
    });
  });
});
