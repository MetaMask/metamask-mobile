import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../locales/i18n';
/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import type { TopTrader } from '../../../../Homepage/Sections/TopTraders/types';
/* eslint-enable import-x/no-restricted-paths */
import PopularTraderCard from './PopularTraderCard';
import {
  getPopularTraderCardFollowTestId,
  getPopularTraderCardTestId,
} from './PopularTraderCard.testIds';

const baseTrader: TopTrader = {
  id: 'trader-1',
  address: '0x0000000000000000000000000000000000000001',
  rank: 1,
  overallRank: 1,
  username: 'Pain',
  avatarUri: 'https://example.com/avatar.png',
  percentageChange: 43,
  pnlValue: 963146.8,
  winRatePercent: 92,
  pnlPerChain: { base: 963146.8 },
  followerCount: 65700,
  isFollowing: false,
};

const mockOnFollowPress = jest.fn();
const mockOnTraderPress = jest.fn();

describe('PopularTraderCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders username and abbreviated follower count', () => {
    renderWithProvider(
      <PopularTraderCard
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
      />,
    );

    expect(screen.getByText('Pain')).toBeOnTheScreen();
    expect(screen.getByText('65.7K followers')).toBeOnTheScreen();
  });

  it('calls onFollowPress when Follow is tapped', () => {
    renderWithProvider(
      <PopularTraderCard
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
      />,
    );

    fireEvent.press(
      screen.getByTestId(getPopularTraderCardFollowTestId('trader-1')),
    );

    expect(mockOnFollowPress).toHaveBeenCalledWith('trader-1');
  });

  it('shows Following when the trader is already followed', () => {
    renderWithProvider(
      <PopularTraderCard
        trader={{ ...baseTrader, isFollowing: true }}
        onFollowPress={mockOnFollowPress}
      />,
    );

    expect(
      screen.getByText(strings('social_leaderboard.following')),
    ).toBeOnTheScreen();
  });

  it('calls onTraderPress when the identity block is tapped', () => {
    renderWithProvider(
      <PopularTraderCard
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        onTraderPress={mockOnTraderPress}
      />,
    );

    fireEvent.press(screen.getByText('Pain'));

    expect(mockOnTraderPress).toHaveBeenCalledWith('trader-1', 'Pain', 1);
  });

  it('does not call onTraderPress when Follow is tapped', () => {
    renderWithProvider(
      <PopularTraderCard
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        onTraderPress={mockOnTraderPress}
      />,
    );

    fireEvent.press(
      screen.getByTestId(getPopularTraderCardFollowTestId('trader-1')),
    );

    expect(mockOnFollowPress).toHaveBeenCalledWith('trader-1');
    expect(mockOnTraderPress).not.toHaveBeenCalled();
  });

  it('uses a default testID derived from the trader id', () => {
    renderWithProvider(
      <PopularTraderCard
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
      />,
    );

    expect(
      screen.getByTestId(getPopularTraderCardTestId('trader-1')),
    ).toBeOnTheScreen();
  });
});
