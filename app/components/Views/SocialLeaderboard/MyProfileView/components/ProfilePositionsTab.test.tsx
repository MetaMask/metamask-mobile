import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import type { Position } from '@metamask/social-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MyProfileViewSelectorsIDs } from '../MyProfileView.testIds';
import ProfilePositionsTab from './ProfilePositionsTab';

jest.mock('../../../../UI/SocialFeed/utils/perp', () => {
  const actual = jest.requireActual('../../../../UI/SocialFeed/utils/perp');
  return {
    ...actual,
    isPerpPosition: (position: { chain?: string; perpPositionType?: string }) =>
      position.perpPositionType != null || position.chain === 'hyperliquid',
  };
});

jest.mock('../../../../UI/SocialFeed/components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

const viewOpacities = () =>
  screen.UNSAFE_getAllByType(View).map((view) => {
    const style = StyleSheet.flatten(view.props.style) as
      | { opacity?: number }
      | undefined;
    return style?.opacity;
  });

const rowTestIds = () =>
  screen
    .getAllByTestId(/^position-row-(?!subtitle-|flag-|perp-badges-)/)
    .map((row) => row.props.testID as string);

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
        onFilterChange={onFilterChange}
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
    expect(screen.getByText('Not counted in P&L')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: 'Not counted in P&L, 2 positions. Learn why',
      }),
    ).toBeOnTheScreen();
    expect(
      StyleSheet.flatten(
        screen.getByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SECTION_HEADER)
          .props.style,
      ),
    ).toEqual(
      expect.objectContaining({
        alignSelf: 'flex-start',
        minHeight: 44,
      }),
    );
    expect(rowTestIds()).toEqual([
      'position-row-LOW',
      'position-row-MID',
      'position-row-Nigel',
      'position-row-Moodeng',
    ]);
    expect(screen.getByText(/· Insider/)).toBeOnTheScreen();
    expect(screen.getByText(/· Creator/)).toBeOnTheScreen();
    expect(viewOpacities()).not.toContain(0.5);
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
    expect(screen.queryByText(/· Insider/)).not.toBeOnTheScreen();
    expect(
      screen.queryByText('Insider allocation - excluded'),
    ).not.toBeOnTheScreen();
    expect(viewOpacities()).not.toContain(0.5);

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

  it('does not notify when a flagged row is pressed with showFlaggedState', () => {
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
    expect(screen.getByText(/· Insider/)).toBeOnTheScreen();
    expect(viewOpacities()).not.toContain(0.5);

    fireEvent.press(row);

    expect(onPositionPress).not.toHaveBeenCalled();
  });

  it('uses a singular accessibility label for one uncounted position', () => {
    renderTab([{ ...openSpot, flags: ['insider'] }], {
      showFlaggedState: true,
    });

    expect(
      screen.getByRole('button', {
        name: 'Not counted in P&L, 1 position. Learn why',
      }),
    ).toBeOnTheScreen();
  });

  it('reports a press on the uncounted section header', () => {
    const onUncountedHeaderPress = jest.fn();

    renderWithProvider(
      <ProfilePositionsTab
        positions={[{ ...openSpot, flags: ['insider'] }]}
        isLoading={false}
        error={null}
        isClosed={false}
        filter="all"
        onFilterChange={onFilterChange}
        onPositionPress={onPositionPress}
        onRetry={onRetry}
        showFlaggedState
        onUncountedHeaderPress={onUncountedHeaderPress}
      />,
    );

    const header = screen.getByTestId(
      MyProfileViewSelectorsIDs.UNCOUNTED_SECTION_HEADER,
    );

    expect(header).toHaveProp('accessibilityRole', 'button');
    expect(header).toHaveProp(
      'accessibilityLabel',
      'Not counted in P&L, 1 position. Learn why',
    );

    fireEvent.press(header);

    expect(onUncountedHeaderPress).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId(MyProfileViewSelectorsIDs.UNCOUNTED_SHEET),
    ).toBeNull();
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
