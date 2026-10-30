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

  it('insets Open and Closed filters to the same depth as profile posts', () => {
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

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.POSITIONS_LIST),
    ).toHaveStyle({ paddingTop: 16 });
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

  it('pins flagged positions under Not counted in P&L in input order', () => {
    const low: Position = {
      ...openSpot,
      positionId: 'low',
      tokenSymbol: 'LOW',
      currentValueUSD: 1,
    };
    const flaggedHigh: Position = {
      ...openSpot,
      positionId: 'nigel',
      tokenSymbol: 'Nigel',
      flags: ['insider'],
      currentValueUSD: 999,
    };
    const mid: Position = {
      ...openSpot,
      positionId: 'mid',
      tokenSymbol: 'MID',
      currentValueUSD: 50,
    };
    const flaggedDev: Position = {
      ...openSpot,
      positionId: 'moodeng',
      tokenSymbol: 'Moodeng',
      flags: ['developer'],
      currentValueUSD: 2,
    };

    renderWithProvider(
      <ProfilePositionsTab
        positions={[low, flaggedHigh, mid, flaggedDev]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="all"
        onFilterChange={onFilterChange}
        onPositionPress={onPositionPress}
        onRetry={onRetry}
        showFlaggedState
      />,
    );

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('header', { name: 'Not counted in P&L' }),
    ).toBeOnTheScreen();
    expect(
      screen.getAllByTestId(/position-row-/).map((row) => row.props.testID),
    ).toEqual([
      'position-row-LOW',
      'position-row-MID',
      'position-row-Nigel',
      'position-row-Moodeng',
    ]);
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.POSITIONS_EMPTY),
    ).toBeNull();
  });

  it('hides the uncounted section when nothing is flagged', () => {
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
        showFlaggedState
      />,
    );

    expect(screen.queryByText('Not counted in P&L')).toBeNull();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SECTION),
    ).toBeNull();
    expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
  });

  it('leaves flagged rows in the normal sections when the flagged state is off', () => {
    const flagged = { ...openSpot, flags: ['insider'] };

    renderWithProvider(
      <ProfilePositionsTab
        positions={[flagged]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="all"
        onFilterChange={onFilterChange}
        onPositionPress={onPositionPress}
        onRetry={onRetry}
      />,
    );

    expect(screen.queryByText('Not counted in P&L')).toBeNull();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.TOKENS_SECTION),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
  });

  it('applies the Tokens filter inside the uncounted section', () => {
    const flaggedToken: Position = {
      ...openSpot,
      positionId: 'nigel',
      tokenSymbol: 'Nigel',
      flags: ['insider'],
    };
    const flaggedPerp: Position = {
      ...openPerp,
      positionId: 'moodeng-perp',
      tokenSymbol: 'Moodeng',
      flags: ['developer'],
    };

    renderWithProvider(
      <ProfilePositionsTab
        positions={[flaggedPerp, openSpot, flaggedToken]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="tokens"
        onFilterChange={onFilterChange}
        onPositionPress={onPositionPress}
        onRetry={onRetry}
        showFlaggedState
      />,
    );

    expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
    expect(screen.getByTestId('position-row-Nigel')).toBeOnTheScreen();
    expect(screen.queryByTestId('position-row-Moodeng')).toBeNull();
    expect(screen.getByText('Not counted in P&L')).toBeOnTheScreen();
    expect(screen.queryByText('Perpetuals')).toBeNull();
  });

  it('shows only the uncounted section when every visible row is flagged', () => {
    const flagged = { ...openSpot, flags: ['insider'] };

    renderWithProvider(
      <ProfilePositionsTab
        positions={[flagged]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="all"
        onFilterChange={onFilterChange}
        onPositionPress={onPositionPress}
        onRetry={onRetry}
        showFlaggedState
      />,
    );

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.TOKENS_SECTION),
    ).toBeNull();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.POSITIONS_EMPTY),
    ).toBeNull();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SECTION),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
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
        onFilterChange={onFilterChange}
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
