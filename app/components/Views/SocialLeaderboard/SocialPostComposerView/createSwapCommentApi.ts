import type {
  CreateSwapCommentOptions,
  SwapCommentResponse,
} from '@metamask/social-controllers';
import Engine from '../../../../core/Engine';

interface CreateSwapCommentMessenger {
  call: (
    action: 'SocialService:createSwapComment',
    options: CreateSwapCommentOptions,
  ) => Promise<SwapCommentResponse>;
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
): Promise<SwapCommentResponse> =>
  getMessenger().call('SocialService:createSwapComment', options);
