import { lightTheme } from '@metamask/design-tokens';
import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../../Homepage/Sections/TopTraders/types';
import { SocialFeedSurfaceProvider } from '../../../../UI/SocialFeed/SocialFeedSurface';
import SocialV1TraderRow from './SocialV1TraderRow';
import { SocialV1TraderRowSelectorsIDs } from './SocialV1TraderRow.testIds';

const baseTrader: TopTrader = {
  id: 'trader-1',
  address: '0x0000000000000000000000000000000000000001',
  rank: 1,
  overallRank: 1,
  username: 'alpha.eth',
  avatarUri: 'https://example.com/avatar.png',
  percentageChange: 43,
  pnlValue: 963146.8,
  winRatePercent: 92,
  pnlPerChain: { base: 963146.8 },
  followerCount: 48707,
  isFollowing: false,
};

const mockOnFollowPress = jest.fn();
const mockOnTraderPress = jest.fn();

describe('SocialV1TraderRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders rank medal, username, and PnL without follow chrome', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
      />,
    );

    expect(screen.getByTestId('rank-medal-1')).toBeOnTheScreen();
    expect(screen.getByText('alpha.eth')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialV1TraderRowSelectorsIDs.COHORT),
    ).toBeNull();
    expect(screen.getByText('+$963,146.80')).toBeOnTheScreen();
    expect(screen.queryByText('92% WR')).toBeNull();
    expect(screen.queryByText('48,707 followers')).toBeNull();
    expect(screen.queryByText('+43.0%')).toBeNull();
    expect(
      screen.queryByTestId(SocialV1TraderRowSelectorsIDs.FOLLOWERS),
    ).toBeNull();
    expect(
      screen.queryByTestId(SocialV1TraderRowSelectorsIDs.PERCENTAGE),
    ).toBeNull();
    expect(screen.queryByText('Follow')).toBeNull();
  });

  it('never renders a verified badge, including when mocked fields are on', () => {
    renderWithProvider(
      <SocialFeedSurfaceProvider showMockedFields>
        <SocialV1TraderRow
          trader={baseTrader}
          onFollowPress={mockOnFollowPress}
        />
      </SocialFeedSurfaceProvider>,
    );

    expect(
      screen.queryByTestId(SocialV1TraderRowSelectorsIDs.VERIFIED_BADGE),
    ).toBeNull();
  });

  it('renders the numeric rank for positions outside the podium', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={{ ...baseTrader, rank: 7, overallRank: 7 }}
        onFollowPress={mockOnFollowPress}
      />,
    );

    expect(screen.getByText('7')).toBeOnTheScreen();
    expect(screen.queryByTestId('rank-medal-1')).toBeNull();
  });

  it('keeps the rank column width when hideRank is set', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        hideRank
      />,
    );

    expect(
      screen.getByTestId(SocialV1TraderRowSelectorsIDs.RANK),
    ).toBeOnTheScreen();
    expect(screen.queryByText('-')).toBeNull();
    expect(screen.queryByTestId('rank-medal-1')).toBeNull();
    expect(screen.getByText('alpha.eth')).toBeOnTheScreen();
  });

  it('wraps a highlighted row in the muted viewer card', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={{ ...baseTrader, rank: 59, overallRank: 59 }}
        onFollowPress={mockOnFollowPress}
        highlighted
      />,
    );

    const card = screen.getByTestId(SocialV1TraderRowSelectorsIDs.HIGHLIGHT);

    expect(card).toBeOnTheScreen();
    expect(card).toHaveStyle({
      backgroundColor: lightTheme.colors.background.muted,
      borderWidth: 1,
      borderRadius: 16,
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 12,
      paddingBottom: 12,
    });
    expect(screen.queryByTestId('social-gradient-card-gradient')).toBeNull();
    expect(screen.getByTestId(SocialV1TraderRowSelectorsIDs.RANK)).toHaveStyle({
      width: 32,
    });
    expect(screen.getByText('59')).toBeOnTheScreen();
  });

  it('keeps the row interactive', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        onTraderPress={mockOnTraderPress}
      />,
    );

    fireEvent.press(screen.getByTestId('trader-row-trader-1'));

    expect(mockOnTraderPress).toHaveBeenCalledWith('trader-1', 'alpha.eth', 1);
  });

  it('renders the ranked metric passed by the list instead of PnL', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={baseTrader}
        metric={{ label: '92%', isPositive: true }}
        onFollowPress={mockOnFollowPress}
      />,
    );

    expect(screen.getByText('92%')).toBeOnTheScreen();
    expect(screen.queryByText('+$963,146.80')).toBeNull();
  });

  it('uses a custom testID when provided', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        testID="custom-test-id"
      />,
    );

    expect(screen.getByTestId('custom-test-id')).toBeOnTheScreen();
  });

  it('renders the window percent and follower count when leaderboard details are on', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={{ ...baseTrader, percentageChange: 7.76, followerCount: 4700 }}
        onFollowPress={mockOnFollowPress}
        showLeaderboardDetails
      />,
    );

    expect(screen.getByText('+7.8%')).toBeOnTheScreen();
    expect(screen.getByText('4.7K followers')).toBeOnTheScreen();
  });

  it('colors a negative percent as a loss while the dollar stays a gain', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={{ ...baseTrader, percentageChange: -8.5 }}
        metric={{ label: '+$1.00', isPositive: true }}
        onFollowPress={mockOnFollowPress}
        showLeaderboardDetails
      />,
    );

    expect(screen.getByText('+$1.00')).toBeOnTheScreen();
    expect(screen.getByText('-8.5%')).toBeOnTheScreen();
  });

  it('omits a zero percent and a zero follower count', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={{ ...baseTrader, percentageChange: 0, followerCount: 0 }}
        onFollowPress={mockOnFollowPress}
        showLeaderboardDetails
      />,
    );

    expect(screen.getByText('+$963,146.80')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialV1TraderRowSelectorsIDs.PERCENTAGE),
    ).toBeNull();
    expect(
      screen.queryByTestId(SocialV1TraderRowSelectorsIDs.FOLLOWERS),
    ).toBeNull();
  });

  it('shows a zero percent and a zero follower count on the pinned viewer card', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={{
          ...baseTrader,
          rank: 0,
          overallRank: 0,
          percentageChange: 0,
          followerCount: 0,
        }}
        onFollowPress={mockOnFollowPress}
        highlighted
        hideRank
        showLeaderboardDetails
      />,
    );

    expect(screen.queryByText('-')).toBeNull();
    expect(screen.getByText('+0.0%')).toBeOnTheScreen();
    expect(screen.getByText('0 followers')).toBeOnTheScreen();
  });

  it('shows a muted empty label and hides a zero percent and zero followers', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={{
          ...baseTrader,
          rank: 0,
          overallRank: 0,
          percentageChange: 0,
          followerCount: 0,
          pnlValue: 0,
        }}
        onFollowPress={mockOnFollowPress}
        highlighted
        hideRank
        showLeaderboardDetails
        neutralMetricLabel="No trades yet"
      />,
    );

    expect(screen.getByText('No trades yet')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialV1TraderRowSelectorsIDs.PERCENTAGE),
    ).toBeNull();
    expect(
      screen.queryByTestId(SocialV1TraderRowSelectorsIDs.FOLLOWERS),
    ).toBeNull();
    expect(screen.queryByText('-')).toBeNull();
  });

  it('keeps followers and hides a missing percent on the pinned card', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={{
          ...baseTrader,
          percentageChange: 0,
          followerCount: 7,
          pnlValue: -0.59,
        }}
        metric={{ label: '-$0.59', isPositive: false }}
        onFollowPress={mockOnFollowPress}
        highlighted
        hideRank
        showLeaderboardDetails
        omitPercentage
      />,
    );

    expect(screen.getByText('-$0.59')).toBeOnTheScreen();
    expect(screen.getByText('7 followers')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialV1TraderRowSelectorsIDs.PERCENTAGE),
    ).toBeNull();
  });
});
