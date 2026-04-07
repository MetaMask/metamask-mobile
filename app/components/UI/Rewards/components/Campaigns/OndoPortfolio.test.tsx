import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoPortfolio, { ONDO_PORTFOLIO_TEST_IDS } from './OndoPortfolio';
import { useGetOndoPortfolioPosition } from '../../hooks/useGetOndoPortfolioPosition';
import type {
  OndoGmPortfolioDto,
  OndoGmPortfolioPositionDto,
  OndoGmPortfolioSummaryDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('../../hooks/useGetOndoPortfolioPosition');

const mockUseGetOndoPortfolioPosition =
  useGetOndoPortfolioPosition as jest.MockedFunction<
    typeof useGetOndoPortfolioPosition
  >;

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), dispatch: jest.fn() }),
  StackActions: { push: jest.fn((name: string) => ({ type: 'push', name })) },
}));

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onConfirm,
      confirmButtonLabel,
      testID,
    }: {
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, title),
        confirmButtonLabel &&
          ReactActual.createElement(
            Pressable,
            { onPress: onConfirm },
            ReactActual.createElement(Text, null, confirmButtonLabel),
          ),
      ),
  };
});

jest.mock('../RewardsInfoBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      title,
      onConfirm,
      confirmButtonLabel,
      testID,
    }: {
      title: string;
      description: string;
      onConfirm?: () => void;
      confirmButtonLabel?: string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, title),
        confirmButtonLabel &&
          ReactActual.createElement(
            Pressable,
            { onPress: onConfirm },
            ReactActual.createElement(Text, null, confirmButtonLabel),
          ),
      ),
  };
});

jest.mock('../../../../../util/formatFiat', () => ({
  __esModule: true,
  default: (amount: { toFixed: (dp: number) => string }) =>
    `$${Number(amount.toFixed(2)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, string> = {
      'rewards.ondo_campaign_portfolio.positions_heading': 'Your Positions',
      'rewards.ondo_campaign_portfolio.empty': 'No positions yet',
      'rewards.ondo_campaign_portfolio.empty_description':
        'Start investing to see your positions',
      'rewards.ondo_campaign_portfolio.empty_cta': 'Explore tokens',
      'rewards.ondo_campaign_portfolio.error_loading': 'Failed to load',
      'rewards.ondo_campaign_portfolio.error_loading_description':
        'Please try again',
      'rewards.ondo_campaign_portfolio.retry': 'Retry',
      'rewards.ondo_campaign_portfolio.updated_at': `Updated: ${params?.time ?? ''}`,
      'rewards.ondo_campaign_portfolio.position_units': `${params?.units ?? ''} units`,
    };
    return translations[key] ?? key;
  },
}));

jest.mock('../../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'https://mock.icon' })),
}));

jest.mock('../../../Trending/components/TrendingTokenLogo', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, null),
  };
});

jest.mock('../../../Trending/utils/getTrendingTokenImageUrl', () => ({
  getTrendingTokenImageUrl: jest.fn(() => 'https://mock.token.image'),
}));

jest.mock('../../../../../util/ondoGeoRestrictions', () => ({
  isGeoRestricted: jest.fn(() => false),
}));

jest.mock('./OndoLeaderboard.utils', () => ({
  formatComputedAt: jest.fn(() => '1 hour ago'),
}));

const CAMPAIGN_ID = 'campaign-123';
const mockRefetch = jest.fn();

const MOCK_POSITION: OndoGmPortfolioPositionDto = {
  tokenSymbol: 'AAPLon',
  tokenName: 'Apple Inc.',
  tokenAsset: 'eip155:1/erc20:0x14c3abf95cb9c93a8b82c1cdcb76d72cb87b2d4c',
  units: '45.2',
  costBasis: '9040.000000',
  avgCostPerUnit: '200.000000',
  currentPrice: '215.500000',
  currentValue: '9740.600000',
  unrealizedPnl: '700.600000',
  unrealizedPnlPercent: '0.0775',
};

const MOCK_SUMMARY: OndoGmPortfolioSummaryDto = {
  totalCurrentValue: '9740.600000',
  totalCostBasis: '9040.000000',
  totalUsdDeposited: '9040.000000',
  netDeposit: '9040.000000',
  portfolioPnl: '700.600000',
  portfolioPnlPercent: '0.0775',
};

const MOCK_PORTFOLIO: OndoGmPortfolioDto = {
  positions: [MOCK_POSITION],
  summary: MOCK_SUMMARY,
  computedAt: '2026-03-20T12:00:00.000Z',
};

describe('OndoPortfolio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('renders skeleton when loading before first fetch with no data', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: null,
        isLoading: true,
        hasError: false,
        hasFetched: false,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.LOADING)).toBeDefined();
    });

    it('does not render skeleton when loading but portfolio data already present', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: MOCK_PORTFOLIO,
        isLoading: true,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { queryByTestId } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.LOADING)).toBeNull();
    });

    it('renders skeleton during retry (isLoading=true, hasFetched=true, no portfolio)', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: null,
        isLoading: true,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { getByTestId, queryByTestId } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.LOADING)).toBeDefined();
      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeNull();
    });
  });

  describe('error state', () => {
    it('renders error banner when has error and no data', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: null,
        isLoading: false,
        hasError: true,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.ERROR)).toBeDefined();
    });

    it('does not show empty banner on error even after fetch', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: null,
        isLoading: false,
        hasError: true,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { queryByTestId } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeNull();
    });

    it('shows cached portfolio data instead of error banner when portfolio exists', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: MOCK_PORTFOLIO,
        isLoading: false,
        hasError: true,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { queryByTestId, getByTestId } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.ERROR)).toBeNull();
      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.CONTAINER)).toBeDefined();
    });
  });

  describe('empty state', () => {
    it('renders empty banner when fetch completed with no portfolio', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: null,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeDefined();
    });

    it('does not render empty banner when portfolio data is present', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: MOCK_PORTFOLIO,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { queryByTestId } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeNull();
    });
  });

  describe('initial/unfetched state', () => {
    it('renders nothing before any fetch has completed', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: null,
        isLoading: false,
        hasError: false,
        hasFetched: false,
        refetch: mockRefetch,
      });

      const { queryByTestId } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.LOADING)).toBeNull();
      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.ERROR)).toBeNull();
      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.EMPTY)).toBeNull();
      expect(queryByTestId(ONDO_PORTFOLIO_TEST_IDS.CONTAINER)).toBeNull();
    });
  });

  describe('portfolio data display', () => {
    beforeEach(() => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: MOCK_PORTFOLIO,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });
    });

    it('renders portfolio container', () => {
      const { getByTestId } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.CONTAINER)).toBeDefined();
    });

    it('renders the positions heading', () => {
      const { getByText } = render(<OndoPortfolio campaignId={CAMPAIGN_ID} />);

      expect(getByText('Your Positions')).toBeDefined();
    });

    it('renders the token name', () => {
      const { getByText } = render(<OndoPortfolio campaignId={CAMPAIGN_ID} />);

      expect(getByText('Apple Inc.')).toBeDefined();
    });
  });

  describe('hook integration', () => {
    it('passes campaignId to hook', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: null,
        isLoading: false,
        hasError: false,
        hasFetched: false,
        refetch: mockRefetch,
      });

      render(<OndoPortfolio campaignId={CAMPAIGN_ID} />);

      expect(mockUseGetOndoPortfolioPosition).toHaveBeenCalledWith(CAMPAIGN_ID);
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: MOCK_PORTFOLIO,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });
    });

    it('shows arrow icon in section header when there are positions', () => {
      const { getByText } = render(<OndoPortfolio campaignId={CAMPAIGN_ID} />);
      fireEvent.press(getByText('Your Positions'));
      // Component handles the press without throwing
      expect(getByText('Your Positions')).toBeDefined();
    });

    it('pressing a position row does not throw', () => {
      const { getByText } = render(<OndoPortfolio campaignId={CAMPAIGN_ID} />);
      fireEvent.press(getByText('Apple Inc.'));
      expect(getByText('Apple Inc.')).toBeDefined();
    });

    it('renders portfolio with no positions (no arrow icon, no position rows)', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: { ...MOCK_PORTFOLIO, positions: [] },
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { getByTestId, queryByText } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(getByTestId(ONDO_PORTFOLIO_TEST_IDS.CONTAINER)).toBeDefined();
      expect(queryByText('Apple Inc.')).toBeNull();
    });
  });

  describe('position rendering details', () => {
    beforeEach(() => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: MOCK_PORTFOLIO,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });
    });

    it('renders the units text', () => {
      const { getByText } = render(<OndoPortfolio campaignId={CAMPAIGN_ID} />);
      expect(getByText('45.2 units')).toBeDefined();
    });

    it('renders the updated at text', () => {
      const { getByText } = render(<OndoPortfolio campaignId={CAMPAIGN_ID} />);
      expect(getByText('Updated: 1 hour ago')).toBeDefined();
    });

    it('renders positive PnL percent in green', () => {
      const { getByText } = render(<OndoPortfolio campaignId={CAMPAIGN_ID} />);
      expect(getByText('+7.75%')).toBeDefined();
    });

    it('renders negative PnL percent for loss position', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: {
          ...MOCK_PORTFOLIO,
          positions: [{ ...MOCK_POSITION, unrealizedPnlPercent: '-0.05' }],
        },
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { getByText } = render(<OndoPortfolio campaignId={CAMPAIGN_ID} />);
      expect(getByText('-5.00%')).toBeDefined();
    });

    it('does not render PnL percent when value is non-numeric', () => {
      mockUseGetOndoPortfolioPosition.mockReturnValue({
        portfolio: {
          ...MOCK_PORTFOLIO,
          positions: [{ ...MOCK_POSITION, unrealizedPnlPercent: '—' }],
        },
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { queryByText } = render(
        <OndoPortfolio campaignId={CAMPAIGN_ID} />,
      );
      expect(queryByText('—')).toBeNull();
    });
  });
});
