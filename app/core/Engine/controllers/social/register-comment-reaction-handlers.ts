import type { SocialService } from '@metamask/social-controllers';
import AppConstants from '../../../AppConstants';

interface CommentEngagement {
  reactions: { emotion: string; count: number }[];
  userReaction: string | null;
}

interface ReactionMessenger {
  call: (action: 'AuthenticationController:getBearerToken') => Promise<string>;
  registerActionHandler: (
    action: string,
    handler: (...args: never[]) => unknown,
  ) => void;
}

type SocialServiceWithReactions = SocialService & {
  reactToComment?: (options: {
    commentId: string;
    emotion: string;
  }) => Promise<CommentEngagement>;
};

const INVALID_REACTION_RESPONSE =
  'SocialService: Comment reaction returned invalid response';

const parseEngagement = (payload: unknown): CommentEngagement => {
  if (payload === null || typeof payload !== 'object') {
    throw new Error(INVALID_REACTION_RESPONSE);
  }
  const record = payload as {
    reactions?: unknown;
    userReaction?: unknown;
  };
  if (!Array.isArray(record.reactions)) {
    throw new Error(INVALID_REACTION_RESPONSE);
  }
  const reactions = record.reactions.map((entry) => {
    if (entry === null || typeof entry !== 'object') {
      throw new Error(INVALID_REACTION_RESPONSE);
    }
    const reaction = entry as { emotion?: unknown; count?: unknown };
    if (
      typeof reaction.emotion !== 'string' ||
      typeof reaction.count !== 'number'
    ) {
      throw new Error(INVALID_REACTION_RESPONSE);
    }
    return { emotion: reaction.emotion, count: reaction.count };
  });
  const userReaction =
    record.userReaction === null || typeof record.userReaction === 'string'
      ? record.userReaction
      : null;
  return { reactions, userReaction };
};

const requestReaction = async (
  messenger: ReactionMessenger,
  method: 'PUT' | 'DELETE',
  commentId: string,
  emotion?: string,
): Promise<CommentEngagement> => {
  const token = await messenger.call('AuthenticationController:getBearerToken');
  const url = `${AppConstants.SOCIAL_API_URL}/api/v1/swap-comment/${encodeURIComponent(commentId)}/reaction`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
    },
    body: method === 'PUT' ? JSON.stringify({ emotion }) : undefined,
  });
  if (!response.ok) {
    throw new Error(
      `SocialService: Comment reaction request failed: ${response.status}`,
    );
  }
  return parseEngagement(await response.json());
};

/**
 * Registers `SocialService:reactToComment` / `removeCommentReaction` when the
 * installed `@metamask/social-controllers` build does not yet expose them.
 * Drop this once Mobile bumps past the Core release that added those methods.
 */
export const registerCommentReactionHandlersIfNeeded = (
  service: SocialService,
  messenger: unknown,
): void => {
  if (
    typeof (service as SocialServiceWithReactions).reactToComment === 'function'
  ) {
    return;
  }

  const reactionMessenger = messenger as ReactionMessenger;
  reactionMessenger.registerActionHandler(
    'SocialService:reactToComment',
    ((options: { commentId: string; emotion: string }) =>
      requestReaction(
        reactionMessenger,
        'PUT',
        options.commentId,
        options.emotion,
      )) as (...args: never[]) => unknown,
  );
  reactionMessenger.registerActionHandler(
    'SocialService:removeCommentReaction',
    ((options: { commentId: string }) =>
      requestReaction(reactionMessenger, 'DELETE', options.commentId)) as (
      ...args: never[]
    ) => unknown,
  );
};
