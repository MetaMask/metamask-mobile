import React from 'react';
import { render } from '@testing-library/react-native';
import { Skeleton } from '@metamask/design-system-react-native';
import {
  CampaignLeaderboardEntryRow,
  CampaignLeaderboardNeighborSeparator,
  CampaignLeaderboardSkeleton,
  CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS,
} from './CampaignLeaderboard';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View } = jest.requireActual('react-native');
  /** Avoid Skeleton Animated/act noise while keeping type identity for row counts. */
  function SkeletonMock(props: object) {
    return ReactActual.createElement(View, props);
  }
  SkeletonMock.displayName = 'Skeleton';
  return {
    ...actual,
    Skeleton: SkeletonMock,
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../images/rewards/crown.svg', () => 'CrownIcon');

jest.mock('./OndoCampaignStatsSummary', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    PendingTag: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
  };
});

const IDS = CAMPAIGN_LEADERBOARD_SHARED_TEST_IDS;
const CrownIcon = 'CrownIcon' as unknown as React.ComponentType;

const baseEntry = {
  rank: 7,
  referralCode: 'USER01',
  qualified: true,
};

describe('CampaignLeaderboardEntryRow', () => {
  it('renders padded rank, referral code, and formatted metric', () => {
    const formatPrimaryMetric = jest.fn(() => '+12.5%');
    const isPositivePrimaryMetric = jest.fn(() => true);

    const { getByText } = render(
      <CampaignLeaderboardEntryRow
        entry={baseEntry}
        formatPrimaryMetric={formatPrimaryMetric}
        isPositivePrimaryMetric={isPositivePrimaryMetric}
      />,
    );

    expect(getByText('07')).toBeDefined();
    expect(getByText('USER01')).toBeDefined();
    expect(getByText('+12.5%')).toBeDefined();
    expect(formatPrimaryMetric).toHaveBeenCalledWith(baseEntry);
    expect(isPositivePrimaryMetric).toHaveBeenCalledWith(baseEntry);
  });

  it('shows crown based only on showCrown', () => {
    const { UNSAFE_queryAllByType } = render(
      <CampaignLeaderboardEntryRow
        entry={baseEntry}
        showCrown
        formatPrimaryMetric={() => '+12.5%'}
        isPositivePrimaryMetric={() => true}
      />,
    );

    expect(UNSAFE_queryAllByType(CrownIcon)).toHaveLength(1);
  });

  it('hides crown when showCrown is false', () => {
    const { UNSAFE_queryAllByType } = render(
      <CampaignLeaderboardEntryRow
        entry={{ ...baseEntry, rank: 1 }}
        formatPrimaryMetric={() => '+12.5%'}
        isPositivePrimaryMetric={() => true}
      />,
    );

    expect(UNSAFE_queryAllByType(CrownIcon)).toHaveLength(0);
  });

  it('sets row testID from shared ENTRY_ROW and rank', () => {
    const { getByTestId } = render(
      <CampaignLeaderboardEntryRow
        entry={{ ...baseEntry, rank: 3 }}
        formatPrimaryMetric={() => 'm'}
        isPositivePrimaryMetric={() => true}
      />,
    );

    expect(getByTestId(`${IDS.ENTRY_ROW}-3`)).toBeDefined();
  });

  it('shows pending tag when current user is unqualified and campaign is active', () => {
    const { getByTestId } = render(
      <CampaignLeaderboardEntryRow
        entry={{ ...baseEntry, qualified: false }}
        isCurrentUser
        formatPrimaryMetric={() => '$0.00'}
        isPositivePrimaryMetric={() => false}
      />,
    );

    expect(getByTestId(IDS.PENDING_TAG)).toBeDefined();
  });

  it('hides pending tag when campaign is complete', () => {
    const { queryByTestId } = render(
      <CampaignLeaderboardEntryRow
        entry={{ ...baseEntry, qualified: false }}
        isCurrentUser
        isCampaignComplete
        formatPrimaryMetric={() => '$0.00'}
        isPositivePrimaryMetric={() => false}
      />,
    );

    expect(queryByTestId(IDS.PENDING_TAG)).toBeNull();
  });

  it('hides pending tag when row is not the current user', () => {
    const { queryByTestId } = render(
      <CampaignLeaderboardEntryRow
        entry={{ ...baseEntry, qualified: false }}
        isCurrentUser={false}
        formatPrimaryMetric={() => '$0.00'}
        isPositivePrimaryMetric={() => false}
      />,
    );

    expect(queryByTestId(IDS.PENDING_TAG)).toBeNull();
  });
});

describe('CampaignLeaderboardSkeleton', () => {
  it('uses shared LOADING testID', () => {
    const { getByTestId } = render(<CampaignLeaderboardSkeleton />);

    expect(getByTestId(IDS.LOADING)).toBeDefined();
  });

  it('renders default skeleton row count (10 rows × 3 skeletons each)', () => {
    const { UNSAFE_getAllByType } = render(<CampaignLeaderboardSkeleton />);

    expect(UNSAFE_getAllByType(Skeleton)).toHaveLength(30);
  });

  it('respects skeletonRowCount', () => {
    const { UNSAFE_getAllByType } = render(
      <CampaignLeaderboardSkeleton skeletonRowCount={4} />,
    );

    expect(UNSAFE_getAllByType(Skeleton)).toHaveLength(12);
  });
});

describe('CampaignLeaderboardNeighborSeparator', () => {
  it('uses shared NEIGHBOR_SEPARATOR testID and ellipsis label', () => {
    const { getByTestId, getByText } = render(
      <CampaignLeaderboardNeighborSeparator />,
    );

    expect(getByTestId(IDS.NEIGHBOR_SEPARATOR)).toBeDefined();
    expect(getByText('•••')).toBeDefined();
  });
});
