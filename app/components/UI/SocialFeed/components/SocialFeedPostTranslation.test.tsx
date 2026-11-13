import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import {
  translateComment,
  type TranslateCommentResult,
} from '../translateComment';
import type { SocialV1FeedPost } from '../types';
import SocialFeedPostTranslation from './SocialFeedPostTranslation';
import { SocialFeedPostShellSelectorsIDs } from './SocialFeedPostShell.testIds';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '99.0.0'),
}));

jest.mock('../translateComment', () => ({
  translateComment: jest.fn(),
}));

const createPost = (
  overrides: Partial<SocialV1FeedPost> = {},
): SocialV1FeedPost => ({
  id: 'post-1',
  authorHandle: 'giga-whale',
  authorImageUrl: null,
  timestampMs: 1,
  commentId: 'comment-1',
  reactions: [],
  sourceLanguage: 'ko',
  item: mockOpenPerpsFeedItem({
    id: 'item-1',
    comment: 'Original comment',
  }),
  ...overrides,
});

const renderTranslation = (post: SocialV1FeedPost) =>
  renderWithProvider(
    <SocialFeedPostTranslation post={post} />,
    {
      state: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                aiSocialCommentTranslation: {
                  enabled: true,
                  minimumVersion: '0.0.0',
                },
              },
            },
          },
        },
      },
    },
    false,
  );

describe('SocialFeedPostTranslation', () => {
  const mockTranslateComment = jest.mocked(translateComment);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the comment as body sm regular', () => {
    renderTranslation(createPost());

    expect(
      StyleSheet.flatten(screen.getByText('Original comment').props.style),
    ).toEqual(
      expect.objectContaining({
        fontSize: 14,
        lineHeight: 22,
        fontFamily: 'Inter-Regular',
      }),
    );
  });

  it('ignores a pending translation after the comment changes', async () => {
    let resolveTranslation: (value: TranslateCommentResult) => void = jest.fn();
    mockTranslateComment.mockReturnValue(
      new Promise((resolve) => {
        resolveTranslation = resolve;
      }),
    );
    const { rerender } = renderTranslation(createPost());

    fireEvent.press(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.TRANSLATE}-post-1`),
    );
    rerender(
      <SocialFeedPostTranslation
        post={createPost({
          commentId: 'comment-2',
          item: mockOpenPerpsFeedItem({
            id: 'item-1',
            comment: 'A newer comment',
          }),
        })}
      />,
    );
    await act(async () => {
      resolveTranslation({
        state: 'translated',
        sourceLanguage: 'ko',
        translations: { en: 'Stale translation' },
      });
    });

    expect(screen.getByText('A newer comment')).toBeOnTheScreen();
    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.TRANSLATE}-post-1`),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Stale translation')).not.toBeOnTheScreen();
  });

  const fireMeasuredLines = (lineCount: number) => {
    act(() => {
      fireEvent(
        screen.getByTestId(SocialFeedPostShellSelectorsIDs.COMMENT_MEASURE, {
          includeHiddenElements: true,
        }),
        'onTextLayout',
        {
          nativeEvent: {
            lines: Array.from({ length: lineCount }, (_, index) => ({
              text: `line ${index + 1}`,
              x: 0,
              y: index * 22,
              width: 100,
              height: 22,
            })),
          },
        },
      );
    });
  };

  it('hides See more when the comment fits in 4 lines', () => {
    renderTranslation(createPost());

    fireMeasuredLines(4);

    expect(
      screen.queryByTestId(SocialFeedPostShellSelectorsIDs.SEE_MORE),
    ).not.toBeOnTheScreen();
    expect(screen.getByText('Original comment').props.numberOfLines).toBe(4);
  });

  it('shows See more when the comment is longer than 4 lines', () => {
    renderTranslation(createPost());

    fireMeasuredLines(5);

    expect(screen.getByText('See more')).toBeOnTheScreen();
    expect(screen.getByText('Original comment').props.numberOfLines).toBe(4);
  });

  it('expands the comment and offers See less', () => {
    renderTranslation(createPost());
    fireMeasuredLines(5);

    fireEvent.press(
      screen.getByTestId(SocialFeedPostShellSelectorsIDs.SEE_MORE),
    );

    expect(screen.getByText('See less')).toBeOnTheScreen();
    expect(
      screen.getByText('Original comment').props.numberOfLines,
    ).toBeUndefined();
  });

  it('collapses the comment after See less', () => {
    renderTranslation(createPost());
    fireMeasuredLines(5);
    fireEvent.press(
      screen.getByTestId(SocialFeedPostShellSelectorsIDs.SEE_MORE),
    );

    fireEvent.press(
      screen.getByTestId(SocialFeedPostShellSelectorsIDs.SEE_MORE),
    );

    expect(screen.getByText('See more')).toBeOnTheScreen();
    expect(screen.getByText('Original comment').props.numberOfLines).toBe(4);
  });

  it('collapses a new comment after the caption changes', () => {
    const { rerender } = renderTranslation(createPost());
    fireMeasuredLines(5);
    fireEvent.press(
      screen.getByTestId(SocialFeedPostShellSelectorsIDs.SEE_MORE),
    );

    rerender(
      <SocialFeedPostTranslation
        post={createPost({
          item: mockOpenPerpsFeedItem({
            id: 'item-1',
            comment: 'A newer comment',
          }),
        })}
      />,
    );

    expect(screen.queryByText('See less')).not.toBeOnTheScreen();
    expect(screen.getByText('A newer comment').props.numberOfLines).toBe(4);
  });

  it('returns to the original caption and reuses the English text', async () => {
    mockTranslateComment.mockResolvedValue({
      state: 'translated',
      sourceLanguage: 'ko',
      translations: { en: 'Translated comment' },
    });
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    renderTranslation(createPost());

    fireEvent.press(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.TRANSLATE}-post-1`),
    );

    await waitFor(() => {
      expect(screen.getByText('Translated comment')).toBeOnTheScreen();
    });
    expect(screen.getByText('See original')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith(
      'Translated comment Translated to English',
    );

    fireEvent.press(
      screen.getByTestId(
        `${SocialFeedPostShellSelectorsIDs.SEE_ORIGINAL}-post-1`,
      ),
    );

    expect(screen.getByText('Original comment')).toBeOnTheScreen();
    expect(screen.queryByText('Translated comment')).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.TRANSLATE}-post-1`),
    ).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith('Original comment');

    fireEvent.press(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.TRANSLATE}-post-1`),
    );

    expect(screen.getByText('Translated comment')).toBeOnTheScreen();
    expect(screen.getByText('See original')).toBeOnTheScreen();
    expect(mockTranslateComment).toHaveBeenCalledTimes(1);
    announce.mockRestore();
  });

  it('keeps the status line when the translation matches the caption', async () => {
    mockTranslateComment.mockResolvedValue({
      state: 'translated',
      sourceLanguage: 'en',
      translations: { en: 'Original comment' },
    });
    renderTranslation(createPost({ sourceLanguage: 'en' }));

    fireEvent.press(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.TRANSLATE}-post-1`),
    );

    await waitFor(() => {
      expect(screen.getByText('Translated to English')).toBeOnTheScreen();
    });
    expect(screen.queryByText('See original')).not.toBeOnTheScreen();
    expect(screen.getByText('Original comment')).toBeOnTheScreen();
  });
});
