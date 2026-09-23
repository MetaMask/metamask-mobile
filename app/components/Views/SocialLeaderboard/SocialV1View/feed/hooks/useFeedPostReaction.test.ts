import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { reactToComment, removeCommentReaction } from '../commentReactionApi';
import { useFeedPostReaction } from './useFeedPostReaction';

jest.mock('../commentReactionApi');

const mockReactToComment = jest.mocked(reactToComment);
const mockRemoveCommentReaction = jest.mocked(removeCommentReaction);

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

  it('toggles locally without calling the API when the post has no Call id', async () => {
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
    expect(result.current.reactions).toStrictEqual([
      { emotion: '🔥', count: 1 },
    ]);
    expect(result.current.userReaction).toBe('🔥');
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
});
