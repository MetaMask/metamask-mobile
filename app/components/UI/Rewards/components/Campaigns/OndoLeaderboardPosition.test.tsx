import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import OndoLeaderboardPosition, {
  ONDO_LEADERBOARD_POSITION_TEST_IDS,
} from './OndoLeaderboardPosition';
import { useGetOndoLeaderboardPosition } from '../../hooks/useGetOndoLeaderboardPosition';
import type { CampaignLeaderboardPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../../selectors/rewards';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
  selectCampaignParticipantOptedIn: jest.fn(),
}));

jest.mock('../../hooks/useGetOndoLeaderboardPosition');

const mockUseGetOndoLeaderboardPosition =
  useGetOndoLeaderboardPosition as jest.MockedFunction<
    typeof useGetOndoLeaderboardPosition
  >;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectCampaignParticipantOptedIn =
  selectCampaignParticipantOptedIn as jest.MockedFunction<
    typeof selectCampaignParticipantOptedIn
  >;

const SUBSCRIPTION_ID = 'sub-456';

function setupSelectors({ isOptedIn = true }: { isOptedIn?: boolean } = {}) {
  const mockOptedInSelector = jest.fn().mockReturnValue(isOptedIn);
  mockSelectCampaignParticipantOptedIn.mockReturnValue(mockOptedInSelector);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return SUBSCRIPTION_ID;
    if (selector === mockOptedInSelector) return isOptedIn;
    return undefined;
  });
}

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
      'rewards.ondo_campaign_leaderboard_position.title': 'Your Position',
      'rewards.ondo_campaign_leaderboard_position.rank': 'Rank',
      'rewards.ondo_campaign_leaderboard_position.tier': 'Tier',
      'rewards.ondo_campaign_leaderboard_position.rate_of_return': 'Return',
      'rewards.ondo_campaign_leaderboard_position.total_deposited':
        'Total Deposited',
      'rewards.ondo_campaign_leaderboard_position.current_value':
        'Current Value',
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
  projectedTier: 'MID',
  rateOfReturn: 0.15,
  totalUsdDeposited: 10000.0,
  currentUsdValue: 12500.5,
  computedAt: '2024-03-20T12:00:00.000Z',
  totalInTier: 150,
  netDeposit: 8500.0,
};

describe('OndoLeaderboardPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSelectors();
  });

  describe('opt-in guard', () => {
    it('renders nothing when user is not opted in', () => {
      setupSelectors({ isOptedIn: false });
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: false,
        hasError: false,
        hasFetched: false,
        refetch: mockRefetch,
      });

      const { queryByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        queryByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.LOADING),
      ).toBeNull();
      expect(
        queryByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.ERROR),
      ).toBeNull();
      expect(
        queryByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.NOT_FOUND),
      ).toBeNull();
      expect(
        queryByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.CONTAINER),
      ).toBeNull();
    });

    it('renders nothing when not opted in even if position data exists', () => {
      setupSelectors({ isOptedIn: false });
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: MOCK_POSITION,
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { queryByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        queryByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.CONTAINER),
      ).toBeNull();
    });
  });

  describe('loading state', () => {
    it('renders skeleton when loading with no data', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: true,
        hasError: false,
        hasFetched: false,
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
        hasFetched: true,
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
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { getByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.ERROR),
      ).toBeDefined();
    });

    it('shows data and hides error banner when has error but position is present', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: MOCK_POSITION,
        isLoading: false,
        hasError: true,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { getByTestId, queryByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.CONTAINER),
      ).toBeDefined();
      expect(
        queryByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.ERROR),
      ).toBeNull();
    });
  });

  describe('initial/unfetched state', () => {
    it('renders nothing before any fetch has completed', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: false,
        hasError: false,
        hasFetched: false,
        refetch: mockRefetch,
      });

      const { queryByTestId } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(
        queryByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.LOADING),
      ).toBeNull();
      expect(
        queryByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.ERROR),
      ).toBeNull();
      expect(
        queryByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.NOT_FOUND),
      ).toBeNull();
      expect(
        queryByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.CONTAINER),
      ).toBeNull();
    });
  });

  describe('not found state', () => {
    it('renders not found message when fetch completed with no data', () => {
      mockUseGetOndoLeaderboardPosition.mockReturnValue({
        position: null,
        isLoading: false,
        hasError: false,
        hasFetched: true,
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
        hasFetched: true,
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
        position: { ...MOCK_POSITION, rateOfReturn: -0.05 },
        isLoading: false,
        hasError: false,
        hasFetched: true,
        refetch: mockRefetch,
      });

      const { getByText } = render(
        <OndoLeaderboardPosition campaignId={CAMPAIGN_ID} />,
      );

      expect(getByText('-5.00%')).toBeDefined();
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
        hasFetched: false,
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
        hasFetched: false,
        refetch: mockRefetch,
      });

      render(<OndoLeaderboardPosition campaignId={undefined} />);

      expect(mockUseGetOndoLeaderboardPosition).toHaveBeenCalledWith(undefined);
    });
  });
});
