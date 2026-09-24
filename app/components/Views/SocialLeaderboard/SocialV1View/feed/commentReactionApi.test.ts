import { reactToComment, removeCommentReaction } from './commentReactionApi';

const mockCall = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      _brand: 'rootMessenger',
      call(this: unknown, ...args: unknown[]) {
        if (!this || (this as { _brand?: string })._brand !== 'rootMessenger') {
          throw new TypeError("Cannot read property 'getAction' of undefined");
        }
        return mockCall(...args);
      },
    },
  },
}));

describe('commentReactionApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls SocialService:reactToComment and maps the metrics', async () => {
    mockCall.mockResolvedValue({
      reactions: [{ emotion: '🔥', count: 1, profiles: [] }],
      userReaction: '🔥',
    });

    const result = await reactToComment({
      commentId: 'comment-1',
      emotion: '🔥',
    });

    expect(mockCall).toHaveBeenCalledWith('SocialService:reactToComment', {
      commentId: 'comment-1',
      emotion: '🔥',
    });
    expect(result).toStrictEqual({
      reactions: [{ emotion: '🔥', count: 1 }],
      userReaction: '🔥',
    });
  });

  it('calls SocialService:removeCommentReaction', async () => {
    mockCall.mockResolvedValue({
      reactions: [],
      userReaction: null,
    });

    const result = await removeCommentReaction({ commentId: 'comment-1' });

    expect(mockCall).toHaveBeenCalledWith(
      'SocialService:removeCommentReaction',
      { commentId: 'comment-1' },
    );
    expect(result).toStrictEqual({
      reactions: [],
      userReaction: null,
    });
  });
});
