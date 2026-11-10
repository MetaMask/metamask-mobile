import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { reactToComment, removeCommentReaction } from '../commentReactionApi';
import { invalidateModerationStatus } from '../moderationApi';
import { patchFeedCommentEngagementInCache } from '../utils/patchFeedCommentEngagementInCache';
import { useFeedPostReaction } from './useFeedPostReaction';

jest.mock('../utils/patchFeedCommentEngagementInCache', () => ({
  patchFeedCommentEngagementInCache: jest.fn(),
}));

jest.mock('../commentReactionApi');

jest.mock('../moderationApi', () => ({
  invalidateModerationStatus: jest.fn(() => Promise.resolve()),
}));

const mockInvalidateModerationStatus = jest.mocked(invalidateModerationStatus);

const mockReactToComment = jest.mocked(reactToComment);
const mockRemoveCommentReaction = jest.mocked(removeCommentReaction);
const mockPatchFeedCommentEngagementInCache = jest.mocked(
  patchFeedCommentEngagementInCache,
);

const wrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useFeedPostReaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('replaces the previous emotion via reactToComment', async () => {
    const queryClient = new QueryClient();
    mockReactToComment.mockResolvedValue({
      reactions: [{ emotion: '👍', count: 1 }],
      userReaction: '👍',
    });
    const { result } = renderHook(
      () =>
        useFeedPostReaction('comment-1', [{ emotion: '🔥', count: 1 }], '🔥'),
      { wrapper: wrapper(queryClient) },
    );

    await act(async () => {
      await result.current.pickEmotion('👍');
    });

    expect(mockReactToComment).toHaveBeenCalledWith({
      commentId: 'comment-1',
      emotion: '👍',
    });
    expect(result.current.reactions).toStrictEqual([
      { emotion: '👍', count: 1 },
    ]);
    expect(result.current.userReaction).toBe('👍');
    expect(mockPatchFeedCommentEngagementInCache).toHaveBeenCalledWith(
      queryClient,
      'comment-1',
      {
        reactions: [{ emotion: '👍', count: 1 }],
        userReaction: '👍',
      },
    );
  });

  it('removes the current emotion via removeCommentReaction', async () => {
    const queryClient = new QueryClient();
    mockRemoveCommentReaction.mockResolvedValue({
      reactions: [],
      userReaction: null,
    });
    const { result } = renderHook(
      () =>
        useFeedPostReaction('comment-1', [{ emotion: '🔥', count: 1 }], '🔥'),
      { wrapper: wrapper(queryClient) },
    );

    await act(async () => {
      await result.current.pickEmotion('🔥');
    });

    expect(mockRemoveCommentReaction).toHaveBeenCalledWith({
      commentId: 'comment-1',
    });
    expect(result.current.reactions).toStrictEqual([]);
    expect(result.current.userReaction).toBeNull();
  });

  it('does not change reactions or call the API when the post has no Call id', async () => {
    const queryClient = new QueryClient();
    const { result } = renderHook(
      () => useFeedPostReaction(undefined, [], null),
      { wrapper: wrapper(queryClient) },
    );

    await act(async () => {
      await result.current.pickEmotion('🔥');
    });

    expect(mockReactToComment).not.toHaveBeenCalled();
    expect(mockRemoveCommentReaction).not.toHaveBeenCalled();
    expect(result.current.reactions).toStrictEqual([]);
    expect(result.current.userReaction).toBeNull();
  });

  it('restores the previous reactions when the request fails', async () => {
    const queryClient = new QueryClient();
    mockReactToComment.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(
      () => useFeedPostReaction('comment-1', [], null),
      { wrapper: wrapper(queryClient) },
    );

    await act(async () => {
      await result.current.pickEmotion('😂');
    });

    expect(result.current.reactions).toStrictEqual([]);
    expect(result.current.userReaction).toBeNull();
    expect(mockInvalidateModerationStatus).not.toHaveBeenCalled();
  });

  it('refetches the moderation status when the reaction is refused with a 403', async () => {
    const queryClient = new QueryClient();
    mockReactToComment.mockRejectedValue(
      Object.assign(new Error('forbidden'), { httpStatus: 403 }),
    );
    const { result } = renderHook(
      () => useFeedPostReaction('comment-1', [], null),
      { wrapper: wrapper(queryClient) },
    );

    await act(async () => {
      await result.current.pickEmotion('😂');
    });

    expect(mockInvalidateModerationStatus).toHaveBeenCalled();
    expect(result.current.reactions).toStrictEqual([]);
  });

  it('reseeds from refreshed feed props for the same Call id', () => {
    const queryClient = new QueryClient();
    const { result, rerender } = renderHook(
      ({
        reactions,
        userReaction,
      }: {
        reactions: { emotion: string; count: number }[];
        userReaction: string | null;
      }) => useFeedPostReaction('comment-1', reactions, userReaction),
      {
        wrapper: wrapper(queryClient),
        initialProps: {
          reactions: [{ emotion: '🔥', count: 1 }],
          userReaction: null as string | null,
        },
      },
    );

    rerender({
      reactions: [{ emotion: '🔥', count: 99 }],
      userReaction: '🔥',
    });

    expect(result.current.reactions).toStrictEqual([
      { emotion: '🔥', count: 99 },
    ]);
    expect(result.current.userReaction).toBe('🔥');
  });

  it('ranks the first reactions it sees by popularity', () => {
    const { result } = renderHook(
      () =>
        useFeedPostReaction(
          'comment-1',
          [
            { emotion: '😡', count: 1 },
            { emotion: '❤️', count: 2 },
          ],
          null,
        ),
      { wrapper: wrapper(new QueryClient()) },
    );

    expect(result.current.reactions).toStrictEqual([
      { emotion: '❤️', count: 2 },
      { emotion: '😡', count: 1 },
    ]);
  });

  it('keeps chips in place when the server re-sorts after the viewer reacts', async () => {
    mockReactToComment.mockResolvedValue({
      reactions: [
        { emotion: '😡', count: 2 },
        { emotion: '❤️', count: 1 },
      ],
      userReaction: '😡',
    });
    const { result } = renderHook(
      () =>
        useFeedPostReaction(
          'comment-1',
          [
            { emotion: '❤️', count: 2 },
            { emotion: '😡', count: 1 },
          ],
          '❤️',
        ),
      { wrapper: wrapper(new QueryClient()) },
    );

    await act(async () => {
      await result.current.pickEmotion('😡');
    });

    expect(result.current.reactions).toStrictEqual([
      { emotion: '❤️', count: 1 },
      { emotion: '😡', count: 2 },
    ]);
  });

  it('keeps chips in place when refreshed feed props re-sort the same post', () => {
    const { result, rerender } = renderHook(
      ({ reactions }: { reactions: { emotion: string; count: number }[] }) =>
        useFeedPostReaction('comment-1', reactions, null),
      {
        wrapper: wrapper(new QueryClient()),
        initialProps: {
          reactions: [
            { emotion: '❤️', count: 2 },
            { emotion: '😡', count: 1 },
          ],
        },
      },
    );

    rerender({
      reactions: [
        { emotion: '😡', count: 5 },
        { emotion: '🚀', count: 3 },
        { emotion: '❤️', count: 2 },
      ],
    });

    expect(result.current.reactions).toStrictEqual([
      { emotion: '❤️', count: 2 },
      { emotion: '😡', count: 5 },
      { emotion: '🚀', count: 3 },
    ]);
  });

  it('ranks afresh when the row is reused for a different post', () => {
    const { result, rerender } = renderHook(
      ({
        commentId,
        reactions,
      }: {
        commentId: string;
        reactions: { emotion: string; count: number }[];
      }) => useFeedPostReaction(commentId, reactions, null),
      {
        wrapper: wrapper(new QueryClient()),
        initialProps: {
          commentId: 'comment-1',
          reactions: [{ emotion: '❤️', count: 2 }],
        },
      },
    );

    rerender({
      commentId: 'comment-2',
      reactions: [
        { emotion: '😂', count: 1 },
        { emotion: '🔥', count: 4 },
      ],
    });

    expect(result.current.reactions).toStrictEqual([
      { emotion: '🔥', count: 4 },
      { emotion: '😂', count: 1 },
    ]);
  });

  it('ignores a second pick while a request is pending', async () => {
    const queryClient = new QueryClient();
    let resolvePut: (value: {
      reactions: { emotion: string; count: number }[];
      userReaction: string | null;
    }) => void = () => undefined;
    mockReactToComment.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePut = resolve;
        }),
    );
    const { result } = renderHook(
      () => useFeedPostReaction('comment-1', [], null),
      { wrapper: wrapper(queryClient) },
    );

    await act(async () => {
      void result.current.pickEmotion('🔥');
    });
    await act(async () => {
      await result.current.pickEmotion('👍');
    });

    expect(mockReactToComment).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePut({
        reactions: [{ emotion: '🔥', count: 1 }],
        userReaction: '🔥',
      });
    });
  });
});
