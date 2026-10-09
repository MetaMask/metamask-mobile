import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PostSwapShareBottomSheet from './PostSwapShareBottomSheet';
import { PostSwapShareBottomSheetSelectorsIDs } from './PostSwapShareBottomSheet.testIds';
import {
  beginPostSwapShareSession,
  clearPostSwapShareSession,
  getPostSwapShareSession,
} from './postSwapShareSession';
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

describe('PostSwapShareBottomSheet', () => {
  afterEach(() => {
    act(() => {
      clearPostSwapShareSession();
    });
    jest.clearAllMocks();
  });

  it('renders nothing when there is no session', () => {
    renderWithProvider(<PostSwapShareBottomSheet />);

    expect(
      screen.queryByTestId(PostSwapShareBottomSheetSelectorsIDs.SHEET),
    ).toBeNull();
  });

  it('disables Share while the swap is in progress', () => {
    beginPostSwapShareSession({
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

    renderWithProvider(<PostSwapShareBottomSheet />);

    expect(
      screen.getByTestId(PostSwapShareBottomSheetSelectorsIDs.TITLE),
    ).toHaveTextContent('social_leaderboard.post_swap_share.in_progress');
    expect(
      screen.getByTestId(PostSwapShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    ).toBeDisabled();
  });

  it('navigates to the composer with tradeInFlight on Share', () => {
    beginPostSwapShareSession({
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

    renderWithProvider(<PostSwapShareBottomSheet />);

    fireEvent.press(
      screen.getByTestId(PostSwapShareBottomSheetSelectorsIDs.SHARE_BUTTON),
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
    beginPostSwapShareSession({
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

    renderWithProvider(<PostSwapShareBottomSheet />);

    expect(
      screen.getByTestId(PostSwapShareBottomSheetSelectorsIDs.TITLE),
    ).toHaveTextContent('social_leaderboard.post_swap_share.failed');
    expect(
      screen.getByTestId(PostSwapShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    ).toHaveTextContent('social_leaderboard.post_swap_share.try_again');

    fireEvent.press(
      screen.getByTestId(PostSwapShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    );

    expect(getPostSwapShareSession()?.reopenRequested).toBe(true);
  });

  it('disables Share when a completed session has no transaction hash', () => {
    beginPostSwapShareSession({
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

    renderWithProvider(<PostSwapShareBottomSheet />);

    expect(
      screen.getByTestId(PostSwapShareBottomSheetSelectorsIDs.SHARE_BUTTON),
    ).toBeDisabled();
  });

  it('clears the session when the close button is pressed', () => {
    beginPostSwapShareSession({
      target,
      tradeMode: 'buy',
      preview: {
        tokenSymbol: 'PUMP',
        tokenAddress: '0xpump',
        chain: 'base',
        side: 'buy',
      },
    });

    renderWithProvider(<PostSwapShareBottomSheet />);

    fireEvent.press(
      screen.getByTestId(PostSwapShareBottomSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(getPostSwapShareSession()).toBeNull();
  });
});
