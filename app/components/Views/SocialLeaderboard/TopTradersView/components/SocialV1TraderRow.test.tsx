import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../../Homepage/Sections/TopTraders/types';
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

  it('renders rank medal, username, verified badge, cohort, and PnL without follow chrome', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
      />,
    );

    expect(screen.getByTestId('rank-medal-1')).toBeOnTheScreen();
    expect(screen.getByText('alpha.eth')).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialV1TraderRowSelectorsIDs.VERIFIED_BADGE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialV1TraderRowSelectorsIDs.COHORT),
    ).toBeOnTheScreen();
    expect(screen.getByText('+$963,146.80')).toBeOnTheScreen();
    expect(screen.queryByText('92% WR')).toBeNull();
    expect(screen.queryByText('48,707 followers')).toBeNull();
    expect(screen.queryByText('+43.0%')).toBeNull();
    expect(screen.queryByText('Follow')).toBeNull();
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
    expect(screen.queryByTestId('rank-medal-1')).toBeNull();
    expect(screen.getByText('alpha.eth')).toBeOnTheScreen();
  });

  it('wraps a highlighted row in the muted gradient card', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        highlighted
        hideRank
      />,
    );

    expect(
      screen.getByTestId(SocialV1TraderRowSelectorsIDs.HIGHLIGHT),
    ).toBeOnTheScreen();
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
});
