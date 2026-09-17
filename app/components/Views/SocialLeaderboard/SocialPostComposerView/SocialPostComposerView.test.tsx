import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import type { Position } from '@metamask/social-controllers';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialPostComposerView from './SocialPostComposerView';
import { SocialPostComposerViewSelectorsIDs } from './SocialPostComposerView.testIds';
import { SharePositionBottomSheetSelectorsIDs } from './SharePositionBottomSheet.testIds';
import {
  COMPOSER_POSTING_DELAY_MS,
  getSocialV1ComposedPosts,
  getSocialV1PendingPost,
  resetSocialV1ComposedFeedStore,
} from '../SocialV1View/feed/store/socialV1ComposedFeedStore';
import { isComposerCommentValid } from './commentValidation';

jest.mock('../SocialV1View/feed/components/SocialFeedPositionCard', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="composer-position-preview" />,
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
  pnlValueUsd: 278,
  pnlPercent: 0.02,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
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

const mockUseTraderPositions = jest.fn();

jest.mock('../TraderProfileView/hooks/useTraderPositions', () => ({
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

jest.mock('../components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

describe('SocialPostComposerView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetSocialV1ComposedFeedStore();
    mockUseTraderPositions.mockReturnValue({
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

  it('focuses the comment field from the GIF chip without attaching a gif', () => {
    renderWithProvider(<SocialPostComposerView />);

    fireEvent.press(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.GIF_CHIP),
    );

    expect(
      screen.queryByTestId(SocialPostComposerViewSelectorsIDs.GIF_PREVIEW),
    ).toBeNull();
    expect(
      screen.getByTestId(SocialPostComposerViewSelectorsIDs.INPUT),
    ).toBeOnTheScreen();
  });

  it('submits a pending post then pops the composer', () => {
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

    expect(getSocialV1PendingPost()).not.toBeNull();
    expect(mockGoBack).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);

    expect(getSocialV1PendingPost()).toBeNull();
    expect(getSocialV1ComposedPosts()).toHaveLength(1);
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
