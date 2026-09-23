import AppConstants from '../../AppConstants';
import { registerCommentReactionHandlersIfNeeded } from './registerCommentReactionHandlers';
import type { SocialService } from '@metamask/social-controllers';

const mockFetch = jest.fn();

describe('registerCommentReactionHandlersIfNeeded', () => {
  const handlers: Record<string, (...args: never[]) => unknown> = {};
  const registerActionHandler = jest.fn(
    (action: string, handler: (...args: never[]) => unknown) => {
      handlers[action] = handler;
    },
  );
  const messenger = {
    call: jest.fn().mockResolvedValue('test-token'),
    registerActionHandler,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(handlers).forEach((key) => {
      delete handlers[key];
    });
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('skips registration when SocialService already exposes reactToComment', () => {
    registerCommentReactionHandlersIfNeeded(
      { reactToComment: jest.fn() } as unknown as SocialService,
      { registerActionHandler },
    );

    expect(registerActionHandler).not.toHaveBeenCalled();
  });

  it('registers put and delete actions when the methods are missing', () => {
    registerCommentReactionHandlersIfNeeded({} as SocialService, messenger);

    expect(registerActionHandler).toHaveBeenCalledWith(
      'SocialService:reactToComment',
      expect.any(Function),
    );
    expect(registerActionHandler).toHaveBeenCalledWith(
      'SocialService:removeCommentReaction',
      expect.any(Function),
    );
  });

  it('sends PUT with bearer token and parses engagement', async () => {
    registerCommentReactionHandlersIfNeeded({} as SocialService, messenger);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        reactions: [{ emotion: '🔥', count: 2 }],
        userReaction: '🔥',
      }),
    });

    const result = await handlers['SocialService:reactToComment']({
      commentId: 'comment-1',
      emotion: '🔥',
    });

    expect(messenger.call).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `${AppConstants.SOCIAL_API_URL}/api/v1/swap-comment/comment-1/reaction`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ emotion: '🔥' }),
      }),
    );
    expect(result).toStrictEqual({
      reactions: [{ emotion: '🔥', count: 2 }],
      userReaction: '🔥',
    });
  });

  it('sends DELETE without a JSON body', async () => {
    registerCommentReactionHandlersIfNeeded({} as SocialService, messenger);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        reactions: [],
        userReaction: null,
      }),
    });

    const result = await handlers['SocialService:removeCommentReaction']({
      commentId: 'comment-2',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `${AppConstants.SOCIAL_API_URL}/api/v1/swap-comment/comment-2/reaction`,
      expect.objectContaining({
        method: 'DELETE',
        body: undefined,
      }),
    );
    expect(result).toStrictEqual({
      reactions: [],
      userReaction: null,
    });
  });

  it('throws when the social-api returns a non-2xx status', async () => {
    registerCommentReactionHandlersIfNeeded({} as SocialService, messenger);
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    await expect(
      handlers['SocialService:reactToComment']({
        commentId: 'comment-1',
        emotion: '👍',
      }),
    ).rejects.toThrow('SocialService: Comment reaction request failed: 503');
  });

  it('throws when the response body is not valid engagement', async () => {
    registerCommentReactionHandlersIfNeeded({} as SocialService, messenger);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ reactions: 'bad' }),
    });

    await expect(
      handlers['SocialService:removeCommentReaction']({
        commentId: 'comment-1',
      }),
    ).rejects.toThrow(
      'SocialService: Comment reaction returned invalid response',
    );
  });

  it('throws when a reaction entry is malformed', async () => {
    registerCommentReactionHandlersIfNeeded({} as SocialService, messenger);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        reactions: [{ emotion: '🔥', count: 'many' }],
        userReaction: null,
      }),
    });

    await expect(
      handlers['SocialService:reactToComment']({
        commentId: 'comment-1',
        emotion: '🔥',
      }),
    ).rejects.toThrow(
      'SocialService: Comment reaction returned invalid response',
    );
  });
});
