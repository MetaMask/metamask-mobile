import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PostTradeShareBottomSheet from './PostTradeShareBottomSheet';
import { PostTradeShareBottomSheetSelectorsIDs } from './PostTradeShareBottomSheet.testIds';
import {
  beginPostTradeShareSession,
  clearPostTradeShareSession,
  getPostTradeShareSession,
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
  afterEach(() => {
    act(() => {
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

  it('disables Share while the swap is in progress', () => {
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
    ).toHaveTextContent('social_leaderboard.post_trade_share.in_progress');
    expect(
      screen.getByTestId(PostTradeShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    ).toBeDisabled();
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

  it('renders a failure state with a retry action', () => {
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
