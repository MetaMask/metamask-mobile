import AppConstants from '../../AppConstants';
import { registerCreateSwapCommentHandlerIfNeeded } from './registerCreateSwapCommentHandler';
import type { SocialService } from '@metamask/social-controllers';

const mockFetch = jest.fn();

describe('registerCreateSwapCommentHandlerIfNeeded', () => {
  type CreateSwapCommentHandler = (options: {
    commentText: string;
    positionUid?: string;
    source?: string;
  }) => Promise<unknown>;

  const handlers: {
    'SocialService:createSwapComment'?: CreateSwapCommentHandler;
  } = {};
  const registerActionHandler = jest.fn(
    (action: string, handler: CreateSwapCommentHandler) => {
      if (action === 'SocialService:createSwapComment') {
        handlers['SocialService:createSwapComment'] = handler;
      }
    },
  );
  const messenger = {
    call: jest.fn().mockResolvedValue('test-token'),
    registerActionHandler,
  };

  const requireHandler = (): CreateSwapCommentHandler => {
    const handler = handlers['SocialService:createSwapComment'];
    if (!handler) {
      throw new Error('Expected SocialService:createSwapComment handler');
    }
    return handler;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete handlers['SocialService:createSwapComment'];
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('skips registration when SocialService already exposes createSwapComment', () => {
    registerCreateSwapCommentHandlerIfNeeded(
      { createSwapComment: jest.fn() } as unknown as SocialService,
      { registerActionHandler },
    );

    expect(registerActionHandler).not.toHaveBeenCalled();
  });

  it('registers the create action when the method is missing', () => {
    registerCreateSwapCommentHandlerIfNeeded({} as SocialService, messenger);

    expect(registerActionHandler).toHaveBeenCalledWith(
      'SocialService:createSwapComment',
      expect.any(Function),
    );
  });

  it('sends POST with bearer token and parses the created comment', async () => {
    registerCreateSwapCommentHandlerIfNeeded({} as SocialService, messenger);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        uid: 'comment-1',
        commentText: 'this is alpha',
        timestamp: 1700000000,
      }),
    });

    const result = await requireHandler()({
      commentText: 'this is alpha',
      positionUid: 'position-1',
      source: 'metamask-mobile',
    });

    expect(messenger.call).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
    expect(mockFetch).toHaveBeenCalledWith(
      `${AppConstants.SOCIAL_API_URL}/api/v1/swap-comments`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          commentText: 'this is alpha',
          positionUid: 'position-1',
          source: 'metamask-mobile',
        }),
      }),
    );
    expect(result).toStrictEqual({
      uid: 'comment-1',
      commentText: 'this is alpha',
      timestamp: 1700000000,
    });
  });

  it('throws when the social-api returns a non-2xx status', async () => {
    registerCreateSwapCommentHandlerIfNeeded({} as SocialService, messenger);
    mockFetch.mockResolvedValue({ ok: false, status: 409 });

    await expect(
      requireHandler()({
        commentText: 'this is alpha',
        positionUid: 'position-1',
      }),
    ).rejects.toThrow('SocialService: Swap comment request failed: 409');
  });

  it('throws when the response body is not a swap comment', async () => {
    registerCreateSwapCommentHandlerIfNeeded({} as SocialService, messenger);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ uid: 1 }),
    });

    await expect(
      requireHandler()({
        commentText: 'this is alpha',
        positionUid: 'position-1',
      }),
    ).rejects.toThrow('SocialService: Swap comment returned invalid response');
  });
});
