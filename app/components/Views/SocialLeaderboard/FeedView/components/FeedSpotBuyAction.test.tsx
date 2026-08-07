import React from 'react';
import { act, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import FeedSpotBuyAction, {
  type FeedSpotBuyActionHandle,
} from './FeedSpotBuyAction';
import type { QuickBuyTarget } from '../../TraderPositionView/components/QuickBuy';

const target: QuickBuyTarget = {
  tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  chain: 'eip155:1',
};

let mockIsFocused = true;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => mockIsFocused,
}));

let mockAbTestVariant: { openSwaps: boolean } = { openSwaps: false };
jest.mock('../../../../../hooks/useABTest', () => ({
  useABTest: () => ({ variant: mockAbTestVariant }),
}));

const mockGoToSwaps = jest.fn();
jest.mock('../../../../UI/Bridge/hooks/useSwapBridgeNavigation', () => ({
  SwapBridgeNavigationLocation: {
    TokenView: 'TokenView',
    FollowTradingFeedScreen: 'Follow Trading Feed Screen',
  },
  useSwapBridgeNavigation: () => ({ goToSwaps: mockGoToSwaps }),
}));

let mockDestToken: unknown = {
  address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  symbol: 'PEPE',
  name: 'Pepe',
  decimals: 18,
  chainId: '0x1',
};
let mockQuickBuyIsLoading = false;
jest.mock(
  '../../TraderPositionView/components/QuickBuy/hooks/useQuickBuySetup',
  () => ({
    useQuickBuySetup: () => ({
      destToken: mockDestToken,
      isLoading: mockQuickBuyIsLoading,
      chainId: undefined,
      isUnsupportedChain: false,
    }),
  }),
);

let mockQuickBuyAnalyticsContext: { source?: string } | undefined;
jest.mock('../../TraderPositionView/components/QuickBuy', () => {
  const { View } = jest.requireActual('react-native');
  return {
    QuickBuy: {
      Root: ({
        isVisible,
        analyticsContext,
      }: {
        isVisible: boolean;
        analyticsContext?: { source?: string };
      }) => {
        mockQuickBuyAnalyticsContext = analyticsContext;
        return isVisible ? <View testID="mock-quick-buy-open" /> : null;
      },
    },
    TOP_TRADERS_QUICK_BUY_FEATURES: {},
  };
});

const renderAction = (isActive = true) => {
  const ref = React.createRef<FeedSpotBuyActionHandle>();
  renderWithProvider(<FeedSpotBuyAction ref={ref} isActive={isActive} />);
  return ref;
};

describe('FeedSpotBuyAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAbTestVariant = { openSwaps: false };
    mockIsFocused = true;
    mockDestToken = {
      address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
      symbol: 'PEPE',
      name: 'Pepe',
      decimals: 18,
      chainId: '0x1',
    };
    mockQuickBuyIsLoading = false;
    mockQuickBuyAnalyticsContext = undefined;
  });

  it('opens the QuickBuy sheet (control) with the trader_feed source', () => {
    const ref = renderAction();

    act(() => ref.current?.open(target));

    expect(screen.getByTestId('mock-quick-buy-open')).toBeOnTheScreen();
    expect(mockQuickBuyAnalyticsContext).toEqual({ source: 'trader_feed' });
    expect(mockGoToSwaps).not.toHaveBeenCalled();
  });

  it('navigates to swaps (treatment) with the resolved destination token', () => {
    mockAbTestVariant = { openSwaps: true };
    const ref = renderAction();

    act(() => ref.current?.open(target));

    expect(mockGoToSwaps).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ symbol: 'PEPE', chainId: '0x1' }),
      undefined,
      true,
    );
    expect(screen.queryByTestId('mock-quick-buy-open')).not.toBeOnTheScreen();
  });

  it('falls back to QuickBuy (treatment) when the token metadata cannot be resolved', () => {
    mockAbTestVariant = { openSwaps: true };
    mockDestToken = undefined;
    mockQuickBuyIsLoading = false;
    const ref = renderAction();

    act(() => ref.current?.open(target));

    expect(mockGoToSwaps).not.toHaveBeenCalled();
    expect(screen.getByTestId('mock-quick-buy-open')).toBeOnTheScreen();
  });

  it('waits (treatment) while token metadata is still loading — no swaps or fallback', () => {
    mockAbTestVariant = { openSwaps: true };
    mockDestToken = undefined;
    mockQuickBuyIsLoading = true;
    const ref = renderAction();

    act(() => ref.current?.open(target));

    expect(mockGoToSwaps).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mock-quick-buy-open')).not.toBeOnTheScreen();
  });

  it('cancels a pending swap (treatment) without navigating when the route loses focus', () => {
    mockAbTestVariant = { openSwaps: true };
    mockIsFocused = false;
    const ref = renderAction();

    act(() => ref.current?.open(target));

    expect(mockGoToSwaps).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mock-quick-buy-open')).not.toBeOnTheScreen();
  });

  it('cancels a pending swap (treatment) when it is not the active surface', () => {
    mockAbTestVariant = { openSwaps: true };
    mockIsFocused = true;
    const ref = renderAction(false);

    act(() => ref.current?.open(target));

    expect(mockGoToSwaps).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mock-quick-buy-open')).not.toBeOnTheScreen();
  });
});
