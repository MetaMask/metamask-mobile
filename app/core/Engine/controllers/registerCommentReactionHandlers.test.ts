import { registerCommentReactionHandlersIfNeeded } from './registerCommentReactionHandlers';
import type { SocialService } from '@metamask/social-controllers';

describe('registerCommentReactionHandlersIfNeeded', () => {
  it('skips registration when SocialService already exposes reactToComment', () => {
    const registerActionHandler = jest.fn();

    registerCommentReactionHandlersIfNeeded(
      { reactToComment: jest.fn() } as unknown as SocialService,
      { registerActionHandler },
    );

    expect(registerActionHandler).not.toHaveBeenCalled();
  });

  it('registers put and delete actions when the methods are missing', () => {
    const registerActionHandler = jest.fn();

    registerCommentReactionHandlersIfNeeded({} as SocialService, {
      registerActionHandler,
    });

    expect(registerActionHandler).toHaveBeenCalledWith(
      'SocialService:reactToComment',
      expect.any(Function),
    );
    expect(registerActionHandler).toHaveBeenCalledWith(
      'SocialService:removeCommentReaction',
      expect.any(Function),
    );
  });
});
