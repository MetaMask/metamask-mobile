import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import ProfilePositionsTab from './ProfilePositionsTab';

jest.mock('../../../../UI/SocialFeed/utils/perp', () => ({
  isPerpPosition: (position: { chain?: string; perpPositionType?: string }) =>
    position.perpPositionType != null || position.chain === 'hyperliquid',
}));

jest.mock('../../TraderProfileView/components/PositionRow', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      position,
      onPress,
    }: {
      position: Position;
      onPress?: (next: Position) => void;
    }) => (
      <Pressable
        testID={`position-row-${position.tokenSymbol}`}
        onPress={() => onPress?.(position)}
      >
        <Text>{position.tokenSymbol}</Text>
      </Pressable>
    ),
  };
});

const openSpot: Position = {
  positionId: 'eth-spot',
  tokenSymbol: 'ETH',
  tokenName: 'Ethereum',
  tokenAddress: '0xeth',
  chain: 'ethereum',
  positionAmount: 0.24,
  boughtUsd: 442,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 442,
  trades: [],
  lastTradeAt: Date.now(),
  currentValueUSD: 720,
  pnlPercent: 0.02,
};

const openPerp: Position = {
  ...openSpot,
  positionId: 'btc-perp',
  tokenSymbol: 'BTC',
  chain: 'hyperliquid',
  tokenAddress: '',
  perpPositionType: 'short',
  perpLeverage: 40,
};

describe('ProfilePositionsTab', () => {
  const onPositionPress = jest.fn();
  const onRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('insets the position list below the profile tabs', () => {
    renderWithProvider(
      <ProfilePositionsTab
        positions={[openSpot]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="all"
        onPositionPress={onPositionPress}
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSITIONS_LIST),
    ).toHaveStyle({ paddingTop: 16 });
  });

  it('renders tokens and perps in one list for All', () => {
    renderWithProvider(
      <ProfilePositionsTab
        positions={[openPerp, openSpot]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="all"
        onPositionPress={onPositionPress}
        onRetry={onRetry}
      />,
    );

    expect(screen.queryByText('Tokens')).toBeNull();
    expect(screen.queryByText('Perpetuals')).toBeNull();
    const rows = screen.getAllByTestId(/^position-row-/);
    expect(rows.map((row) => row.props.testID)).toEqual([
      'position-row-BTC',
      'position-row-ETH',
    ]);
  });

  it('drops perp rows for the Tokens filter', () => {
    renderWithProvider(
      <ProfilePositionsTab
        positions={[openSpot, openPerp]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="tokens"
        onPositionPress={onPositionPress}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
    expect(screen.queryByTestId('position-row-BTC')).toBeNull();
    expect(screen.queryByText('Tokens')).toBeNull();
    expect(screen.queryByText('Perpetuals')).toBeNull();
  });

  it('shows empty copy when the Perps filter has no rows', () => {
    renderWithProvider(
      <ProfilePositionsTab
        positions={[openSpot]}
        isLoading={false}
        error={null}
        isClosed
        filter="perps"
        onPositionPress={onPositionPress}
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSITIONS_EMPTY),
    ).toBeOnTheScreen();
    expect(screen.getByText('No closed perps')).toBeOnTheScreen();
  });

  it('notifies when a row is pressed', () => {
    renderWithProvider(
      <ProfilePositionsTab
        positions={[openSpot]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="all"
        onPositionPress={onPositionPress}
        onRetry={onRetry}
      />,
    );

    fireEvent.press(screen.getByTestId('position-row-ETH'));

    expect(onPositionPress).toHaveBeenCalledWith(openSpot);
  });

  it('does not notify when a flagged row is pressed with showFlaggedState', () => {
    const flagged = { ...openSpot, flags: ['insider'] };

    renderWithProvider(
      <ProfilePositionsTab
        positions={[flagged]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="all"
        onPositionPress={onPositionPress}
        onRetry={onRetry}
        showFlaggedState
      />,
    );

    fireEvent.press(screen.getByTestId('position-row-ETH'));

    expect(onPositionPress).not.toHaveBeenCalled();
  });

  it('retries after a load error', () => {
    renderWithProvider(
      <ProfilePositionsTab
        positions={[]}
        isLoading={false}
        error="offline"
        isClosed={false}
        filter="all"
        onPositionPress={onPositionPress}
        onRetry={onRetry}
      />,
    );

    fireEvent.press(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSITIONS_RETRY_BUTTON),
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
