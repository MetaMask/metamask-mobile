import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import TraderPositionBuyCta from './TraderPositionBuyCta';
import { useABTest } from '../../../../../hooks/useABTest';
import { useSwapBridgeNavigation } from '../../../../UI/Bridge/hooks/useSwapBridgeNavigation';
import { useQuickBuySetup } from './QuickBuy/hooks/useQuickBuySetup';
import {
  TOP_TRADERS_BUY_ACTION_AB_KEY,
  TOP_TRADERS_BUY_ACTION_EXPOSURE_METADATA,
  TOP_TRADERS_BUY_ACTION_VARIANTS,
} from '../abTestConfig';

const mockTraderPositionQuickBuy = jest.fn((_props: unknown) => null);
const mockPlayImpact = jest.fn();

jest.mock('../../../../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

jest.mock('../../../../UI/Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: jest.fn(),
  SwapBridgeNavigationLocation: { TokenView: 'Token View' },
}));

jest.mock('./QuickBuy/hooks/useQuickBuySetup', () => ({
  useQuickBuySetup: jest.fn(),
}));

jest.mock('./QuickBuy', () => ({
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

const mockUseABTest = useABTest as jest.MockedFunction<typeof useABTest>;
const mockUseSwapBridgeNavigation =
  useSwapBridgeNavigation as jest.MockedFunction<
    typeof useSwapBridgeNavigation
  >;
const mockUseQuickBuySetup = useQuickBuySetup as jest.MockedFunction<
  typeof useQuickBuySetup
>;

const BUY_BUTTON_TEST_ID = 'buy-button';

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
      buyButtonTestID={BUY_BUTTON_TEST_ID}
      {...props}
    />,
  );

describe('TraderPositionBuyCta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(mockUseSwapBridgeNavigation).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'Token View',
        sourcePage: 'follow_trader',
      }),
    );
  });

  describe('control variant', () => {
    beforeEach(() => setVariant(false));

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
          buyButtonTestID={BUY_BUTTON_TEST_ID}
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
    });

    expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        traderAddress: '0xtrader',
        marketCap: 1000,
        tokenPriceFiat: 1.23,
        source: 'profile_position',
        originalEntryPoint: 'leaderboard',
        isTraderPositionClosed: true,
      }),
    );
  });
});
