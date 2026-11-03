import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
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
});
