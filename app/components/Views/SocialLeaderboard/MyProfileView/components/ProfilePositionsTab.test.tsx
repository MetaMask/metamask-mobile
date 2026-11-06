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
      flaggedPresentation,
    }: {
      position: Position;
      onPress?: (next: Position) => void;
      flaggedPresentation?: 'excluded' | 'subline';
    }) => (
      <Pressable
        testID={`position-row-${position.tokenSymbol}`}
        accessibilityState={{ disabled: !onPress }}
        accessibilityLabel={flaggedPresentation ?? 'default'}
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

const positionRow = (
  symbol: string,
  overrides: Partial<Position> = {},
): Position => ({
  ...openSpot,
  positionId: symbol,
  tokenSymbol: symbol,
  ...overrides,
});

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

  const renderTab = (
    positions: Position[],
    options: {
      filter?: 'all' | 'tokens' | 'perps';
      showFlaggedState?: boolean;
    } = {},
  ) =>
    renderWithProvider(
      <ProfilePositionsTab
        positions={positions}
        isLoading={false}
        error={null}
        isClosed={false}
        filter={options.filter ?? 'all'}
        onPositionPress={onPositionPress}
        onRetry={onRetry}
        showFlaggedState={options.showFlaggedState}
      />,
    );

  it('pins flagged positions under Not counted in P&L in input order', () => {
    const low = positionRow('LOW', { currentValueUSD: 1 });
    const flaggedHigh = positionRow('Nigel', {
      flags: ['insider'],
      currentValueUSD: 999,
    });
    const mid = positionRow('MID', { currentValueUSD: 50 });
    const flaggedDev = positionRow('Moodeng', {
      flags: ['developer'],
      currentValueUSD: 2,
    });

    renderTab([low, flaggedHigh, mid, flaggedDev], { showFlaggedState: true });

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
    renderTab([openSpot, openPerp], { showFlaggedState: true });

    expect(screen.queryByText('Not counted in P&L')).toBeNull();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SECTION),
    ).toBeNull();
    expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
  });

  it('pins the owner flagged rows in the normal presentation and keeps them pressable', () => {
    const flagged = { ...openSpot, flags: ['insider'] };

    renderTab([flagged]);

    const row = screen.getByTestId('position-row-ETH');

    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.TOKENS_SECTION),
    ).toBeNull();
    expect(row.props.accessibilityState).toEqual({ disabled: false });
    expect(row).toHaveProp('accessibilityLabel', 'default');

    fireEvent.press(row);

    expect(onPositionPress).toHaveBeenCalledTimes(1);
    expect(onPositionPress).toHaveBeenCalledWith(flagged);
  });

  it.each([
    ['tokens', ['ETH', 'Nigel'], ['Moodeng']],
    ['perps', ['Moodeng'], ['ETH', 'Nigel']],
  ] as const)(
    'applies the %s filter inside the uncounted section',
    (filter, visible, hidden) => {
      const flaggedToken = positionRow('Nigel', { flags: ['insider'] });
      const flaggedPerp: Position = {
        ...openPerp,
        positionId: 'Moodeng',
        tokenSymbol: 'Moodeng',
        flags: ['developer'],
      };

      renderTab([flaggedPerp, openSpot, flaggedToken], {
        filter,
        showFlaggedState: true,
      });

      visible.forEach((symbol) => {
        expect(screen.getByTestId(`position-row-${symbol}`)).toBeOnTheScreen();
      });
      hidden.forEach((symbol) => {
        expect(screen.queryByTestId(`position-row-${symbol}`)).toBeNull();
      });
      expect(screen.getByText('Not counted in P&L')).toBeOnTheScreen();
    },
  );

  it('notifies when a flagged row is pressed with showFlaggedState', () => {
    const flagged = { ...openSpot, flags: ['insider'] };

    renderTab([flagged], { showFlaggedState: true });

    const row = screen.getByTestId('position-row-ETH');

    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.TOKENS_SECTION),
    ).toBeNull();
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.POSITIONS_EMPTY),
    ).toBeNull();
    expect(
      screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SECTION),
    ).toBeOnTheScreen();

    fireEvent.press(row);

    expect(row.props.accessibilityState).toEqual({ disabled: false });
    expect(onPositionPress).toHaveBeenCalledTimes(1);
    expect(onPositionPress).toHaveBeenCalledWith(flagged);
    expect(row).toHaveProp('accessibilityLabel', 'subline');
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
