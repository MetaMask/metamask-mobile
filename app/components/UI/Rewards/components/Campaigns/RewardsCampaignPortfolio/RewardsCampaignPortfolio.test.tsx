import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RewardsCampaignPortfolio from './RewardsCampaignPortfolio';
import { useCampaignPortfolio } from '../../../hooks/useCampaignPortfolio';
import type { CampaignPortfolioDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('../../../hooks/useCampaignPortfolio', () => ({
  useCampaignPortfolio: jest.fn(),
}));

jest.mock('../../../../Trending/components/TrendingTokenLogo', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockTrendingTokenLogo({
    assetId,
    symbol,
  }: {
    assetId: string;
    symbol?: string;
  }) {
    return (
      <View testID="trending-token-logo">
        <Text>{assetId}</Text>
        <Text>{symbol}</Text>
      </View>
    );
  };
});

jest.mock('../../RewardsErrorBanner', () => {
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return function MockRewardsErrorBanner({
    title,
    description,
    onConfirm,
    confirmButtonLabel,
    testID,
  }: {
    title: string;
    description: string;
    onConfirm?: () => void;
    confirmButtonLabel?: string;
    testID?: string;
  }) {
    return (
      <View testID={testID}>
        <Text testID="error-banner-title">{title}</Text>
        <Text testID="error-banner-description">{description}</Text>
        {onConfirm && (
          <Pressable testID="error-banner-retry" onPress={onConfirm}>
            <Text>{confirmButtonLabel}</Text>
          </Pressable>
        )}
      </View>
    );
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.campaign_portfolio.error_title': 'Unable to load portfolio',
      'rewards.campaign_portfolio.error_description':
        "We couldn't load your campaign portfolio. Please try again.",
      'rewards.campaign_portfolio.retry': 'Retry',
      'rewards.campaign_portfolio.empty_state':
        'No positions yet. Start trading to build your portfolio.',
    };
    return translations[key] || key;
  },
}));

const mockUseCampaignPortfolio = useCampaignPortfolio as jest.MockedFunction<
  typeof useCampaignPortfolio
>;

const CAMPAIGN_ID = 'campaign-123';

const createMockPortfolio = (
  overrides: Partial<CampaignPortfolioDto> = {},
): CampaignPortfolioDto => ({
  positions: [
    {
      tokenSymbol: 'AAPLon',
      tokenName: 'Apple Inc.',
      tokenAddresses: ['eip155:1/erc20:0x123' as const],
      units: '45.2',
      costBasis: '9040.00',
      avgCostPerUnit: '200.00',
      currentPrice: '215.50',
      currentValue: '9740.60',
      unrealizedPnl: '700.60',
      unrealizedPnlPercent: '7.75',
    },
    {
      tokenSymbol: 'GOOGon',
      tokenName: 'Alphabet Inc.',
      tokenAddresses: ['eip155:1/erc20:0x456' as const],
      units: '10.0',
      costBasis: '1500.00',
      avgCostPerUnit: '150.00',
      currentPrice: '145.00',
      currentValue: '1450.00',
      unrealizedPnl: '-50.00',
      unrealizedPnlPercent: '-3.33',
    },
  ],
  summary: {
    totalCurrentValue: '11190.60',
    totalCostBasis: '10540.00',
    totalUsdDeposited: '10000.00',
    netDeposit: '10540.00',
    portfolioPnl: '1190.60',
    portfolioPnlPercent: '11.90',
  },
  computedAt: '2026-03-23T10:30:00.000Z',
  ...overrides,
});

const mockRefetch = jest.fn();

function setupHook({
  portfolio = null,
  isLoading = false,
  hasError = false,
}: {
  portfolio?: CampaignPortfolioDto | null;
  isLoading?: boolean;
  hasError?: boolean;
} = {}) {
  mockUseCampaignPortfolio.mockReturnValue({
    portfolio,
    isLoading,
    hasError,
    refetch: mockRefetch,
  });
}

describe('RewardsCampaignPortfolio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows skeleton when loading and no portfolio data', () => {
      setupHook({ isLoading: true, portfolio: null });

      const { getByTestId, queryByTestId } = render(
        <RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(RewardsCampaignPortfolio.testIds.LOADING_SKELETON),
      ).toBeDefined();
      expect(
        queryByTestId(RewardsCampaignPortfolio.testIds.CONTAINER),
      ).toBeNull();
      expect(
        queryByTestId(RewardsCampaignPortfolio.testIds.ERROR_CONTAINER),
      ).toBeNull();
    });

    it('shows content when loading but has cached portfolio data', () => {
      setupHook({ isLoading: true, portfolio: createMockPortfolio() });

      const { getByTestId, queryByTestId } = render(
        <RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(RewardsCampaignPortfolio.testIds.CONTAINER),
      ).toBeDefined();
      expect(
        queryByTestId(RewardsCampaignPortfolio.testIds.LOADING_SKELETON),
      ).toBeNull();
    });
  });

  describe('error state', () => {
    it('shows error banner when error and no portfolio data', () => {
      setupHook({ hasError: true, portfolio: null });

      const { getByTestId, queryByTestId } = render(
        <RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(RewardsCampaignPortfolio.testIds.ERROR_CONTAINER),
      ).toBeDefined();
      expect(
        getByTestId(RewardsCampaignPortfolio.testIds.ERROR_BANNER),
      ).toBeDefined();
      expect(getByTestId('error-banner-title')).toHaveTextContent(
        'Unable to load portfolio',
      );
      expect(getByTestId('error-banner-description')).toHaveTextContent(
        "We couldn't load your campaign portfolio. Please try again.",
      );
      expect(
        queryByTestId(RewardsCampaignPortfolio.testIds.CONTAINER),
      ).toBeNull();
    });

    it('calls refetch when retry button is pressed', () => {
      setupHook({ hasError: true, portfolio: null });

      const { getByTestId } = render(
        <RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />,
      );

      fireEvent.press(getByTestId('error-banner-retry'));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('shows content when error but has cached portfolio data', () => {
      setupHook({ hasError: true, portfolio: createMockPortfolio() });

      const { getByTestId, queryByTestId } = render(
        <RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(RewardsCampaignPortfolio.testIds.CONTAINER),
      ).toBeDefined();
      expect(
        queryByTestId(RewardsCampaignPortfolio.testIds.ERROR_CONTAINER),
      ).toBeNull();
    });
  });

  describe('empty state', () => {
    it('shows empty state when portfolio has no positions', () => {
      setupHook({ portfolio: createMockPortfolio({ positions: [] }) });

      const { getByTestId, queryByTestId } = render(
        <RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(RewardsCampaignPortfolio.testIds.EMPTY_STATE),
      ).toBeDefined();
      expect(
        getByTestId(RewardsCampaignPortfolio.testIds.EMPTY_STATE),
      ).toHaveTextContent(
        'No positions yet. Start trading to build your portfolio.',
      );
      expect(
        queryByTestId(RewardsCampaignPortfolio.testIds.CONTAINER),
      ).toBeNull();
    });
  });

  describe('success state', () => {
    it('renders portfolio positions with TrendingTokenLogo', () => {
      setupHook({ portfolio: createMockPortfolio() });

      const { getByTestId, getAllByTestId } = render(
        <RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(RewardsCampaignPortfolio.testIds.CONTAINER),
      ).toBeDefined();

      const logos = getAllByTestId('trending-token-logo');
      expect(logos).toHaveLength(2);

      const positionRows = getAllByTestId(
        RewardsCampaignPortfolio.testIds.POSITION_ROW,
      );
      expect(positionRows).toHaveLength(2);
    });

    it('displays token name and symbol for each position', () => {
      setupHook({ portfolio: createMockPortfolio() });

      const { getByText, getAllByText } = render(
        <RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(getByText('Apple Inc.')).toBeDefined();
      expect(getAllByText('AAPLon').length).toBeGreaterThanOrEqual(1);
      expect(getByText('Alphabet Inc.')).toBeDefined();
      expect(getAllByText('GOOGon').length).toBeGreaterThanOrEqual(1);
    });

    it('displays current value for each position', () => {
      setupHook({ portfolio: createMockPortfolio() });

      const { getByText } = render(
        <RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(getByText('$9740.60')).toBeDefined();
      expect(getByText('$1450.00')).toBeDefined();
    });

    it('displays positive PnL with plus sign', () => {
      setupHook({ portfolio: createMockPortfolio() });

      const { getByText } = render(
        <RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(getByText('+7.75%')).toBeDefined();
    });

    it('displays negative PnL without plus sign', () => {
      setupHook({ portfolio: createMockPortfolio() });

      const { getByText } = render(
        <RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />,
      );

      expect(getByText('-3.33%')).toBeDefined();
    });
  });

  describe('hook invocation', () => {
    it('calls useCampaignPortfolio with campaignId', () => {
      setupHook();

      render(<RewardsCampaignPortfolio campaignId={CAMPAIGN_ID} />);

      expect(mockUseCampaignPortfolio).toHaveBeenCalledWith(CAMPAIGN_ID);
    });
  });
});
