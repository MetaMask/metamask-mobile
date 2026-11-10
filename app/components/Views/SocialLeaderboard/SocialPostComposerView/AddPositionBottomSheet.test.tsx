import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import AddPositionBottomSheet from './AddPositionBottomSheet';
import { AddPositionBottomSheetSelectorsIDs } from './AddPositionBottomSheet.testIds';
import { HiddenPositionInfoSelectorsIDs } from './HiddenPositionInfo.testIds';

jest.mock('../../../UI/SocialFeed/utils/perp', () => ({
  isPerpPosition: (position: { chain?: string; perpPositionType?: string }) =>
    position.perpPositionType != null || position.chain === 'hyperliquid',
}));

const mockRefetch = jest.fn().mockResolvedValue(undefined);

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

const closedSpot: Position = {
  ...openSpot,
  positionId: 'doge-closed',
  tokenSymbol: 'DOGE',
  positionAmount: 0,
  soldUsd: 300,
  realizedPnl: 40,
  currentValueUSD: 0,
};

const createTraderPositions = (overrides: Record<string, unknown> = {}) => ({
  openPositions: [openSpot, openPerp],
  closedPositions: [closedSpot],
  isLoadingOpen: false,
  isLoadingClosed: false,
  error: null,
  openError: null,
  closedError: null,
  refetch: mockRefetch,
  ...overrides,
});

const mockUseTraderPositions = jest.fn();

jest.mock('../TraderProfileView/hooks', () => ({
  useTraderPositions: (...args: unknown[]) => mockUseTraderPositions(...args),
}));

jest.mock('../TraderProfileView/components/PositionRow', () => {
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

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('react-native-gesture-handler', () => {
  const chainable = () => {
    const api: Record<string, unknown> = {};
    const returnApi = () => api;
    [
      'enabled',
      'onBegin',
      'onStart',
      'onUpdate',
      'onEnd',
      'onFinalize',
      'activeOffsetX',
      'failOffsetY',
      'hitSlop',
      'minDistance',
      'maxPointers',
    ].forEach((method) => {
      api[method] = jest.fn(returnApi);
    });
    return api;
  };

  return {
    Gesture: {
      Pan: jest.fn(chainable),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

describe('AddPositionBottomSheet', () => {
  const onSelect = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTraderPositions.mockReturnValue({
      openPositions: [openSpot, openPerp],
      closedPositions: [closedSpot],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: mockRefetch,
    });
  });

  it('loads positions for the linked social address', () => {
    renderWithProvider(
      <AddPositionBottomSheet
        address="0x1111111111111111111111111111111111111111"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    expect(mockUseTraderPositions).toHaveBeenCalledWith(
      '0x1111111111111111111111111111111111111111',
    );
  });

  it('groups open tokens and perps', () => {
    renderWithProvider(
      <AddPositionBottomSheet
        address="0x1111111111111111111111111111111111111111"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    expect(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.TOKENS_SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.PERPS_SECTION),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
    expect(screen.getByTestId('position-row-BTC')).toBeOnTheScreen();
  });

  it('selects a closed position from the Closed tab', () => {
    renderWithProvider(
      <AddPositionBottomSheet
        address="0x1111111111111111111111111111111111111111"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    fireEvent.press(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.CLOSED_TAB),
    );
    fireEvent.press(screen.getByTestId('position-row-DOGE'));

    expect(onSelect).toHaveBeenCalledWith(closedSpot, true);
  });

  it('shows empty copy when both lists are empty', () => {
    mockUseTraderPositions.mockReturnValue({
      openPositions: [],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: mockRefetch,
    });

    renderWithProvider(
      <AddPositionBottomSheet
        address="0x1111111111111111111111111111111111111111"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    expect(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.EMPTY),
    ).toHaveTextContent(/social_leaderboard\.composer\.empty_title/);
    expect(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.EMPTY_HELP),
    ).toHaveTextContent('social_leaderboard.composer.empty_help');
  });

  it('opens hidden position info from the link when both lists are empty', () => {
    mockUseTraderPositions.mockReturnValue({
      openPositions: [],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: mockRefetch,
    });

    renderWithProvider(
      <AddPositionBottomSheet
        address="0x1111111111111111111111111111111111111111"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    fireEvent.press(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.EMPTY_HELP),
    );

    expect(
      screen.getByTestId(HiddenPositionInfoSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(HiddenPositionInfoSelectorsIDs.BODY),
    ).toHaveTextContent('social_leaderboard.composer.hidden_position_body');

    fireEvent.press(screen.getByTestId(HiddenPositionInfoSelectorsIDs.CONFIRM));

    expect(
      screen.queryByTestId(HiddenPositionInfoSelectorsIDs.SHEET),
    ).toBeNull();
    expect(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
  });

  it('shows an error with retry', () => {
    mockUseTraderPositions.mockReturnValue({
      openPositions: [],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: 'network',
      openError: 'network',
      closedError: null,
      refetch: mockRefetch,
    });

    renderWithProvider(
      <AddPositionBottomSheet
        address="0x1111111111111111111111111111111111111111"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    fireEvent.press(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.RETRY),
    );

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('still lists positions it has when the social fetch errored', () => {
    mockUseTraderPositions.mockReturnValue({
      openPositions: [openPerp],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: 'network',
      openError: 'network',
      closedError: null,
      refetch: mockRefetch,
    });

    renderWithProvider(
      <AddPositionBottomSheet
        address="0x1111111111111111111111111111111111111111"
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId('position-row-BTC')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(AddPositionBottomSheetSelectorsIDs.ERROR),
    ).toBeNull();
  });
});

describe('AddPositionBottomSheet hidden position link', () => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const address = '0x1111111111111111111111111111111111111111';

  const renderSheet = () =>
    renderWithProvider(
      <AddPositionBottomSheet
        address={address}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

  it('shows the link below a populated open list', () => {
    mockUseTraderPositions.mockReturnValue(createTraderPositions());

    renderSheet();

    expect(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.EMPTY_HELP),
    ).toBeOnTheScreen();
  });

  it('shows the link below a populated closed list', () => {
    mockUseTraderPositions.mockReturnValue(createTraderPositions());

    renderSheet();
    fireEvent.press(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.CLOSED_TAB),
    );

    expect(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.EMPTY_HELP),
    ).toBeOnTheScreen();
  });

  it('shows the link on the empty closed tab while open positions exist', () => {
    mockUseTraderPositions.mockReturnValue(
      createTraderPositions({ closedPositions: [] }),
    );

    renderSheet();
    fireEvent.press(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.CLOSED_TAB),
    );

    expect(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.EMPTY_HELP),
    ).toBeOnTheScreen();
  });

  it('hides the link while open positions are loading', () => {
    mockUseTraderPositions.mockReturnValue(
      createTraderPositions({ openPositions: [], isLoadingOpen: true }),
    );

    renderSheet();

    expect(
      screen.queryByTestId(AddPositionBottomSheetSelectorsIDs.EMPTY_HELP),
    ).not.toBeOnTheScreen();
  });

  it('hides the link when open positions fail to load', () => {
    mockUseTraderPositions.mockReturnValue(
      createTraderPositions({
        openPositions: [],
        error: 'network',
        openError: 'network',
      }),
    );

    renderSheet();

    expect(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.ERROR),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(AddPositionBottomSheetSelectorsIDs.EMPTY_HELP),
    ).not.toBeOnTheScreen();
  });

  it('shows the link when open positions fail but some are still listed', () => {
    mockUseTraderPositions.mockReturnValue(
      createTraderPositions({
        openPositions: [openPerp],
        error: 'network',
        openError: 'network',
      }),
    );

    renderSheet();

    expect(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.EMPTY_HELP),
    ).toBeOnTheScreen();
  });

  it('shows the visible positions title when the link is pressed', () => {
    mockUseTraderPositions.mockReturnValue(createTraderPositions());

    renderSheet();
    fireEvent.press(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.EMPTY_HELP),
    );

    expect(
      screen.getByText('social_leaderboard.composer.hidden_position_title'),
    ).toBeOnTheScreen();
  });
});
