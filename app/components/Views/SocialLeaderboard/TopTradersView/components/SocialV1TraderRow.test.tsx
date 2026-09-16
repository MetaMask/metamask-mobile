import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../../Homepage/Sections/TopTraders/types';
import SocialV1TraderRow from './SocialV1TraderRow';

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

  it('renders the win rate, follower count, PnL, and ROI without a follow action', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
      />,
    );

    expect(screen.getByText('alpha.eth')).toBeOnTheScreen();
    expect(screen.getByText('92% WR')).toBeOnTheScreen();
    expect(screen.getByText('48,707 followers')).toBeOnTheScreen();
    expect(screen.getByText('+$963,146.80')).toBeOnTheScreen();
    expect(screen.getByText('+43.0%')).toBeOnTheScreen();
    expect(screen.queryByText('Follow')).toBeNull();
  });

  it('renders the singular follower label for a single follower', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={{ ...baseTrader, followerCount: 1 }}
        onFollowPress={mockOnFollowPress}
      />,
    );

    expect(screen.getByText('1 follower')).toBeOnTheScreen();
  });

  it('omits the win rate tag when the window has no win-rate data', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={{ ...baseTrader, winRatePercent: null }}
        onFollowPress={mockOnFollowPress}
      />,
    );

    expect(screen.queryByText(/WR$/)).toBeNull();
  });

  it('keeps the row and podium medal interactive', () => {
    renderWithProvider(
      <SocialV1TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        onTraderPress={mockOnTraderPress}
      />,
    );

    expect(screen.getByTestId('rank-medal-1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('trader-row-trader-1'));
    expect(mockOnTraderPress).toHaveBeenCalledWith('trader-1', 'alpha.eth', 1);
  });

  it('ignores the mute props this surface has no inline actions for', () => {
    const mockOnMuteToggle = jest.fn();
    renderWithProvider(
      <SocialV1TraderRow
        trader={{ ...baseTrader, isFollowing: true }}
        onFollowPress={mockOnFollowPress}
        showMute
        onMuteToggle={mockOnMuteToggle}
      />,
    );

    expect(screen.queryByTestId('trader-row-mute-chip-trader-1')).toBeNull();
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
