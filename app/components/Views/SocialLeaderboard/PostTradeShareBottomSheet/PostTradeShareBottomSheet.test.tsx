import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PostTradeShareBottomSheet from './PostTradeShareBottomSheet';
import { PostTradeShareBottomSheetSelectorsIDs } from './PostTradeShareBottomSheet.testIds';
import {
  beginPostTradeShareSession,
  clearPostTradeShareSession,
  getPostTradeShareSession,
  registerPostTradeShareReopenOwner,
  type PostTradeShareVariant,
} from './postTradeShareSession';
import type { QuickBuyTarget } from '../../../UI/QuickBuy';

const mockNavigate = jest.fn();

jest.mock('../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: (...args: unknown[]) => mockNavigate(...args),
    },
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const target: QuickBuyTarget = {
  tokenAddress: '0xpump',
  tokenSymbol: 'PUMP',
  tokenName: 'Pump',
  chain: 'eip155:8453',
};

describe('PostTradeShareBottomSheet', () => {
  const unregisterOwners: (() => void)[] = [];
  const registerOwner = (owner: string) => {
    const unregister = registerPostTradeShareReopenOwner(owner);
    unregisterOwners.push(unregister);
    return unregister;
  };

  afterEach(() => {
    act(() => {
      unregisterOwners.splice(0).forEach((unregister) => unregister());
      clearPostTradeShareSession();
    });
    jest.clearAllMocks();
  });

  it('renders nothing when there is no session', () => {
    renderWithProvider(<PostTradeShareBottomSheet />);

    expect(
      screen.queryByTestId(PostTradeShareBottomSheetSelectorsIDs.SHEET),
    ).toBeNull();
  });

  it('disables Create post while the swap is in progress', () => {
    beginPostTradeShareSession({
      target,
      tradeMode: 'buy',
      pairLabel: '1 USDC → 100 PUMP',
      tradeInFlightChain: 'base',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    renderWithProvider(<PostTradeShareBottomSheet />);

    expect(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.TITLE),
    ).toHaveTextContent('social_leaderboard.post_trade_share.swap_in_progress');
    expect(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.CARD_TITLE),
    ).toHaveTextContent(
      'social_leaderboard.post_trade_share.post_and_earn_title',
    );
    const primary = screen.getByTestId(
      PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON,
    );
    expect(primary).toHaveTextContent(
      'social_leaderboard.post_trade_share.create_post',
    );
    expect(primary).toBeDisabled();
  });

  it('shows the perps in-progress title', () => {
    beginPostTradeShareSession({
      product: 'perps',
      preview: {
        product: 'perps',
        tokenSymbol: 'ETH',
        tradeSymbol: 'ETH',
        tokenAddress: 'ETH',
        direction: 'long',
      },
    });

    renderWithProvider(<PostTradeShareBottomSheet />);

    expect(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.TITLE),
    ).toHaveTextContent(
      'social_leaderboard.post_trade_share.order_in_progress',
    );
  });

  describe('View activity', () => {
    it('opens wallet activity for a swap', () => {
      beginPostTradeShareSession({
        target,
        tradeMode: 'buy',
        preview: {
          tokenSymbol: 'PUMP',
          tokenAddress: '0xpump',
          chain: 'base',
          side: 'buy',
        },
      });

      renderWithProvider(<PostTradeShareBottomSheet />);

      fireEvent.press(
        screen.getByTestId(
          PostTradeShareBottomSheetSelectorsIDs.VIEW_ACTIVITY_BUTTON,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith('TransactionsView');
      expect(getPostTradeShareSession()).toBeNull();
    });

    it('opens perps activity for a perps order', () => {
      beginPostTradeShareSession({
        product: 'perps',
        status: 'failed',
        preview: {
          product: 'perps',
          tokenSymbol: 'ETH',
          tradeSymbol: 'ETH',
          tokenAddress: 'ETH',
          direction: 'long',
        },
      });

      renderWithProvider(<PostTradeShareBottomSheet />);

      fireEvent.press(
        screen.getByTestId(
          PostTradeShareBottomSheetSelectorsIDs.VIEW_ACTIVITY_BUTTON,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith('Perps', {
        screen: 'PerpsActivity',
        params: { redirectToPerpsTransactions: true, showBackButton: true },
      });
      expect(getPostTradeShareSession()).toBeNull();
    });
  });

  describe('create profile variant', () => {
    it('enables Create profile while the trade is in progress', () => {
      beginPostTradeShareSession({
        variant: 'create_profile',
        target,
        tradeMode: 'buy',
        preview: {
          tokenSymbol: 'PUMP',
          tokenAddress: '0xpump',
          chain: 'base',
          side: 'buy',
        },
      });

      renderWithProvider(<PostTradeShareBottomSheet />);

      expect(
        screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.CARD_TITLE),
      ).toHaveTextContent(
        'social_leaderboard.post_trade_share.create_profile_title',
      );
      const primary = screen.getByTestId(
        PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON,
      );
      expect(primary).toHaveTextContent(
        'social_leaderboard.post_trade_share.create_profile',
      );
      expect(primary).not.toBeDisabled();
    });

    it('opens profile onboarding and clears the session', () => {
      beginPostTradeShareSession({
        variant: 'create_profile',
        product: 'perps',
        status: 'complete',
        orderId: '42',
        preview: {
          product: 'perps',
          tokenSymbol: 'ETH',
          tradeSymbol: 'ETH',
          tokenAddress: 'ETH',
          direction: 'long',
        },
      });

      renderWithProvider(<PostTradeShareBottomSheet />);

      fireEvent.press(
        screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith('SocialProfileOnboardingView');
      expect(getPostTradeShareSession()).toBeNull();
    });
  });

  it('navigates to the composer with tradeInFlight on Share', () => {
    beginPostTradeShareSession({
      target,
      tradeMode: 'buy',
      status: 'complete',
      tradeInFlightChain: 'base',
      transactionHash: '0xabc',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    renderWithProvider(<PostTradeShareBottomSheet />);

    fireEvent.press(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith('SocialPostComposerView', {
      tradeInFlight: {
        transactionHash: '0xabc',
        chain: 'base',
        tokenAddress: '0xpump',
      },
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });
  });

  describe('failed swap', () => {
    const beginFailedSwap = ({
      variant,
    }: { variant?: PostTradeShareVariant } = {}) =>
      beginPostTradeShareSession({
        target,
        tradeMode: 'buy',
        status: 'failed',
        variant,
        owner: 'social-v1-feed',
        preview: {
          tokenSymbol: 'PUMP',
          tokenAddress: '0xpump',
          chain: 'base',
          side: 'buy',
        },
      });

    it('renders a failure state with a retry action when the owner can reopen', () => {
      registerOwner('social-v1-feed');
      beginFailedSwap();

      renderWithProvider(<PostTradeShareBottomSheet />);

      expect(
        screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.TITLE),
      ).toHaveTextContent('social_leaderboard.post_trade_share.failed');
      expect(
        screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
      ).toHaveTextContent('social_leaderboard.post_trade_share.try_again');

      fireEvent.press(
        screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
      );

      expect(getPostTradeShareSession()?.reopenRequested).toBe(true);
    });

    it('hides the post and earn card', () => {
      beginFailedSwap();

      renderWithProvider(<PostTradeShareBottomSheet />);

      expect(
        screen.queryByTestId(PostTradeShareBottomSheetSelectorsIDs.CARD),
      ).toBeNull();
      expect(
        screen.getByTestId(
          PostTradeShareBottomSheetSelectorsIDs.VIEW_ACTIVITY_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('hides the create profile card', () => {
      beginFailedSwap({ variant: 'create_profile' });

      renderWithProvider(<PostTradeShareBottomSheet />);

      expect(
        screen.queryByTestId(PostTradeShareBottomSheetSelectorsIDs.CARD),
      ).toBeNull();
    });

    it('closes instead of retrying when the owner screen is not mounted', () => {
      beginFailedSwap();

      renderWithProvider(<PostTradeShareBottomSheet />);

      expect(
        screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
      ).toHaveTextContent('social_leaderboard.post_trade_share.close');

      fireEvent.press(
        screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
      );

      expect(getPostTradeShareSession()).toBeNull();
    });

    it('switches Try again to Close when the owner screen unmounts', () => {
      const unregister = registerOwner('social-v1-feed');
      beginFailedSwap();

      renderWithProvider(<PostTradeShareBottomSheet />);

      expect(
        screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
      ).toHaveTextContent('social_leaderboard.post_trade_share.try_again');

      act(() => {
        unregister();
      });

      expect(
        screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
      ).toHaveTextContent('social_leaderboard.post_trade_share.close');
    });
  });

  it('closes a failed swap with no owner screen to retry from', () => {
    beginPostTradeShareSession({
      target,
      tradeMode: 'buy',
      status: 'failed',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    renderWithProvider(<PostTradeShareBottomSheet />);

    expect(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    ).toHaveTextContent('social_leaderboard.post_trade_share.close');

    fireEvent.press(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    );

    expect(getPostTradeShareSession()).toBeNull();
  });

  it('disables Share when a completed session has no transaction hash', () => {
    beginPostTradeShareSession({
      target,
      tradeMode: 'buy',
      status: 'complete',
      tradeInFlightChain: 'base',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    renderWithProvider(<PostTradeShareBottomSheet />);

    expect(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    ).toBeDisabled();
  });

  it('navigates to the composer with a Hyperliquid order id on Share', () => {
    beginPostTradeShareSession({
      product: 'perps',
      status: 'complete',
      orderId: '42',
      pairLabel: '40x Long ETH',
      preview: {
        product: 'perps',
        tokenSymbol: 'ETH',
        tradeSymbol: 'ETH',
        tokenAddress: 'ETH',
        direction: 'long',
        leverageLabel: '40x',
      },
    });

    renderWithProvider(<PostTradeShareBottomSheet />);

    expect(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.TITLE),
    ).toHaveTextContent('social_leaderboard.post_trade_share.order_complete');

    fireEvent.press(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith('SocialPostComposerView', {
      tradeInFlight: {
        orderId: '42',
        chain: 'hyperliquid',
        tokenAddress: 'ETH',
      },
      preview: {
        product: 'perps',
        tokenSymbol: 'ETH',
        tradeSymbol: 'ETH',
        tokenAddress: 'ETH',
        direction: 'long',
        leverageLabel: '40x',
      },
    });
    expect(mockNavigate.mock.calls[0][1].tradeInFlight.transactionHash).toBe(
      undefined,
    );
  });

  it('closes a failed perps order without requesting a retry', () => {
    beginPostTradeShareSession({
      product: 'perps',
      status: 'failed',
      preview: {
        product: 'perps',
        tokenSymbol: 'ETH',
        tradeSymbol: 'ETH',
        tokenAddress: 'ETH',
        direction: 'long',
      },
    });

    renderWithProvider(<PostTradeShareBottomSheet />);

    expect(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.TITLE),
    ).toHaveTextContent('social_leaderboard.post_trade_share.order_failed');
    expect(
      screen.queryByTestId(PostTradeShareBottomSheetSelectorsIDs.CARD),
    ).toBeNull();
    expect(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    ).toHaveTextContent('social_leaderboard.post_trade_share.close');

    fireEvent.press(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    );

    expect(getPostTradeShareSession()).toBeNull();
  });

  it('clears the session when the close button is pressed', () => {
    beginPostTradeShareSession({
      target,
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    renderWithProvider(<PostTradeShareBottomSheet />);

    fireEvent.press(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(getPostTradeShareSession()).toBeNull();
  });
});
