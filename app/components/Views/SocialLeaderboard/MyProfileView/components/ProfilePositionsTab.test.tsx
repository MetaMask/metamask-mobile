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
  const onFilterChange = jest.fn();
  const onPositionPress = jest.fn();
  const onRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Tokens then Perpetuals sections for All', () => {
    renderWithProvider(
      <ProfilePositionsTab
        positions={[openSpot, openPerp]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="all"
        onFilterChange={onFilterChange}
        onPositionPress={onPositionPress}
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.TOKENS_SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.PERPS_SECTION),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('Tokens').length).toBeGreaterThan(0);
    expect(screen.getByText('Perpetuals')).toBeOnTheScreen();
    expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
    expect(screen.getByTestId('position-row-BTC')).toBeOnTheScreen();
  });

  it('hides the Perpetuals section for the Tokens filter', () => {
    renderWithProvider(
      <ProfilePositionsTab
        positions={[openSpot, openPerp]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="tokens"
        onFilterChange={onFilterChange}
        onPositionPress={onPositionPress}
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.TOKENS_SECTION),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Perpetuals')).toBeNull();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.PERPS_SECTION),
    ).toBeNull();
    expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
    expect(screen.queryByTestId('position-row-BTC')).toBeNull();
  });

  it('shows empty copy when the Perps filter has no rows', () => {
    renderWithProvider(
      <ProfilePositionsTab
        positions={[openSpot]}
        isLoading={false}
        error={null}
        isClosed
        filter="perps"
        onFilterChange={onFilterChange}
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
        onFilterChange={onFilterChange}
        onPositionPress={onPositionPress}
        onRetry={onRetry}
      />,
    );

    fireEvent.press(screen.getByTestId('position-row-ETH'));

    expect(onPositionPress).toHaveBeenCalledWith(openSpot);
  });

  it('retries after a load error', () => {
    renderWithProvider(
      <ProfilePositionsTab
        positions={[]}
        isLoading={false}
        error="offline"
        isClosed={false}
        filter="all"
        onFilterChange={onFilterChange}
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
