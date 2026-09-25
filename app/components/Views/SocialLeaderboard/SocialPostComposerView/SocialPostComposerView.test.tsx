import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import { ToastContext } from '../../../../component-library/components/Toast';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialPostComposerView from './SocialPostComposerView';
import { SocialPostComposerViewSelectorsIDs } from './SocialPostComposerView.testIds';
import { SharePositionBottomSheetSelectorsIDs } from './SharePositionBottomSheet.testIds';
import {
  commitSocialV1PendingPost,
  getSocialV1ComposedPosts,
  getSocialV1PendingPost,
  resetSocialV1ComposedFeedStore,
} from '../SocialV1View/feed/store/socialV1ComposedFeedStore';
import { isComposerCommentValid } from './commentValidation';

jest.mock('../../../hooks/useScreenTransitionComplete', () => ({
  __esModule: true,
  default: () => true,
}));

jest.mock('../SocialV1View/feed/components/SocialFeedPositionCard', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="composer-position-preview" />,
    PositionCardBody: () => <View testID="composer-position-preview" />,
  };
});

jest.mock('../utils/perp', () => ({
  isPerpPosition: (position: { chain?: string }) =>
    position.chain === 'hyperliquid',
  isClosedPosition: () => false,
  getPerpPositionDirection: () => null,
}));

jest.mock('../utils/formatters', () => ({
  formatPercent: () => '+0.02%',
  formatSignedUsd: () => '+$1',
  formatTradeUnitPrice: () => '$1,842',
  formatUsd: () => '$720.00',
  formatFeedTimestamp: () => 'Now',
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockCreateSwapComment = jest.fn();
const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
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
      isFocused: jest.fn(() => true),
      addListener: jest.fn(() => jest.fn()),
    }),
  };
});

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => ({
    profile: {
      profileId: 'current-user',
      displayName: 'Giga Whale',
      handle: 'giga-whale',
      shareUrl: 'https://metamask.io/social/giga-whale',
    },
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

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

jest.mock('../components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./GifPickerSheet', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onSelect }: { onSelect: (gifUrl: string) => void }) => (
      <View testID="gif-picker-sheet">
        <Pressable
          testID="gif-picker-select"
          onPress={() => onSelect('https://media.test/picked.gif')}
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
    jest.useFakeTimers();
    resetSocialV1ComposedFeedStore();
    mockCreateSwapComment.mockResolvedValue({
      uid: 'comment-1',
      commentText: 'this is alpha',
      timestamp: 1700000000,
    });
    mockUseComposerSharePositions.mockReturnValue({
      openPositions: [openSpot],
      closedPositions: [],
      isLoadingOpen: false,
      isLoadingClosed: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  afterEach(() => {
    resetSocialV1ComposedFeedStore();
    jest.useRealTimers();
  });

  it('keeps Post disabled until text and a position are valid', () => {
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

  it('focuses the comment field after the screen transition', () => {
    renderWithProvider(<SocialPostComposerView />);

    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.INPUT).props
        .autoFocus,
    ).toBe(true);
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
        commentText: 'this is alpha',
        positionUid: 'eth-spot',
        source: 'metamask-mobile',
      });
    });

    commitSocialV1PendingPost();

    expect(getSocialV1ComposedPosts()[0]?.gifUri).toBe(
      'https://media.test/picked.gif',
    );
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
    ).toEqual({ uri: 'https://media.test/picked.gif' });
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
    expect(getSocialV1PendingPost()).not.toBeNull();
    expect(mockGoBack).toHaveBeenCalled();

    commitSocialV1PendingPost();

    expect(getSocialV1PendingPost()).toBeNull();
    expect(getSocialV1ComposedPosts()).toHaveLength(1);
    expect(getSocialV1ComposedPosts()[0]?.id).toBe('comment-1');
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
    expect(getSocialV1PendingPost()).toBeNull();
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

  it('opens the share sheet from the Position chip', () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.POSITION_CHIP),
    );

    expect(
      screen.getByTestId(SharePositionBottomSheetSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
  });
});
