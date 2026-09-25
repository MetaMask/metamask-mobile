import Engine from '../../../../core/Engine';
import type {
  CreateSwapCommentOptions,
  CreateSwapCommentResult,
} from '../../../../core/Engine/controllers/registerCreateSwapCommentHandler';

interface CreateSwapCommentMessenger {
  call: (
    action: 'SocialService:createSwapComment',
    options: CreateSwapCommentOptions,
  ) => Promise<CreateSwapCommentResult>;
}

const getMessenger = (): CreateSwapCommentMessenger =>
  Engine.controllerMessenger as unknown as CreateSwapCommentMessenger;

/**
 * Creates an author Call (user post) on one of the current user's swaps.
 *
 * Call as a member expression so the messenger keeps its `this` binding.
 */
export const createSwapComment = (
  options: CreateSwapCommentOptions,
): Promise<CreateSwapCommentResult> =>
  getMessenger().call('SocialService:createSwapComment', options);
