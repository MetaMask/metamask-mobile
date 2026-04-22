import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TopTraderCard from './TopTraderCard';
import type { TopTrader } from '../types';

const baseTrader: TopTrader = {
  id: 'trader-1',
  rank: 1,
  username: 'sniperliquid',
  avatarUri: 'https://example.com/avatar.png',
  percentageChange: 43,
  pnlValue: 963146.8,
  pnlPerChain: { base: 963146.8 },
  isFollowing: false,
};

const mockOnFollowPress = jest.fn();
const mockOnTraderPress = jest.fn();

describe('TopTraderCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders username, ROI, and PnL', () => {
    renderWithProvider(
      <TopTraderCard trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('sniperliquid')).toBeOnTheScreen();
    expect(screen.getByText('+43.0%')).toBeOnTheScreen();
    expect(screen.getByText('+$963K')).toBeOnTheScreen();
  });

  it('renders with default testID when none is provided', () => {
    renderWithProvider(
      <TopTraderCard trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByTestId('top-trader-card-trader-1')).toBeOnTheScreen();
  });

  it('uses custom testID when provided', () => {
    renderWithProvider(
      <TopTraderCard
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        testID="custom-test-id"
      />,
    );
    expect(screen.getByTestId('custom-test-id')).toBeOnTheScreen();
  });

  it('renders avatar image when avatarUri is present', () => {
    renderWithProvider(
      <TopTraderCard trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByTestId('top-trader-avatar-trader-1')).toBeOnTheScreen();
  });

  it('renders fallback AvatarBase when avatarUri is absent', () => {
    const traderNoAvatar = { ...baseTrader, avatarUri: undefined };
    renderWithProvider(
      <TopTraderCard
        trader={traderNoAvatar}
        onFollowPress={mockOnFollowPress}
      />,
    );
    expect(screen.getByText('S')).toBeOnTheScreen();
  });

  it('shows Follow when not following', () => {
    renderWithProvider(
      <TopTraderCard trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('Follow')).toBeOnTheScreen();
  });

  it('shows Following when isFollowing is true', () => {
    const followingTrader = { ...baseTrader, isFollowing: true };
    renderWithProvider(
      <TopTraderCard
        trader={followingTrader}
        onFollowPress={mockOnFollowPress}
      />,
    );
    expect(screen.getByText('Following')).toBeOnTheScreen();
  });

  it('calls onFollowPress with trader.id when Follow button is tapped', () => {
    renderWithProvider(
      <TopTraderCard trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );

    fireEvent.press(screen.getByText('Follow'));

    expect(mockOnFollowPress).toHaveBeenCalledWith('trader-1');
  });

  it('calls onTraderPress with trader.id and username when card content is tapped', () => {
    renderWithProvider(
      <TopTraderCard
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        onTraderPress={mockOnTraderPress}
      />,
    );

    fireEvent.press(screen.getByTestId('top-trader-card-pressable-trader-1'));

    expect(mockOnTraderPress).toHaveBeenCalledWith('trader-1', 'sniperliquid');
  });

  it('does not call onTraderPress when the prop is not provided', () => {
    renderWithProvider(
      <TopTraderCard trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );

    fireEvent.press(screen.getByTestId('top-trader-card-pressable-trader-1'));

    expect(mockOnTraderPress).not.toHaveBeenCalled();
  });

  it('Follow button fires onFollowPress independently of onTraderPress', () => {
    renderWithProvider(
      <TopTraderCard
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        onTraderPress={mockOnTraderPress}
      />,
    );

    fireEvent.press(screen.getByText('Follow'));

    expect(mockOnFollowPress).toHaveBeenCalledWith('trader-1');
    expect(mockOnTraderPress).not.toHaveBeenCalled();
  });

  it('displays negative ROI and PnL values with correct sign', () => {
    const negativeTrader: TopTrader = {
      ...baseTrader,
      percentageChange: -15.3,
      pnlValue: -500,
    };
    renderWithProvider(
      <TopTraderCard
        trader={negativeTrader}
        onFollowPress={mockOnFollowPress}
      />,
    );
    expect(screen.getByText('-15.3%')).toBeOnTheScreen();
    expect(screen.getByText('-$500')).toBeOnTheScreen();
  });
});
