import type {
  CreateSwapCommentOptions,
  SwapCommentResponse,
} from '@metamask/social-controllers';
import Engine from '../../../../core/Engine';
import type { CreatedSwapCommentExtras } from './buildPendingPost';

export type CreatedSwapComment = SwapCommentResponse & CreatedSwapCommentExtras;

interface CreateSwapCommentMessenger {
  call: (
    action: 'SocialService:createSwapComment',
    options: CreateSwapCommentOptions,
  ) => Promise<CreatedSwapComment>;
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
): Promise<CreatedSwapComment> =>
  getMessenger().call('SocialService:createSwapComment', options);
