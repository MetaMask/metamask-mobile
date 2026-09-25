import type { SocialService } from '@metamask/social-controllers';
import AppConstants from '../../AppConstants';

export interface CreateSwapCommentOptions {
  commentText: string;
  source?: string;
  positionUid?: string;
  tradeInFlight?: {
    transactionHash: string;
    chain: string;
    tokenAddress: string;
  };
}

export interface CreateSwapCommentResult {
  uid: string;
  commentText: string;
  timestamp: number;
}

interface CreateSwapCommentMessenger {
  call: (action: 'AuthenticationController:getBearerToken') => Promise<string>;
  registerActionHandler: (
    action: string,
    handler: (...args: never[]) => unknown,
  ) => void;
}

type SocialServiceWithCreateSwapComment = SocialService & {
  createSwapComment?: (
    options: CreateSwapCommentOptions,
  ) => Promise<CreateSwapCommentResult>;
};

const INVALID_SWAP_COMMENT_RESPONSE =
  'SocialService: Swap comment returned invalid response';

const parseSwapComment = (payload: unknown): CreateSwapCommentResult => {
  if (payload === null || typeof payload !== 'object') {
    throw new Error(INVALID_SWAP_COMMENT_RESPONSE);
  }
  const record = payload as {
    uid?: unknown;
    commentText?: unknown;
    timestamp?: unknown;
  };
  if (
    typeof record.uid !== 'string' ||
    typeof record.commentText !== 'string' ||
    typeof record.timestamp !== 'number'
  ) {
    throw new Error(INVALID_SWAP_COMMENT_RESPONSE);
  }
  return {
    uid: record.uid,
    commentText: record.commentText,
    timestamp: record.timestamp,
  };
};

const requestCreateSwapComment = async (
  messenger: CreateSwapCommentMessenger,
  options: CreateSwapCommentOptions,
): Promise<CreateSwapCommentResult> => {
  const token = await messenger.call('AuthenticationController:getBearerToken');
  const url = `${AppConstants.SOCIAL_API_URL}/api/v1/swap-comments`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    throw new Error(
      `SocialService: Swap comment request failed: ${response.status}`,
    );
  }
  return parseSwapComment(await response.json());
};

/**
 * Registers `SocialService:createSwapComment` when the installed
 * `@metamask/social-controllers` build does not yet expose it.
 * Drop this once Mobile bumps past the Core release that added the method.
 */
export const registerCreateSwapCommentHandlerIfNeeded = (
  service: SocialService,
  messenger: unknown,
): void => {
  if (
    typeof (service as SocialServiceWithCreateSwapComment).createSwapComment ===
    'function'
  ) {
    return;
  }

  const createMessenger = messenger as CreateSwapCommentMessenger;
  createMessenger.registerActionHandler('SocialService:createSwapComment', ((
    options: CreateSwapCommentOptions,
  ) => requestCreateSwapComment(createMessenger, options)) as (
    ...args: never[]
  ) => unknown);
};
