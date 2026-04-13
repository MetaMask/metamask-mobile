import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoLeaderboard, {
  CAMPAIGN_LEADERBOARD_TEST_IDS,
} from './OndoLeaderboard';
import type { CampaignLeaderboardEntry } from '../../../../../core/Engine/controllers/rewards-controller/types';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

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
      'rewards.ondo_campaign_leaderboard.tier_starter': 'Bronze',
      'rewards.ondo_campaign_leaderboard.tier_mid': 'Silver',
      'rewards.ondo_campaign_leaderboard.tier_upper': 'Platinum',
      'rewards.ondo_campaign_leaderboard.select_tier': 'Select Tier',
      'rewards.ondo_campaign_leaderboard.pending': 'Pending',
      'rewards.ondo_campaign_leaderboard.qualified': 'Qualified',
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
  qualifiedDays: 10,
  qualified: true,
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
    it('renders container', () => {
      const { getByTestId } = render(<OndoLeaderboard {...defaultProps} />);

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.CONTAINER),
      ).toBeDefined();
    });

    it('renders tier selector when multiple tiers', () => {
      const { getByTestId } = render(<OndoLeaderboard {...defaultProps} />);

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.TIER_TOGGLE),
      ).toBeDefined();
    });

    it('does not render tier selector when single tier', () => {
      const { queryByTestId } = render(
        <OndoLeaderboard {...defaultProps} tierNames={['STARTER']} />,
      );

      expect(
        queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.TIER_TOGGLE),
      ).toBeNull();
    });

    it('displays the selected tier display name in the selector', () => {
      const { getByText } = render(
        <OndoLeaderboard {...defaultProps} selectedTier="MID" />,
      );

      expect(getByText('Silver')).toBeDefined();
    });

    it('navigates to select sheet when pressed', () => {
      const onTierChange = jest.fn();
      const { getByTestId } = render(
        <OndoLeaderboard {...defaultProps} onTierChange={onTierChange} />,
      );

      fireEvent.press(getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.TIER_TOGGLE));
      expect(mockNavigate).toHaveBeenCalledWith(
        'RewardsSelectSheet',
        expect.objectContaining({
          title: 'Select Tier',
          options: [
            { key: 'STARTER', value: 'STARTER', label: 'Bronze' },
            { key: 'MID', value: 'MID', label: 'Silver' },
            { key: 'UPPER', value: 'UPPER', label: 'Platinum' },
          ],
          selectedValue: 'STARTER',
          onSelect: onTierChange,
        }),
      );
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

      expect(getByText('#01')).toBeDefined();
      expect(getByText('AAA111')).toBeDefined();
      expect(getByText('+20.00%')).toBeDefined();

      expect(getByText('#02')).toBeDefined();
      expect(getByText('BBB222')).toBeDefined();
      expect(getByText('+15.00%')).toBeDefined();

      expect(getByText('#03')).toBeDefined();
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

  describe('maxEntries', () => {
    const manyEntries = Array.from({ length: 10 }, (_, i) =>
      createMockEntry({
        rank: i + 1,
        referralCode: `USER${i + 1}`,
        rateOfReturn: 0.1 - i * 0.01,
      }),
    );

    it('limits visible entries when maxEntries is provided', () => {
      const { queryByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          entries={manyEntries}
          maxEntries={3}
        />,
      );

      expect(
        queryByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-1`),
      ).toBeDefined();
      expect(
        queryByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-3`),
      ).toBeDefined();
      expect(
        queryByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-4`),
      ).toBeNull();
    });

    it('shows all entries when maxEntries exceeds 20', () => {
      const { queryByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          entries={manyEntries}
          maxEntries={25}
        />,
      );

      expect(
        queryByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-10`),
      ).toBeDefined();
    });

    it('shows all entries when maxEntries is not provided', () => {
      const { queryByTestId } = render(
        <OndoLeaderboard {...defaultProps} entries={manyEntries} />,
      );

      expect(
        queryByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-10`),
      ).toBeDefined();
    });

    it('shows all entries when maxEntries is exactly 20', () => {
      const { queryByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          entries={manyEntries}
          maxEntries={20}
        />,
      );

      expect(
        queryByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-10`),
      ).toBeDefined();
    });
  });

  describe('user position and neighbors', () => {
    const tenEntries = Array.from({ length: 10 }, (_, i) =>
      createMockEntry({
        rank: i + 1,
        referralCode: `STR${String(i + 1).padStart(3, '0')}`,
        rateOfReturn: 0.2 - i * 0.01,
      }),
    );

    it('renders normally when no userPosition is provided', () => {
      const { queryByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          entries={tenEntries}
          maxEntries={5}
        />,
      );

      expect(
        queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.NEIGHBOR_SEPARATOR),
      ).toBeNull();
      expect(
        queryByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-5`),
      ).toBeDefined();
      expect(
        queryByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-6`),
      ).toBeNull();
    });

    it('renders normally when tier does not match', () => {
      const { queryByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          entries={tenEntries}
          maxEntries={5}
          selectedTier="STARTER"
          userPosition={{
            projectedTier: 'MID',
            rank: 250,
            neighbors: [
              createMockEntry({ rank: 249, referralCode: 'N249' }),
              createMockEntry({ rank: 250, referralCode: 'USER' }),
              createMockEntry({ rank: 251, referralCode: 'N251' }),
            ],
          }}
          currentUserReferralCode="USER"
        />,
      );

      expect(
        queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.NEIGHBOR_SEPARATOR),
      ).toBeNull();
      expect(
        queryByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-250`),
      ).toBeNull();
    });

    it('highlights user row in place when rank is within visible range', () => {
      const { getByTestId, queryByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          entries={tenEntries}
          maxEntries={5}
          selectedTier="STARTER"
          userPosition={{
            projectedTier: 'STARTER',
            rank: 3,
            neighbors: [
              createMockEntry({ rank: 2, referralCode: 'STR002' }),
              createMockEntry({ rank: 3, referralCode: 'USER' }),
              createMockEntry({ rank: 4, referralCode: 'STR004' }),
            ],
          }}
          currentUserReferralCode="USER"
        />,
      );

      expect(
        queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.NEIGHBOR_SEPARATOR),
      ).toBeNull();
      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-3`),
      ).toBeDefined();
      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-5`),
      ).toBeDefined();
    });

    it('shows split view with top 3 + separator + neighbors when rank is outside visible range', () => {
      const { getByTestId, queryByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          entries={tenEntries}
          maxEntries={5}
          selectedTier="STARTER"
          userPosition={{
            projectedTier: 'STARTER',
            rank: 250,
            neighbors: [
              createMockEntry({ rank: 249, referralCode: 'N249' }),
              createMockEntry({ rank: 250, referralCode: 'USER' }),
              createMockEntry({ rank: 251, referralCode: 'N251' }),
            ],
          }}
          currentUserReferralCode="USER"
        />,
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
      expect(
        queryByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-4`),
      ).toBeNull();

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.NEIGHBOR_SEPARATOR),
      ).toBeDefined();

      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-249`),
      ).toBeDefined();
      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-250`),
      ).toBeDefined();
      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-251`),
      ).toBeDefined();
    });

    it('handles last-in-tier edge case with only 2 neighbors', () => {
      const { getByTestId, queryByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          entries={tenEntries}
          maxEntries={5}
          selectedTier="STARTER"
          userPosition={{
            projectedTier: 'STARTER',
            rank: 50,
            neighbors: [
              createMockEntry({ rank: 49, referralCode: 'N049' }),
              createMockEntry({ rank: 50, referralCode: 'USER' }),
            ],
          }}
          currentUserReferralCode="USER"
        />,
      );

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.NEIGHBOR_SEPARATOR),
      ).toBeDefined();
      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-49`),
      ).toBeDefined();
      expect(
        getByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-50`),
      ).toBeDefined();
      expect(
        queryByTestId(`${CAMPAIGN_LEADERBOARD_TEST_IDS.ENTRY_ROW}-51`),
      ).toBeNull();
    });

    it('does not show split view in full leaderboard (no maxEntries)', () => {
      const { queryByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          entries={tenEntries}
          selectedTier="STARTER"
          userPosition={{
            projectedTier: 'STARTER',
            rank: 250,
            neighbors: [
              createMockEntry({ rank: 249, referralCode: 'N249' }),
              createMockEntry({ rank: 250, referralCode: 'USER' }),
              createMockEntry({ rank: 251, referralCode: 'N251' }),
            ],
          }}
          currentUserReferralCode="USER"
        />,
      );

      expect(
        queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.NEIGHBOR_SEPARATOR),
      ).toBeNull();
    });
  });

  describe('pending tag and qualified check', () => {
    it('renders Pending tag when entry is not qualified', () => {
      const entries = [
        createMockEntry({
          rank: 1,
          referralCode: 'USR001',
          qualified: false,
          qualifiedDays: 3,
        }),
      ];
      const { getAllByTestId, getByText } = render(
        <OndoLeaderboard {...defaultProps} entries={entries} />,
      );

      expect(
        getAllByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.PENDING_TAG),
      ).toHaveLength(1);
      expect(getByText('Pending')).toBeDefined();
    });

    it('does not render Pending tag or check when entry is qualified but not current user', () => {
      const entries = [
        createMockEntry({
          rank: 1,
          referralCode: 'USR001',
          qualified: true,
          qualifiedDays: 10,
        }),
      ];
      const { queryByTestId } = render(
        <OndoLeaderboard {...defaultProps} entries={entries} />,
      );

      expect(
        queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.PENDING_TAG),
      ).toBeNull();
      expect(
        queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.QUALIFIED_CHECK),
      ).toBeNull();
    });

    it('renders green check when entry is qualified and is current user', () => {
      const entries = [
        createMockEntry({
          rank: 1,
          referralCode: 'MYCODE',
          qualified: true,
          qualifiedDays: 10,
        }),
      ];
      const { getByTestId, queryByTestId } = render(
        <OndoLeaderboard
          {...defaultProps}
          entries={entries}
          currentUserReferralCode="MYCODE"
        />,
      );

      expect(
        getByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.QUALIFIED_CHECK),
      ).toBeDefined();
      expect(
        queryByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.PENDING_TAG),
      ).toBeNull();
    });

    it('renders Pending tag only for unqualified entries in a mixed list', () => {
      const entries = [
        createMockEntry({ rank: 1, referralCode: 'USR001', qualified: true }),
        createMockEntry({
          rank: 2,
          referralCode: 'USR002',
          qualified: false,
          qualifiedDays: 2,
        }),
        createMockEntry({ rank: 3, referralCode: 'USR003', qualified: true }),
      ];
      const { getAllByTestId } = render(
        <OndoLeaderboard {...defaultProps} entries={entries} />,
      );

      expect(
        getAllByTestId(CAMPAIGN_LEADERBOARD_TEST_IDS.PENDING_TAG),
      ).toHaveLength(1);
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
