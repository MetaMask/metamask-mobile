import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/social-controllers';
import type { RootState } from '../../../../../reducers';
import TraderPositionBuyCta from './TraderPositionBuyCta';
import { useABTest } from '../../../../../hooks/useABTest';
import { useSwapBridgeNavigation } from '../../../../UI/Bridge/hooks/useSwapBridgeNavigation';
import { useQuickBuySetup } from '../../../../UI/QuickBuy/hooks/useQuickBuySetup';
import {
  beginPostTradeShareSession,
  clearPostTradeShareSession,
  PostTradeShareOwner,
  requestPostTradeShareReopen,
} from '../../PostTradeShareBottomSheet/postTradeShareSession';
import {
  TOP_TRADERS_BUY_ACTION_AB_KEY,
  TOP_TRADERS_BUY_ACTION_EXPOSURE_METADATA,
  TOP_TRADERS_BUY_ACTION_VARIANTS,
} from '../abTestConfig';

const mockTraderPositionQuickBuy = jest.fn((_props: unknown) => null);
// Defaults to a resolved promise so every call site can chain .catch (S9383).
const mockPlayImpact = jest.fn().mockResolvedValue(undefined);

let mockIsFocused = true;
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

jest.mock('../../../../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

jest.mock('../../../../UI/Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: jest.fn(),
  SwapBridgeNavigationLocation: {
    TokenView: 'Token View',
    FollowTradingTokenScreen: 'Follow Trading Token Screen',
  },
}));

jest.mock('../../../../UI/QuickBuy/hooks/useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

jest.mock('../../../../UI/QuickBuy', () => ({
  __esModule: true,
  default: (props: unknown) => mockTraderPositionQuickBuy(props),
  positionToQuickBuyTarget: (position: {
    tokenAddress: string;
    tokenSymbol: string;
    tokenName: string;
  }) => ({
    tokenAddress: position.tokenAddress,
    tokenSymbol: position.tokenSymbol,
    tokenName: position.tokenName,
    chain: 'eip155:1',
  }),
}));

jest.mock('../../../../../util/haptics', () => ({
  playImpact: (...args: unknown[]) => mockPlayImpact(...args),
  ImpactMoment: { PrimaryCTA: 'PrimaryCTA' },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockUseABTest = useABTest as jest.MockedFunction<typeof useABTest>;
const mockUseSwapBridgeNavigation =
  useSwapBridgeNavigation as jest.MockedFunction<
    typeof useSwapBridgeNavigation
  >;
const mockUseQuickBuySetup = useQuickBuySetup as jest.MockedFunction<
  typeof useQuickBuySetup
>;

const BUY_BUTTON_TEST_ID = 'buy-button';
const SELL_BUTTON_TEST_ID = 'sell-button';
const VIEWER_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

const mockReduxState = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            'account-1': { id: 'account-1', address: VIEWER_ADDRESS },
          },
          selectedAccount: 'account-1',
        },
      },
    },
  },
} as unknown as RootState;

const mockPosition: Position = {
  tokenAddress: '0xtoken',
  tokenSymbol: 'TKN',
  tokenName: 'Token',
  chain: 'ethereum',
} as unknown as Position;

const mockDestToken = {
  address: '0xtoken',
  symbol: 'TKN',
  name: 'Token',
  decimals: 18,
  image: 'https://image',
  chainId: '0x1' as const,
};

const mockGoToSwaps = jest.fn();

const setVariant = (openSwaps: boolean) => {
  mockUseABTest.mockReturnValue({
    variant: { openSwaps },
    variantName: openSwaps ? 'treatment' : 'control',
    isActive: true,
  });
};

const setDestToken = (
  destToken: typeof mockDestToken | undefined,
  isLoading = false,
) => {
  mockUseQuickBuySetup.mockReturnValue({
    chainId: destToken?.chainId,
    destToken,
    isLoading,
    isUnsupportedChain: false,
  });
};

const renderCta = (
  props?: Partial<React.ComponentProps<typeof TraderPositionBuyCta>>,
) =>
  render(
    <TraderPositionBuyCta
      position={mockPosition}
      onBuyCtaClicked={props?.onBuyCtaClicked ?? jest.fn()}
      onSellCtaClicked={props?.onSellCtaClicked ?? jest.fn()}
      buyButtonTestID={BUY_BUTTON_TEST_ID}
      sellButtonTestID={SELL_BUTTON_TEST_ID}
      {...props}
    />,
  );

describe('TraderPositionBuyCta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPostTradeShareSession();
    mockIsFocused = true;
    mockUseSelector.mockImplementation((selector) => selector(mockReduxState));
    mockUseSwapBridgeNavigation.mockReturnValue({
      goToSwaps: mockGoToSwaps,
    } as unknown as ReturnType<typeof useSwapBridgeNavigation>);
    setVariant(false);
    setDestToken(mockDestToken);
  });

  it('resolves the A/B test with the correct flag key, variants and exposure', () => {
    renderCta();
    expect(mockUseABTest).toHaveBeenCalledWith(
      TOP_TRADERS_BUY_ACTION_AB_KEY,
      TOP_TRADERS_BUY_ACTION_VARIANTS,
      TOP_TRADERS_BUY_ACTION_EXPOSURE_METADATA,
    );
  });

  it('opens the swaps view with follow_trader attribution', () => {
    renderCta();
    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith({
      location: 'Follow Trading Token Screen',
      sourcePage: 'follow_trader',
    });
  });

  it('labels the spot position action as Trade', () => {
    const { getByText, queryByText } = renderCta();

    expect(getByText('Trade')).toBeOnTheScreen();
    expect(queryByText('Buy')).toBeNull();
  });

  describe("the viewer's own open spot position", () => {
    it('renders Sell and Buy instead of Trade', () => {
      const { getByText, getByTestId, queryByText } = renderCta({
        traderAddress: '0x1234567890ABCDEF1234567890abcdef12345678',
        isTraderPositionClosed: false,
      });

      expect(getByTestId(SELL_BUTTON_TEST_ID)).toBeOnTheScreen();
      expect(getByText('Sell')).toBeOnTheScreen();
      expect(getByText('Buy')).toBeOnTheScreen();
      expect(queryByText('Trade')).toBeNull();
    });

    it('opens the QuickBuy sheet in sell mode on Sell press', () => {
      const onBuyCtaClicked = jest.fn();
      const onSellCtaClicked = jest.fn();
      const { getByTestId } = renderCta({
        traderAddress: VIEWER_ADDRESS,
        isTraderPositionClosed: false,
        onBuyCtaClicked,
        onSellCtaClicked,
      });

      fireEvent.press(getByTestId(SELL_BUTTON_TEST_ID));

      expect(mockPlayImpact).toHaveBeenCalledWith('PrimaryCTA');
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true, initialTradeMode: 'sell' }),
      );
      expect(mockGoToSwaps).not.toHaveBeenCalled();
      expect(onSellCtaClicked).toHaveBeenCalledTimes(1);
      expect(onBuyCtaClicked).not.toHaveBeenCalled();
    });

    it('swallows a rejected haptic promise when Sell is tapped', async () => {
      mockPlayImpact.mockRejectedValueOnce(new Error('haptic unavailable'));
      const { getByTestId } = renderCta({
        traderAddress: VIEWER_ADDRESS,
        isTraderPositionClosed: false,
      });

      // The catch handler on the playImpact promise must swallow the
      // rejection so tapping Sell never surfaces an unhandled rejection.
      fireEvent.press(getByTestId(SELL_BUTTON_TEST_ID));
      // Flush the rejected haptic promise's microtasks.
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true, initialTradeMode: 'sell' }),
      );
    });

    it('reopens the sheet in buy mode when Buy is tapped after Sell', () => {
      const { getByTestId, getByText } = renderCta({
        traderAddress: VIEWER_ADDRESS,
        isTraderPositionClosed: false,
      });

      fireEvent.press(getByTestId(SELL_BUTTON_TEST_ID));
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true, initialTradeMode: 'sell' }),
      );

      fireEvent.press(getByText('Buy'));
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true, initialTradeMode: 'buy' }),
      );
    });

    it('cancels a pending treatment buy when Sell is tapped', () => {
      setVariant(true);
      setDestToken(undefined, true);
      const { getByTestId, getByText, rerender } = renderCta({
        traderAddress: VIEWER_ADDRESS,
        isTraderPositionClosed: false,
      });

      // Buy while metadata is still loading defers the swaps navigation.
      fireEvent.press(getByText('Buy'));
      expect(mockGoToSwaps).not.toHaveBeenCalled();

      fireEvent.press(getByTestId(SELL_BUTTON_TEST_ID));
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true, initialTradeMode: 'sell' }),
      );

      // Metadata resolving afterwards must not navigate away from the sheet.
      setDestToken(mockDestToken, false);
      rerender(
        <TraderPositionBuyCta
          position={mockPosition}
          onBuyCtaClicked={jest.fn()}
          onSellCtaClicked={jest.fn()}
          buyButtonTestID={BUY_BUTTON_TEST_ID}
          sellButtonTestID={SELL_BUTTON_TEST_ID}
        />,
      );

      expect(mockGoToSwaps).not.toHaveBeenCalled();
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true, initialTradeMode: 'sell' }),
      );
    });

    it('opens the QuickBuy sheet in sell mode in the treatment variant', () => {
      setVariant(true);
      const { getByTestId } = renderCta({
        traderAddress: VIEWER_ADDRESS,
        isTraderPositionClosed: false,
      });

      fireEvent.press(getByTestId(SELL_BUTTON_TEST_ID));

      expect(mockGoToSwaps).not.toHaveBeenCalled();
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true, initialTradeMode: 'sell' }),
      );
    });
  });

  it("renders only Trade for another trader's open position", () => {
    const { getByText, queryByText } = renderCta({
      traderAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      isTraderPositionClosed: false,
    });

    expect(getByText('Trade')).toBeOnTheScreen();
    expect(queryByText('Sell')).toBeNull();
    expect(queryByText('Buy')).toBeNull();
  });

  it("keeps Trade for the viewer's own closed position", () => {
    const { getByText, queryByText } = renderCta({
      traderAddress: VIEWER_ADDRESS,
      isTraderPositionClosed: true,
    });

    expect(getByText('Trade')).toBeOnTheScreen();
    expect(queryByText('Sell')).toBeNull();
  });

  describe('control variant', () => {
    beforeEach(() => setVariant(false));

    it('reopens a failed sell on the sell side', () => {
      renderCta({ postTradeShare: true });

      act(() => {
        beginPostTradeShareSession({
          target: {
            tokenAddress: '0xtoken',
            tokenSymbol: 'TKN',
            tokenName: 'Token',
            chain: 'eip155:1',
          },
          tradeMode: 'sell',
          owner: PostTradeShareOwner.traderPosition,
          preview: {
            tokenSymbol: 'TKN',
            tokenAddress: '0xtoken',
            chain: 'ethereum',
            side: 'sell',
          },
        });
        requestPostTradeShareReopen();
      });

      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isVisible: true,
          initialTradeMode: 'sell',
        }),
      );
    });

    it('opens QuickBuy and does not navigate to swaps on Buy press', () => {
      const onBuyCtaClicked = jest.fn();
      const { getByTestId } = renderCta({ onBuyCtaClicked });

      fireEvent.press(getByTestId(BUY_BUTTON_TEST_ID));

      expect(mockPlayImpact).toHaveBeenCalledWith('PrimaryCTA');
      expect(onBuyCtaClicked).toHaveBeenCalledTimes(1);
      expect(mockGoToSwaps).not.toHaveBeenCalled();
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true }),
      );
    });
  });

  describe('treatment variant', () => {
    beforeEach(() => setVariant(true));

    it('navigates to swaps with the resolved dest token and does not open QuickBuy', () => {
      const onBuyCtaClicked = jest.fn();
      const { getByTestId } = renderCta({ onBuyCtaClicked });

      fireEvent.press(getByTestId(BUY_BUTTON_TEST_ID));

      expect(mockPlayImpact).toHaveBeenCalledWith('PrimaryCTA');
      expect(onBuyCtaClicked).toHaveBeenCalledTimes(1);
      expect(mockGoToSwaps).toHaveBeenCalledWith(
        undefined,
        mockDestToken,
        undefined,
        true,
      );
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: false }),
      );
    });

    it('falls back to QuickBuy when metadata settled with no usable token', () => {
      setDestToken(undefined, false);
      const onBuyCtaClicked = jest.fn();
      const { getByTestId } = renderCta({ onBuyCtaClicked });

      fireEvent.press(getByTestId(BUY_BUTTON_TEST_ID));

      expect(onBuyCtaClicked).toHaveBeenCalledTimes(1);
      expect(mockGoToSwaps).not.toHaveBeenCalled();
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true }),
      );
    });

    it('waits while metadata is loading, then navigates once it resolves (no QuickBuy fallback)', () => {
      setDestToken(undefined, true);
      const onBuyCtaClicked = jest.fn();
      const { getByTestId, rerender } = renderCta({ onBuyCtaClicked });

      fireEvent.press(getByTestId(BUY_BUTTON_TEST_ID));

      // Still loading — must neither navigate nor fall back to QuickBuy.
      expect(mockGoToSwaps).not.toHaveBeenCalled();
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: false }),
      );

      // Metadata resolves — the pending intent navigates to swaps.
      setDestToken(mockDestToken, false);
      rerender(
        <TraderPositionBuyCta
          position={mockPosition}
          onBuyCtaClicked={onBuyCtaClicked}
          onSellCtaClicked={jest.fn()}
          buyButtonTestID={BUY_BUTTON_TEST_ID}
          sellButtonTestID={SELL_BUTTON_TEST_ID}
        />,
      );

      expect(mockGoToSwaps).toHaveBeenCalledWith(
        undefined,
        mockDestToken,
        undefined,
        true,
      );
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: false }),
      );
    });

    it('cancels a pending buy without navigating when the screen loses focus', () => {
      setDestToken(undefined, true);
      const { getByTestId, rerender } = renderCta();

      fireEvent.press(getByTestId(BUY_BUTTON_TEST_ID));
      expect(mockGoToSwaps).not.toHaveBeenCalled();

      // User leaves the screen, then the metadata resolves in the background.
      mockIsFocused = false;
      setDestToken(mockDestToken, false);
      rerender(
        <TraderPositionBuyCta
          position={mockPosition}
          onBuyCtaClicked={jest.fn()}
          onSellCtaClicked={jest.fn()}
          buyButtonTestID={BUY_BUTTON_TEST_ID}
          sellButtonTestID={SELL_BUTTON_TEST_ID}
        />,
      );

      expect(mockGoToSwaps).not.toHaveBeenCalled();
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: false }),
      );
    });
  });

  it('does nothing when there is no position', () => {
    const onBuyCtaClicked = jest.fn();
    const { getByTestId } = renderCta({ position: null, onBuyCtaClicked });

    fireEvent.press(getByTestId(BUY_BUTTON_TEST_ID));

    expect(onBuyCtaClicked).not.toHaveBeenCalled();
    expect(mockGoToSwaps).not.toHaveBeenCalled();
  });

  it('forwards analytics props to QuickBuy', () => {
    renderCta({
      traderAddress: '0xtrader',
      marketCap: 1000,
      tokenPriceFiat: 1.23,
      source: 'profile_position',
      originalEntryPoint: 'leaderboard',
      isTraderPositionClosed: true,
      postTradeShare: true,
    });

    expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        traderAddress: '0xtrader',
        marketCap: 1000,
        tokenPriceFiat: 1.23,
        source: 'profile_position',
        originalEntryPoint: 'leaderboard',
        isTraderPositionClosed: true,
        postTradeShare: true,
      }),
    );
  });
});
