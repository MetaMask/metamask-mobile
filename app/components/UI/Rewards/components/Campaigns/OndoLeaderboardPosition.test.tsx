import React from 'react';
import { render } from '@testing-library/react-native';
import OndoLeaderboardPosition, {
  ONDO_LEADERBOARD_POSITION_TEST_IDS,
} from './OndoLeaderboardPosition';
import { useGetOndoLeaderboardPosition } from '../../hooks/useGetOndoLeaderboardPosition';
import type { CampaignLeaderboardPositionDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('../../hooks/useGetOndoLeaderboardPosition');

const mockUseGetOndoLeaderboardPosition =
  useGetOndoLeaderboardPosition as jest.MockedFunction<
    typeof useGetOndoLeaderboardPosition
  >;

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
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
            { onPress: onConfirm, testID: `${testID}-retry` },
            ReactActual.createElement(Text, null, confirmButtonLabel),
          ),
      ),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, string> = {
      'rewards.ondo_campaign_leaderboard_position.title': 'Your Position',
      'rewards.ondo_campaign_leaderboard_position.rank': 'Rank',
      'rewards.ondo_campaign_leaderboard_position.tier': 'Tier',
      'rewards.ondo_campaign_leaderboard_position.rate_of_return': 'Return',
      'rewards.ondo_campaign_leaderboard_position.total_deposited':
        'Total Deposited',
      'rewards.ondo_campaign_leaderboard_position.current_value':
        'Current Value',
      'rewards.ondo_campaign_leaderboard_position.updated_at': `Updated ${params?.time ?? ''}`,
      'rewards.ondo_campaign_leaderboard_position.not_found':
        'Not on the leaderboard yet',
      'rewards.ondo_campaign_leaderboard_position.error_loading':
        'Failed to load your position',
      'rewards.ondo_campaign_leaderboard_position.retry': 'Retry',
    };
    return translations[key] || key;
  },
}));

const CAMPAIGN_ID = 'campaign-123';
const mockRefetch = jest.fn();

const MOCK_POSITION: CampaignLeaderboardPositionDto = {
  rank: 5,
  projected_tier: 'MID',
  rate_of_return: 0.15,
  total_usd_deposited: 10000.0,
  current_usd_value: 12500.5,
  computed_at: '2024-03-20T12:00:00.000Z',
  total_in_tier: 150,
  net_deposit: 8500.0,
  referral_code: 'ABC123',
};

describe('OndoLeaderboardPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('renders skeleton when loading with no data', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: true,
        hasError: false,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.LOADING),
      ).toBeDefined();
    });

    it('does not render skeleton when loading but has data', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: MOCK_POSITION,
        isLoading: true,
        hasError: false,
        refetch: mockRefetch,
      });

      const { queryByTestId, getByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        queryByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.LOADING),
      ).toBeNull();
      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.CONTAINER),
      ).toBeDefined();
    });
  });

  describe('error state', () => {
    it('renders error banner when has error and no data', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: false,
        hasError: true,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.ERROR),
      ).toBeDefined();
    });

    it('shows data when has error but position is present', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: MOCK_POSITION,
        isLoading: false,
        hasError: true,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.CONTAINER),
      ).toBeDefined();
    });
  });

  describe('not found state', () => {
    it('renders not found message when no data and not loading', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: false,
        hasError: false,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.NOT_FOUND),
      ).toBeDefined();
    });
  });

  describe('position data display', () => {
    beforeEach(() => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: MOCK_POSITION,
        isLoading: false,
        hasError: false,
        refetch: mockRefetch,
      });
    });

    it('renders position container', () => {
      const { getByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.CONTAINER),
      ).toBeDefined();
    });

    it('renders title', () => {
      const { getByText } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(getByText('Your Position')).toBeDefined();
    });

    it('renders rank', () => {
      const { getByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      const rankEl = getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.RANK);
      expect(rankEl).toBeDefined();
    });

    it('renders rank value as #5', () => {
      const { getByText } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(getByText('#5')).toBeDefined();
    });

    it('renders projected tier', () => {
      const { getByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.TIER),
      ).toBeDefined();
    });

    it('renders tier value', () => {
      const { getByText } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(getByText('MID')).toBeDefined();
    });

    it('renders rate of return with positive sign', () => {
      const { getByText } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(getByText('+15.00%')).toBeDefined();
    });

    it('renders negative rate of return without plus sign', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: { ...MOCK_POSITION, rate_of_return: -0.05 },
        isLoading: false,
        hasError: false,
        refetch: mockRefetch,
      });

      const { getByText } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(getByText('-5.00%')).toBeDefined();
    });

    it('renders computed_at timestamp', () => {
      const { getByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.COMPUTED_AT),
      ).toBeDefined();
    });

    it('renders total deposited and current value stat cells', () => {
      const { getByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.TOTAL_DEPOSITED),
      ).toBeDefined();
      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.CURRENT_VALUE),
      ).toBeDefined();
    });
  });

  describe('hook integration', () => {
    it('passes campaignId to hook', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: false,
        hasError: false,
        refetch: mockRefetch,
      });

      render(<OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />);

      expect(mockUseGetOndoLeaderboardPosition).toHaveBeenCalledWith(
        CAMPAIGN_ID,
      );
    });

    it('passes undefined campaignId when not provided', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: false,
        hasError: false,
        refetch: mockRefetch,
      });

      render(<OndoLeaderboardPosition campaignId={undefined} />);

      expect(mockUseGetOndoLeaderboardPosition).toHaveBeenCalledWith(undefined);
    });
  });
});
