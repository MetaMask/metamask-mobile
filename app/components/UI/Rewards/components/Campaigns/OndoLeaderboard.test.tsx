import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoLeaderboard, {
  CAMPAIGN_LEADERBOARD_TEST_IDS,
} from './OndoLeaderboard';
import type { CampaignLeaderboardEntry } from '../../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock(
  '../../../../../component-library/components-temp/Tabs/TabsBar',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        tabs,
        activeIndex,
        onTabPress,
        testID,
      }: {
        tabs: { key: string; label: string }[];
        activeIndex: number;
        onTabPress: (index: number) => void;
        testID?: string;
      }) =>
        ReactActual.createElement(
          View,
          { testID },
          tabs.map((tab, idx) =>
            ReactActual.createElement(
              Pressable,
              {
                key: tab.key,
                onPress: () => onTabPress(idx),
                testID: `tab-${tab.key}`,
              },
              ReactActual.createElement(
                Text,
                { style: idx === activeIndex ? { fontWeight: 'bold' } : {} },
                tab.label,
              ),
            ),
          ),
        ),
    };
  },
);

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
      'rewards.ondo_campaign_leaderboard.title': 'Leaderboard',
      'rewards.ondo_campaign_leaderboard.updated_at': `Updated at ${params?.time ?? ''}`,
      'rewards.ondo_campaign_leaderboard.total_participants': `${params?.count ?? ''} participants`,
      'rewards.ondo_campaign_leaderboard.no_data':
        'No leaderboard data available',
      'rewards.ondo_campaign_leaderboard.no_entries_in_tier':
        'No entries in this tier',
      'rewards.ondo_campaign_leaderboard.error_loading':
        'Failed to load leaderboard',
      'rewards.ondo_campaign_leaderboard.error_loading_description':
        'Please try again',
      'rewards.ondo_campaign_leaderboard.retry': 'Retry',
    };
    return translations[key] || key;
  },
}));

const createMockEntry = (
  overrides: Partial<CampaignLeaderboardEntry> = {},
): CampaignLeaderboardEntry => ({
  rank: 1,
  referralCode: 'ABC123',
  rateOfReturn: 0.15,
  ...overrides,
});

const defaultProps = {
  tierNames: ['STARTER', 'MID', 'UPPER'],
  selectedTier: 'STARTER',
  onTierChange: jest.fn(),
  entries: [
    createMockEntry({ rank: 1, referralCode: 'AAA111', rateOfReturn: 0.2 }),
    createMockEntry({ rank: 2, referralCode: 'BBB222', rateOfReturn: 0.15 }),
    createMockEntry({
      rank: 3,
      referralCode: 'CCC333',
      rateOfReturn: -0.05,
    }),
  ],
  totalParticipants: 150,
  computedAt: '2024-03-20T12:00:00.000Z',
  isLoading: false,
  hasError: false,
  onRetry: jest.fn(),
};

describe('OndoLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('renders skeleton when loading with no data', () => {
      const { getByTestId } = render(
        <OndoLeaderboard {...defaultProps} isLoading entries={[]} />,
      );

      expect(getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.LOADING)).toBeDefined();
    });

    it('does not render skeleton when loading but has data', () => {
      const { queryByTestId, getByTestId } = render(
        <OndoLeaderboard {...defaultProps} isLoading />,
      );

      expect(queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.LOADING)).toBeNull();
      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.CONTAINER),
      ).toBeDefined();
    });
  });

  describe('error state', () => {
    it('renders error banner when has error and no data', () => {
      const { getByTestId } = render(
        <OndoLeaderboard {...defaultProps} hasError entries={[]} />,
      );

      expect(getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.ERROR)).toBeDefined();
    });

    it('does not render error banner when has error but data is present', () => {
      const { getByTestId, queryByTestId } = render(
        <OndoLeaderboard {...defaultProps} hasError />,
      );

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.CONTAINER),
      ).toBeDefined();
      expect(queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.ERROR)).toBeNull();
    });

    it('calls onRetry when error retry is pressed', () => {
      const { getByTestId } = render(
        <OndoLeaderboard {...defaultProps} hasError entries={[]} />,
      );

      fireEvent.press(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ERROR}-retry`),
      );
      expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('not yet computed state', () => {
    it('renders info banner when leaderboard not yet computed and no data', () => {
      const { getByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          isLeaderboardNotYetComputed
          entries={[]}
          tierNames={[]}
        />,
      );

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.NOT_YET_COMPUTED),
      ).toBeDefined();
    });

    it('does not render info banner when still loading', () => {
      const { queryByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          isLeaderboardNotYetComputed
          isLoading
          entries={[]}
          tierNames={[]}
        />,
      );

      expect(
        queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.NOT_YET_COMPUTED),
      ).toBeNull();
    });
  });

  describe('empty state', () => {
    it('renders empty state when no tier names', () => {
      const { getByTestId } = render(
        <OndoLeaderboard {...defaultProps} tierNames={[]} />,
      );

      expect(getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.EMPTY)).toBeDefined();
    });
  });

  describe('leaderboard content', () => {
    it('renders container with leaderboard title', () => {
      const { getByTestId, getByText } = render(
        <OndoLeaderboard {...defaultProps} />,
      );

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.CONTAINER),
      ).toBeDefined();
      expect(getByText('Leaderboard')).toBeDefined();
    });

    it('does not render title when showTitle is false', () => {
      const { queryByText } = render(
        <OndoLeaderboard {...defaultProps} showTitle={false} />,
      );

      expect(queryByText('Leaderboard')).toBeNull();
    });

    it('renders computed at timestamp', () => {
      const { getByTestId } = render(<OndoLeaderboard {...defaultProps} />);

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.COMPUTED_AT),
      ).toBeDefined();
    });

    it('does not render computed at when null', () => {
      const { queryByTestId } = render(
        <OndoLeaderboard {...defaultProps} computedAt={null} />,
      );

      expect(
        queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.COMPUTED_AT),
      ).toBeNull();
    });

    it('renders tier tabs when multiple tiers', () => {
      const { getByTestId } = render(<OndoLeaderboard {...defaultProps} />);

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.TIER_TOGGLE),
      ).toBeDefined();
    });

    it('does not render tier tabs when single tier', () => {
      const { queryByTestId } = render(
        <OndoLeaderboard {...defaultProps} tierNames={['STARTER']} />,
      );

      expect(
        queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.TIER_TOGGLE),
      ).toBeNull();
    });

    it('renders computed at timestamp for single-tier leaderboard', () => {
      const { getByTestId } = render(
        <OndoLeaderboard {...defaultProps} tierNames={['STARTER']} />,
      );

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.COMPUTED_AT),
      ).toBeDefined();
    });

    it('calls onTierChange when tab is pressed', () => {
      const onTierChange = jest.fn();
      const { getByTestId } = render(
        <OndoLeaderboard {...defaultProps} onTierChange={onTierChange} />,
      );

      fireEvent.press(getByTestId('tab-MID'));
      expect(onTierChange).toHaveBeenCalledWith('MID');
    });

    it('renders total participants count', () => {
      const { getByText } = render(<OndoLeaderboard {...defaultProps} />);

      expect(getByText('150 participants')).toBeDefined();
    });

    it('renders leaderboard list', () => {
      const { getByTestId } = render(<OndoLeaderboard {...defaultProps} />);

      expect(getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.LIST)).toBeDefined();
    });

    it('renders entry rows with correct data', () => {
      const { getByTestId, getByText } = render(
        <OndoLeaderboard {...defaultProps} />,
      );

      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-1`),
      ).toBeDefined();
      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-2`),
      ).toBeDefined();
      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-3`),
      ).toBeDefined();

      expect(getByText('#1')).toBeDefined();
      expect(getByText('AAA111')).toBeDefined();
      expect(getByText('+20.00%')).toBeDefined();

      expect(getByText('#2')).toBeDefined();
      expect(getByText('BBB222')).toBeDefined();
      expect(getByText('+15.00%')).toBeDefined();

      expect(getByText('#3')).toBeDefined();
      expect(getByText('CCC333')).toBeDefined();
      expect(getByText('-5.00%')).toBeDefined();
    });

    it('renders empty entries message when no entries', () => {
      const { getByText } = render(
        <OndoLeaderboard {...defaultProps} entries={[]} />,
      );

      expect(getByText('No entries in this tier')).toBeDefined();
    });
  });

  describe('currentUserReferralCode highlighting', () => {
    it('renders all entry rows regardless of currentUserReferralCode', () => {
      const { getByTestId } = render(
        <OndoLeaderboard {...defaultProps} currentUserReferralCode="BBB222" />,
      );

      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-1`),
      ).toBeDefined();
      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-2`),
      ).toBeDefined();
    });

    it('renders without currentUserReferralCode', () => {
      const { getByTestId } = render(
        <OndoLeaderboard {...defaultProps} currentUserReferralCode={null} />,
      );

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.CONTAINER),
      ).toBeDefined();
    });
  });

  describe('rate of return formatting', () => {
    it('formats positive rate of return with plus sign', () => {
      const entries = [createMockEntry({ rank: 1, rateOfReturn: 0.1523 })];
      const { getByText } = render(
        <OndoLeaderboard {...defaultProps} entries={entries} />,
      );

      expect(getByText('+15.23%')).toBeDefined();
    });

    it('formats negative rate of return without plus sign', () => {
      const entries = [createMockEntry({ rank: 1, rateOfReturn: -0.0832 })];
      const { getByText } = render(
        <OndoLeaderboard {...defaultProps} entries={entries} />,
      );

      expect(getByText('-8.32%')).toBeDefined();
    });

    it('formats zero rate of return with plus sign', () => {
      const entries = [createMockEntry({ rank: 1, rateOfReturn: 0 })];
      const { getByText } = render(
        <OndoLeaderboard {...defaultProps} entries={entries} />,
      );

      expect(getByText('+0.00%')).toBeDefined();
    });
  });
});
