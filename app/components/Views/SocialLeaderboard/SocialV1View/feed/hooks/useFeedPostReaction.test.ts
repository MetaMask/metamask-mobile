import { act, renderHook } from '@testing-library/react-native';
import { reactToComment, removeCommentReaction } from '../commentReactionApi';
import { useFeedPostReaction } from './useFeedPostReaction';

jest.mock('../commentReactionApi');

const mockReactToComment = jest.mocked(reactToComment);
const mockRemoveCommentReaction = jest.mocked(removeCommentReaction);

describe('useFeedPostReaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('replaces the previous emotion via reactToComment', async () => {
    mockReactToComment.mockResolvedValue({
      reactions: [{ emotion: '👍', count: 1 }],
      userReaction: '👍',
    });
    const { result } = renderHook(() =>
      useFeedPostReaction('comment-1', [{ emotion: '🔥', count: 1 }], '🔥'),
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
    mockRemoveCommentReaction.mockResolvedValue({
      reactions: [],
      userReaction: null,
    });
    const { result } = renderHook(() =>
      useFeedPostReaction('comment-1', [{ emotion: '🔥', count: 1 }], '🔥'),
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

  it('restores the previous reactions when the request fails', async () => {
    mockReactToComment.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() =>
      useFeedPostReaction('comment-1', [], null),
    );

    await act(async () => {
      await result.current.pickEmotion('😂');
    });

    expect(result.current.reactions).toStrictEqual([]);
    expect(result.current.userReaction).toBeNull();
  });
});
