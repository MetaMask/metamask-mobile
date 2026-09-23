import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SharePositionBottomSheet from './SharePositionBottomSheet';
import { SharePositionBottomSheetSelectorsIDs } from './SharePositionBottomSheet.testIds';

jest.mock('../utils/perp', () => ({
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

const mockUseComposerSharePositions = jest.fn();

jest.mock('./useComposerSharePositions', () => ({
  useComposerSharePositions: (...args: unknown[]) =>
    mockUseComposerSharePositions(...args),
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

describe('SharePositionBottomSheet', () => {
  const onSelect = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseComposerSharePositions.mockReturnValue({
      openPositions: [openSpot, openPerp],
      closedPositions: [closedSpot],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it('groups open tokens and perps', () => {
    renderWithProvider(
      <SharePositionBottomSheet onSelect={onSelect} onClose={onClose} />,
    );

    expect(
      screen.getByTestId(SharePositionBottomSheetSelectorsIDs.TOKENS_SECTION),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SharePositionBottomSheetSelectorsIDs.PERPS_SECTION),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('position-row-ETH')).toBeOnTheScreen();
    expect(screen.getByTestId('position-row-BTC')).toBeOnTheScreen();
  });

  it('selects a closed position from the Closed tab', () => {
    renderWithProvider(
      <SharePositionBottomSheet onSelect={onSelect} onClose={onClose} />,
    );

    fireEvent.press(
      screen.getByTestId(SharePositionBottomSheetSelectorsIDs.CLOSED_TAB),
    );
    fireEvent.press(screen.getByTestId('position-row-DOGE'));

    expect(onSelect).toHaveBeenCalledWith(closedSpot, true);
  });

  it('shows empty copy when both lists are empty', () => {
    mockUseComposerSharePositions.mockReturnValue({
      openPositions: [],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithProvider(
      <SharePositionBottomSheet onSelect={onSelect} onClose={onClose} />,
    );

    expect(
      screen.getByTestId(SharePositionBottomSheetSelectorsIDs.EMPTY),
    ).toHaveTextContent('social_leaderboard.composer.empty_description');
  });

  it('shows an error with retry', () => {
    mockUseComposerSharePositions.mockReturnValue({
      openPositions: [],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: new Error('network'),
      refetch: mockRefetch,
    });

    renderWithProvider(
      <SharePositionBottomSheet onSelect={onSelect} onClose={onClose} />,
    );

    fireEvent.press(
      screen.getByTestId(SharePositionBottomSheetSelectorsIDs.RETRY),
    );

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('still lists positions it has when the social fetch errored', () => {
    mockUseComposerSharePositions.mockReturnValue({
      openPositions: [openPerp],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: new Error('network'),
      refetch: mockRefetch,
    });

    renderWithProvider(
      <SharePositionBottomSheet onSelect={onSelect} onClose={onClose} />,
    );

    expect(screen.getByTestId('position-row-BTC')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SharePositionBottomSheetSelectorsIDs.ERROR),
    ).toBeNull();
  });
});
