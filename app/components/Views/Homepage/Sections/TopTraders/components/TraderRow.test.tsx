import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TraderRow from './TraderRow';
import type { TopTrader } from '../types';

const baseTrader: TopTrader = {
  id: 'trader-1',
  rank: 1,
  username: 'sniperliquid',
  avatarUri: 'https://example.com/avatar.png',
  percentageChange: 43,
  pnlValue: 963146.8,
  isFollowing: false,
};

const mockOnFollowPress = jest.fn();
const mockOnTraderPress = jest.fn();

describe('TraderRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders rank, username, ROI, and PnL', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('1.')).toBeOnTheScreen();
    expect(screen.getByText('sniperliquid')).toBeOnTheScreen();
    expect(screen.getByText('+43.0%')).toBeOnTheScreen();
    expect(screen.getByText('+$963K')).toBeOnTheScreen();
  });

  it('renders avatar image when avatarUri is present', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByTestId('trader-row-trader-1')).toBeOnTheScreen();
  });

  it('renders fallback AvatarBase when avatarUri is absent', () => {
    const traderNoAvatar = { ...baseTrader, avatarUri: undefined };
    renderWithProvider(
      <TraderRow trader={traderNoAvatar} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByTestId('trader-row-trader-1')).toBeOnTheScreen();
  });

  it('shows Follow when not following', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('Follow')).toBeOnTheScreen();
  });

  it('shows Following when isFollowing is true', () => {
    const followingTrader = { ...baseTrader, isFollowing: true };
    renderWithProvider(
      <TraderRow trader={followingTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('Following')).toBeOnTheScreen();
  });

  it('calls onFollowPress with trader.id', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    fireEvent.press(screen.getByText('Follow'));
    expect(mockOnFollowPress).toHaveBeenCalledWith('trader-1');
  });

  it('calls onTraderPress when pressed and prop is provided', () => {
    renderWithProvider(
      <TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        onTraderPress={mockOnTraderPress}
      />,
    );
    fireEvent.press(screen.getByText('sniperliquid'));
    expect(mockOnTraderPress).toHaveBeenCalledWith('trader-1', 'sniperliquid');
  });

  it('does not fire onTraderPress when the prop is undefined', () => {
    renderWithProvider(
      <TraderRow trader={baseTrader} onFollowPress={mockOnFollowPress} />,
    );
    fireEvent.press(screen.getByText('sniperliquid'));
    expect(mockOnTraderPress).not.toHaveBeenCalled();
  });

  it('displays negative ROI and PnL values', () => {
    const negativeTrader: TopTrader = {
      ...baseTrader,
      percentageChange: -15.3,
      pnlValue: -500,
    };
    renderWithProvider(
      <TraderRow trader={negativeTrader} onFollowPress={mockOnFollowPress} />,
    );
    expect(screen.getByText('-15.3%')).toBeOnTheScreen();
    expect(screen.getByText('-$500')).toBeOnTheScreen();
  });

  it('uses custom testID when provided', () => {
    renderWithProvider(
      <TraderRow
        trader={baseTrader}
        onFollowPress={mockOnFollowPress}
        testID="custom-test-id"
      />,
    );
    expect(screen.getByTestId('custom-test-id')).toBeOnTheScreen();
  });
});
