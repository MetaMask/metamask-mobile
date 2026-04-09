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
