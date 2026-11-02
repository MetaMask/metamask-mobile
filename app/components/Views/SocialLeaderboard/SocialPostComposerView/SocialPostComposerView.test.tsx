import React from 'react';
import { Keyboard, Platform, StyleSheet, TextInput } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import type { Position } from '@metamask/social-controllers';
import Routes from '../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../component-library/components/Toast';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialPostComposerView from './SocialPostComposerView';
import { SocialPostComposerViewSelectorsIDs } from './SocialPostComposerView.testIds';
import { AddPositionBottomSheetSelectorsIDs } from './AddPositionBottomSheet.testIds';
import {
  consumePostsTabFocus,
  getPendingPostsSnapshot,
  resetPendingPosts,
} from '../pendingPosts/pendingPostsStore';
import { isComposerCommentValid } from './commentValidation';
import { KLIPY_STATIC_GIF_EXAMPLE } from '../../../UI/SocialFeed/utils/klipyGifComment';

jest.mock('../../../hooks/useScreenTransitionComplete', () => ({
  __esModule: true,
  default: () => true,
}));

jest.mock('../analytics', () => ({
  ...jest.requireActual('../analytics'),
  useSocialInteraction: () => jest.fn(),
  useSocialScreenAnalytics: () => jest.fn(),
}));

jest.mock('../../../UI/SocialFeed/components/SocialFeedPositionCard', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="composer-position-preview" />,
    PositionCardBody: () => <View testID="composer-position-preview" />,
  };
});

jest.mock('../../../UI/SocialFeed/utils/perp', () => ({
  isPerpPosition: (position: { chain?: string }) =>
    position.chain === 'hyperliquid',
  isClosedPosition: () => false,
  getPerpPositionDirection: () => null,
}));

jest.mock('../../../UI/SocialFeed/utils/formatters', () => ({
  formatPercent: () => '+0.02%',
  formatSignedUsd: () => '+$1',
  formatSignedAbbreviatedUsd: () => '+$1',
  formatTradeUnitPrice: () => '$1,842',
  formatUsd: () => '$720.00',
  formatFeedTimestamp: () => 'Now',
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockRouteParams: unknown;
const OPENED_FROM_OWN_PROFILE = {
  index: 1,
  routes: [
    { name: Routes.SOCIAL.V1_PROFILE },
    { name: Routes.SOCIAL.POST_COMPOSER },
  ],
};
let mockNavigationState: unknown;
const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockCreateSwapComment = jest.fn();
const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};
const mockUseMyProfile = jest.fn();
const linkedProfile = {
  profileId: 'current-user',
  displayName: 'Giga Whale',
  handle: 'giga-whale',
  linkedAccountAddress: '0x1111111111111111111111111111111111111111',
};

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
  pnlValueUsd: 278,
  pnlPercent: 0.02,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
      dispatch: mockDispatch,
      getState: () => mockNavigationState,
      isFocused: jest.fn(() => true),
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({ params: mockRouteParams }),
  };
});

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

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

jest.mock('../../../UI/SocialFeed/components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./GifPickerSheet', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  const { KLIPY_STATIC_GIF_EXAMPLE: gifUrl } = jest.requireActual(
    '../../../UI/SocialFeed/utils/klipyGifComment',
  );
  return {
    __esModule: true,
    default: ({ onSelect }: { onSelect: (gifUrl: string) => void }) => (
      <View testID="gif-picker-sheet">
        <Pressable
          testID="gif-picker-select"
          onPress={() => onSelect(gifUrl)}
        />
      </View>
    ),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

jest.mock('./createSwapCommentApi', () => ({
  createSwapComment: (...args: unknown[]) => mockCreateSwapComment(...args),
}));

jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {
      invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
    },
  },
}));

describe('SocialPostComposerView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    mockNavigationState = OPENED_FROM_OWN_PROFILE;
    mockUseMyProfile.mockReturnValue({
      profile: linkedProfile,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    jest.useFakeTimers();
    resetPendingPosts();
    mockCreateSwapComment.mockResolvedValue({
      uid: 'comment-1',
      commentText: 'this is alpha',
      timestamp: 1700000000,
      author: { id: 'current-user', name: 'Giga Whale' },
    });
    mockUseTraderPositions.mockReturnValue({
      openPositions: [openSpot],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      openError: null,
      closedError: null,
      refetch: mockRefetch,
    });
  });

  afterEach(() => {
    resetPendingPosts();
    jest.useRealTimers();
  });

  it('keeps Post disabled until a position is selected', () => {
    renderWithProvider(<SocialPostComposerView />);

    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    ).toBeDisabled();

    fireEvent.changeText(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.INPUT),
      'this is alpha',
    );

    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    ).toBeDisabled();
  });

  it('enables Post when a position is selected, even with an empty caption', () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POSITION_CHIP),
    );
    fireEvent.press(screen.getByTestId('position-row-ETH'));

    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    ).toBeEnabled();
  });

  it('clips typed text at 250 characters', () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.changeText(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.INPUT),
      'a'.repeat(260),
    );

    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.INPUT).props.value,
    ).toHaveLength(250);
  });

  it('rejects comments that contain a url', () => {
    expect(isComposerCommentValid('this is https://phish.test')).toBe(false);
  });

  it('enables Post after a valid comment and selected position', () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.changeText(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.INPUT),
      'this is alpha',
    );
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POSITION_CHIP),
    );
    fireEvent.press(screen.getByTestId('position-row-ETH'));

    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    ).toBeEnabled();
  });

  it('replaces the selected position and removes it from the preview', () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POSITION_CHIP),
    );
    fireEvent.press(screen.getByTestId('position-row-ETH'));

    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.REMOVE_POSITION),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.REMOVE_POSITION),
    );

    expect(
      screen.queryByTestId(SocialPostComposerViewSelectorsIDs.REMOVE_POSITION),
    ).toBeNull();
    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POSITION_CHIP),
    ).toBeOnTheScreen();
  });

  it('focuses the comment field once after the screen transition', () => {
    const focusSpy = jest
      .spyOn(TextInput.prototype, 'focus')
      .mockImplementation(() => undefined);

    renderWithProvider(<SocialPostComposerView />);

    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.INPUT).props
        .autoFocus,
    ).toBeUndefined();
    expect(focusSpy).toHaveBeenCalledTimes(1);

    focusSpy.mockRestore();
  });

  it('dismisses the keyboard when the empty composer area is pressed', () => {
    const dismissSpy = jest
      .spyOn(Keyboard, 'dismiss')
      .mockImplementation(() => undefined);

    renderWithProvider(<SocialPostComposerView />);

    fireEvent.press(
      screen.getByTestId(
        SocialPostComposerViewSelectorsIDs.DISMISS_KEYBOARD_SURFACE,
      ),
    );

    expect(dismissSpy).toHaveBeenCalledTimes(1);

    dismissSpy.mockRestore();
  });

  it('dismisses the keyboard on drag and on taps the scroll content does not handle', () => {
    renderWithProvider(<SocialPostComposerView />);

    const scrollView = screen.getByTestId(
      SocialPostComposerViewSelectorsIDs.SCROLL,
    );

    expect(scrollView.props.keyboardShouldPersistTaps).toBe('handled');
    expect(scrollView.props.keyboardDismissMode).toBe(
      Platform.OS === 'ios' ? 'interactive' : 'on-drag',
    );
    expect(StyleSheet.flatten(scrollView.props.contentContainerStyle)).toEqual(
      expect.objectContaining({ flexGrow: 1 }),
    );
  });

  it('opens the GIF picker from the GIF chip without attaching a gif', () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.GIF_CHIP),
    );

    expect(screen.getByTestId('gif-picker-sheet')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialPostComposerViewSelectorsIDs.GIF_PREVIEW),
    ).toBeNull();
  });

  it('includes the selected gif on the submitted post', async () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.changeText(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.INPUT),
      'this is alpha',
    );
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.GIF_CHIP),
    );
    fireEvent.press(screen.getByTestId('gif-picker-select'));
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POSITION_CHIP),
    );
    fireEvent.press(screen.getByTestId('position-row-ETH'));
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    await waitFor(() => {
      expect(mockCreateSwapComment).toHaveBeenCalledWith({
        commentText: `this is alpha\n${KLIPY_STATIC_GIF_EXAMPLE}`,
        positionUid: 'eth-spot',
        source: 'metamask-mobile',
      });
    });

    await waitFor(() => {
      expect(getPendingPostsSnapshot()[0]?.post.gifUri).toBe(
        KLIPY_STATIC_GIF_EXAMPLE,
      );
    });
  });

  it('attaches the GIF chosen from the picker', () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.GIF_CHIP),
    );
    fireEvent.press(screen.getByTestId('gif-picker-select'));

    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.GIF_PREVIEW).props
        .source,
    ).toEqual({ uri: KLIPY_STATIC_GIF_EXAMPLE });
    expect(screen.queryByTestId('gif-picker-sheet')).toBeNull();
  });

  it('posts via swap-comments then returns to the social home', async () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.changeText(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.INPUT),
      'this is alpha',
    );
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POSITION_CHIP),
    );
    fireEvent.press(screen.getByTestId('position-row-ETH'));
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    await waitFor(() => {
      expect(mockCreateSwapComment).toHaveBeenCalledWith({
        commentText: 'this is alpha',
        positionUid: 'eth-spot',
        source: 'metamask-mobile',
      });
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['SocialService:fetchFeed'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['SocialService:fetchTraderFeed'],
    });
    expect(mockGoBack).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    const [entry] = getPendingPostsSnapshot();
    expect(entry).toMatchObject({
      commentId: 'comment-1',
      positionId: 'eth-spot',
      ownerProfileId: 'current-user',
    });
    expect(entry.post).toMatchObject({
      isPending: true,
      authorHandle: 'Giga Whale',
      timestampMs: 1700000000 * 1000,
    });
    expect(consumePostsTabFocus()).toBe(true);
  });

  it('falls back to the profile display name when the server sends no name', async () => {
    mockCreateSwapComment.mockResolvedValue({
      uid: 'comment-1',
      commentText: 'this is alpha',
      timestamp: 1700000000,
      author: { id: 'current-user', name: '' },
    });
    mockRouteParams = { position: openSpot, entryPoint: 'token_details' };
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    await waitFor(() => {
      expect(getPendingPostsSnapshot()[0]?.post.authorHandle).toBe(
        linkedProfile.displayName,
      );
    });
  });

  // The server returns `feedItem: null` for a position no feed lists.
  it('adds no pending post when no feed will serve the comment', async () => {
    mockCreateSwapComment.mockResolvedValue({
      uid: 'comment-1',
      commentText: 'this is alpha',
      timestamp: 1700000000,
      author: { id: 'current-user', name: 'Giga Whale' },
      positionUid: 'eth-spot',
      feedItem: null,
    });
    mockRouteParams = { position: openSpot, entryPoint: 'token_details' };
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
    expect(getPendingPostsSnapshot()).toHaveLength(0);
  });

  it('stays on the composer and shows a toast when createSwapComment fails', async () => {
    mockCreateSwapComment.mockRejectedValue(new Error('409'));

    renderWithProvider(
      <ToastContext.Provider value={{ toastRef: mockToastRef }}>
        <SocialPostComposerView />
      </ToastContext.Provider>,
    );

    fireEvent.changeText(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.INPUT),
      'this is alpha',
    );
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POSITION_CHIP),
    );
    fireEvent.press(screen.getByTestId('position-row-ETH'));
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalled();
    });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(getPendingPostsSnapshot()).toHaveLength(0);
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('closes the composer from the header close button', () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows a gif preview when the keyboard inserts an image', () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.INPUT),
      'onImageChange',
      { nativeEvent: { uri: 'https://media.test/party.gif' } },
    );

    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.GIF_PREVIEW),
    ).toBeOnTheScreen();
  });

  it('shows the position card when opened with an attached position', () => {
    mockRouteParams = { position: openSpot, entryPoint: 'token_details' };

    renderWithProvider(<SocialPostComposerView />);

    expect(screen.getByTestId('composer-position-preview')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialPostComposerViewSelectorsIDs.POSITION_CHIP),
    ).toBeNull();
  });

  it('replaces the composer with the viewer profile on Posts when opened from the feed', async () => {
    mockNavigationState = {
      index: 1,
      routes: [
        { name: Routes.SOCIAL.V1 },
        { name: Routes.SOCIAL.POST_COMPOSER },
      ],
    };
    mockRouteParams = { position: openSpot, entryPoint: 'perps' };

    renderWithProvider(<SocialPostComposerView />);
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.SOCIAL.V1_PROFILE),
      );
    });
    expect(getPendingPostsSnapshot()).toHaveLength(1);
    expect(consumePostsTabFocus()).toBe(true);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('goes back to the viewer profile when it was opened with their own trader id', async () => {
    mockNavigationState = {
      index: 1,
      routes: [
        {
          name: Routes.SOCIAL.V1_PROFILE,
          params: { traderId: linkedProfile.profileId },
        },
        { name: Routes.SOCIAL.POST_COMPOSER },
      ],
    };
    mockRouteParams = { position: openSpot, entryPoint: 'token_details' };

    renderWithProvider(<SocialPostComposerView />);
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('replaces the composer with Social V1 when openFeedAfterPost is set', async () => {
    mockRouteParams = {
      position: openSpot,
      entryPoint: 'perps',
      openFeedAfterPost: true,
    };

    renderWithProvider(<SocialPostComposerView />);
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.SOCIAL.V1),
      );
    });
    expect(getPendingPostsSnapshot()).toHaveLength(1);
    expect(consumePostsTabFocus()).toBe(false);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not go back to another trader profile after posting', async () => {
    mockNavigationState = {
      index: 1,
      routes: [
        {
          name: Routes.SOCIAL.V1_PROFILE,
          params: { traderId: 'someone-else' },
        },
        { name: Routes.SOCIAL.POST_COMPOSER },
      ],
    };
    mockRouteParams = { position: openSpot, entryPoint: 'token_details' };

    renderWithProvider(<SocialPostComposerView />);
    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.SOCIAL.V1_PROFILE),
      );
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('opens the share sheet from the Position chip', () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POSITION_CHIP),
    );

    expect(
      screen.getByTestId(AddPositionBottomSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
  });

  it('closes when opened without a linked wallet or tradeInFlight', () => {
    mockUseMyProfile.mockReturnValue({
      profile: { ...linkedProfile, linkedAccountAddress: undefined },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    renderWithProvider(<SocialPostComposerView />);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('stays open for tradeInFlight when the linked wallet is missing', () => {
    mockUseMyProfile.mockReturnValue({
      profile: { ...linkedProfile, linkedAccountAddress: undefined },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockRouteParams = {
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
    };

    renderWithProvider(<SocialPostComposerView />);

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    ).toBeEnabled();
  });

  it('posts tradeInFlight without a position picker and pins it to Following and Posts', async () => {
    mockRouteParams = {
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
        costLabel: '$329.47',
      },
    };

    renderWithProvider(
      <ToastContext.Provider value={{ toastRef: mockToastRef }}>
        <SocialPostComposerView />
      </ToastContext.Provider>,
    );

    expect(
      screen.queryByTestId(SocialPostComposerViewSelectorsIDs.POSITION_CHIP),
    ).toBeNull();
    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    ).toBeEnabled();

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    await waitFor(() => {
      expect(mockCreateSwapComment).toHaveBeenCalledWith({
        commentText: '',
        tradeInFlight: {
          transactionHash: '0xabc',
          chain: 'base',
          tokenAddress: '0xpump',
        },
        source: 'metamask-mobile',
      });
    });

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
    const [entry] = getPendingPostsSnapshot();
    expect(entry).toMatchObject({
      commentId: 'comment-1',
      positionId: null,
      post: expect.objectContaining({
        isPending: true,
        item: expect.objectContaining({ variant: 'spotShare' }),
      }),
    });
    expect(consumePostsTabFocus()).toBe(true);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('posts a Hyperliquid order id without a transaction hash', async () => {
    mockRouteParams = {
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
    };

    renderWithProvider(
      <ToastContext.Provider value={{ toastRef: mockToastRef }}>
        <SocialPostComposerView />
      </ToastContext.Provider>,
    );

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POST_BUTTON),
    );

    await waitFor(() => {
      expect(mockCreateSwapComment).toHaveBeenCalledWith({
        commentText: '',
        tradeInFlight: {
          orderId: '42',
          chain: 'hyperliquid',
          tokenAddress: 'ETH',
        },
        source: 'metamask-mobile',
      });
    });
  });
});
