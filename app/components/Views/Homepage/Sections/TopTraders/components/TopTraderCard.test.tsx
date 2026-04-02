import React from 'react';
import { Image } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import TopTraderCard from './TopTraderCard';
import type { TopTrader } from '../types';

const baseTrader: TopTrader = {
  id: 'trader-1',
  rank: 1,
  username: 'alice',
  percentageChange: 96.2,
  pnlValue: 963000,
  isFollowing: false,
};

describe('TopTraderCard', () => {
  it('calls onFollowPress with the trader id when the Follow button is pressed', () => {
    const onFollowPress = jest.fn();
    const { getByText } = render(
      <TopTraderCard trader={baseTrader} onFollowPress={onFollowPress} />,
    );

    fireEvent.press(getByText('Follow'));

    expect(onFollowPress).toHaveBeenCalledTimes(1);
    expect(onFollowPress).toHaveBeenCalledWith('trader-1');
  });

  it('calls onFollowPress with the trader id when the Following button is pressed', () => {
    const onFollowPress = jest.fn();
    const followingTrader = { ...baseTrader, isFollowing: true };
    const { getByText } = render(
      <TopTraderCard trader={followingTrader} onFollowPress={onFollowPress} />,
    );

    fireEvent.press(getByText('Following'));

    expect(onFollowPress).toHaveBeenCalledWith('trader-1');
  });

  it('shows the Follow button when the trader is not followed', () => {
    const { getByText } = render(
      <TopTraderCard
        trader={{ ...baseTrader, isFollowing: false }}
        onFollowPress={jest.fn()}
      />,
    );

    expect(getByText('Follow')).toBeOnTheScreen();
  });

  it('shows the Following button when the trader is already followed', () => {
    const { getByText } = render(
      <TopTraderCard
        trader={{ ...baseTrader, isFollowing: true }}
        onFollowPress={jest.fn()}
      />,
    );

    expect(getByText('Following')).toBeOnTheScreen();
  });

  it('renders the avatar image when avatarUri is provided', () => {
    const traderWithAvatar = {
      ...baseTrader,
      avatarUri: 'https://example.com/avatar.png',
    };
    const { UNSAFE_getByType, queryByText } = render(
      <TopTraderCard trader={traderWithAvatar} onFollowPress={jest.fn()} />,
    );

    expect(UNSAFE_getByType(Image)).toBeOnTheScreen();
    // The fallback letter should not be shown when avatarUri is supplied
    expect(queryByText('A')).not.toBeOnTheScreen();
  });

  it('renders the fallback AvatarBase when avatarUri is not provided', () => {
    const traderNoAvatar = { ...baseTrader, avatarUri: undefined };
    const { getByText } = render(
      <TopTraderCard trader={traderNoAvatar} onFollowPress={jest.fn()} />,
    );

    // AvatarBase shows the first letter of the username as fallback text
    expect(getByText('A')).toBeOnTheScreen();
  });

  it('displays ROI with a leading + sign for a positive percentage change', () => {
    const { getByText } = render(
      <TopTraderCard
        trader={{ ...baseTrader, percentageChange: 96.2 }}
        onFollowPress={jest.fn()}
      />,
    );

    expect(getByText('+96.2%')).toBeOnTheScreen();
  });

  it('displays ROI without a + sign for a negative percentage change', () => {
    const { getByText } = render(
      <TopTraderCard
        trader={{ ...baseTrader, percentageChange: -12.5 }}
        onFollowPress={jest.fn()}
      />,
    );

    expect(getByText('-12.5%')).toBeOnTheScreen();
  });

  it('displays a positive PnL value', () => {
    const { getByText } = render(
      <TopTraderCard
        trader={{ ...baseTrader, pnlValue: 963000 }}
        onFollowPress={jest.fn()}
      />,
    );

    expect(getByText('+$963K')).toBeOnTheScreen();
  });

  it('displays a negative PnL value', () => {
    const { getByText } = render(
      <TopTraderCard
        trader={{ ...baseTrader, pnlValue: -1200 }}
        onFollowPress={jest.fn()}
      />,
    );

    expect(getByText('-$1K')).toBeOnTheScreen();
  });

  it('applies the custom testID when provided', () => {
    const { getByTestId } = render(
      <TopTraderCard
        trader={baseTrader}
        onFollowPress={jest.fn()}
        testID="custom-card-id"
      />,
    );

    expect(getByTestId('custom-card-id')).toBeOnTheScreen();
  });

  it('uses the default testID based on trader id when no testID prop is provided', () => {
    const { getByTestId } = render(
      <TopTraderCard trader={baseTrader} onFollowPress={jest.fn()} />,
    );

    expect(getByTestId('top-trader-card-trader-1')).toBeOnTheScreen();
  });
});
