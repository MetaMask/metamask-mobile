import React from 'react';
import { render } from '@testing-library/react-native';
import OndoLeaderboardPosition, {
  ONDO_LEADERBOARD_POSITION_TEST_IDS,
} from './OndoLeaderboardPosition';
import type { CampaignLeaderboardPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

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
      'rewards.ondo_campaign_leaderboard_position.updated_at': `Updated ${params?.time ?? ''}`,
    };
    return translations[key] || key;
  },
}));

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

const baseProps = {
  position: null as CampaignLeaderboardPositionDto | null,
  isLoading: false,
  hasError: false,
  hasFetched: false,
  refetch: mockRefetch,
};

describe('OndoLeaderboardPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('renders skeleton when loading with no data', () => {
      const { getByTestId } = render(
        <OndoLeaderboardPosition {...baseProps} isLoading />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.LOADING),
      ).toBeDefined();
    });

    it('does not render skeleton when loading but has data', () => {
      const { queryByTestId, getByTestId } = render(
        <OndoLeaderboardPosition
          {...baseProps}
          position={MOCK_POSITION}
          isLoading
          hasFetched
        />,
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
      const { getByTestId } = render(
        <OndoLeaderboardPosition {...baseProps} hasError hasFetched />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.ERROR),
      ).toBeDefined();
    });

    it('shows data and hides error banner when has error but position is present', () => {
      const { getByTestId, queryByTestId } = render(
        <OndoLeaderboardPosition
          {...baseProps}
          position={MOCK_POSITION}
          hasError
          hasFetched
        />,
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
      const { queryByTestId } = render(
        <OndoLeaderboardPosition {...baseProps} />,
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
      const { getByTestId } = render(
        <OndoLeaderboardPosition {...baseProps} hasFetched />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.NOT_FOUND),
      ).toBeDefined();
    });
  });

  describe('position data display', () => {
    const loadedProps = {
      ...baseProps,
      position: MOCK_POSITION,
      hasFetched: true,
    };

    it('renders position container', () => {
      const { getByTestId } = render(
        <OndoLeaderboardPosition {...loadedProps} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.CONTAINER),
      ).toBeDefined();
    });

    it('does not render title by default (showTitle defaults to false)', () => {
      const { queryByText } = render(
        <OndoLeaderboardPosition {...loadedProps} />,
      );

      expect(queryByText('Your Position')).toBeNull();
    });

    it('renders title when showTitle is true', () => {
      const { getByText } = render(
        <OndoLeaderboardPosition {...loadedProps} showTitle />,
      );

      expect(getByText('Your Position')).toBeDefined();
    });

    it('renders computedAt timestamp when showTitle is true and computedAt is provided', () => {
      const { getByText } = render(
        <OndoLeaderboardPosition
          {...loadedProps}
          showTitle
          computedAt={MOCK_POSITION.computedAt}
        />,
      );

      expect(getByText(/Updated/)).toBeDefined();
    });

    it('does not render computedAt when showTitle is false', () => {
      const { queryByText } = render(
        <OndoLeaderboardPosition
          {...loadedProps}
          computedAt={MOCK_POSITION.computedAt}
        />,
      );

      expect(queryByText(/Updated/)).toBeNull();
    });

    it('renders rank', () => {
      const { getByTestId } = render(
        <OndoLeaderboardPosition {...loadedProps} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.RANK),
      ).toBeDefined();
    });

    it('renders rank value as #5', () => {
      const { getByText } = render(
        <OndoLeaderboardPosition {...loadedProps} />,
      );

      expect(getByText('#5')).toBeDefined();
    });

    it('renders projected tier', () => {
      const { getByTestId } = render(
        <OndoLeaderboardPosition {...loadedProps} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.TIER),
      ).toBeDefined();
    });

    it('renders tier value', () => {
      const { getByText } = render(
        <OndoLeaderboardPosition {...loadedProps} />,
      );

      expect(getByText('MID')).toBeDefined();
    });

    it('renders rate of return with positive sign', () => {
      const { getByText } = render(
        <OndoLeaderboardPosition {...loadedProps} />,
      );

      expect(getByText('+15.00%')).toBeDefined();
    });

    it('renders negative rate of return without plus sign', () => {
      const { getByText } = render(
        <OndoLeaderboardPosition
          {...baseProps}
          position={{ ...MOCK_POSITION, rateOfReturn: -0.05 }}
          hasFetched
        />,
      );

      expect(getByText('-5.00%')).toBeDefined();
    });

    it('renders total deposited and current value stat cells', () => {
      const { getByTestId } = render(
        <OndoLeaderboardPosition {...loadedProps} />,
      );

      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.TOTAL_DEPOSITED),
      ).toBeDefined();
      expect(
        getByTestId(ONDO_LEADERBOARD_POSITION_TEST_IDS.CURRENT_VALUE),
      ).toBeDefined();
    });
  });
});
