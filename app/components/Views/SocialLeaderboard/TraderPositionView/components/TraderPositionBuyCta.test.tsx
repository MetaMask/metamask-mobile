import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
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
const mockPlayImpact = jest.fn();

let mockIsFocused = true;
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));

const mockEnsureSocialTermsAccepted = jest.fn(
  (_onAccepted?: () => void) => true,
);
jest.mock('../../terms/useSocialTermsGate', () => ({
  useSocialTermsGate: () => ({
    ensureSocialTermsAccepted: mockEnsureSocialTermsAccepted,
  }),
}));

const mockEnsureSocialProfileOnboarding = jest.fn(() => true);
jest.mock('../../hooks/useRequireSocialProfileOnboarding', () => ({
  useRequireSocialProfileOnboarding: () => ({
    ensureSocialProfileOnboarding: mockEnsureSocialProfileOnboarding,
  }),
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
    clearPostTradeShareSession();
    mockIsFocused = true;
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
          buyButtonTestID={BUY_BUTTON_TEST_ID}
        />,
      );

      expect(mockGoToSwaps).not.toHaveBeenCalled();
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: false }),
      );
    });
  });

  describe('social profile gate', () => {
    it('opens profile onboarding instead of buying without a linked wallet', () => {
      mockEnsureSocialProfileOnboarding.mockReturnValueOnce(false);
      const onBuyCtaClicked = jest.fn();
      const { getByTestId } = renderCta({
        onBuyCtaClicked,
        requireSocialProfile: true,
      });

      fireEvent.press(getByTestId(BUY_BUTTON_TEST_ID));

      expect(mockEnsureSocialProfileOnboarding).toHaveBeenCalledTimes(1);
      expect(onBuyCtaClicked).not.toHaveBeenCalled();
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: false }),
      );
    });

    it('asks for the Social terms before buying', () => {
      mockEnsureSocialTermsAccepted.mockReturnValueOnce(false);
      const onBuyCtaClicked = jest.fn();
      const { getByTestId } = renderCta({
        onBuyCtaClicked,
        requireSocialProfile: true,
      });

      fireEvent.press(getByTestId(BUY_BUTTON_TEST_ID));

      expect(mockEnsureSocialTermsAccepted).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(mockEnsureSocialProfileOnboarding).not.toHaveBeenCalled();
      expect(onBuyCtaClicked).not.toHaveBeenCalled();
    });

    it('opens QuickBuy once the Social profile is set up', () => {
      const onBuyCtaClicked = jest.fn();
      const { getByTestId } = renderCta({
        onBuyCtaClicked,
        requireSocialProfile: true,
      });

      fireEvent.press(getByTestId(BUY_BUTTON_TEST_ID));

      expect(onBuyCtaClicked).toHaveBeenCalledTimes(1);
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true }),
      );
    });

    it('skips the gates when the profile is not required', () => {
      const { getByTestId } = renderCta();

      fireEvent.press(getByTestId(BUY_BUTTON_TEST_ID));

      expect(mockEnsureSocialTermsAccepted).not.toHaveBeenCalled();
      expect(mockEnsureSocialProfileOnboarding).not.toHaveBeenCalled();
      expect(mockTraderPositionQuickBuy).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true }),
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
