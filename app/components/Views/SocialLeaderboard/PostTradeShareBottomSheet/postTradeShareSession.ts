import type { QuickBuyTarget, QuickBuyTradeMode } from '../../../UI/QuickBuy';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import type { SocialPostTradePreview } from '../SocialPostComposerView/SocialPostComposerView.types';

export type PostTradeShareStatus = 'pending' | 'complete' | 'failed';

/**
 * Screen that opened Quick Buy. Try again reopens only that screen, because
 * several Social screens can stay mounted at once.
 */
export const PostTradeShareOwner = {
  socialV1Feed: 'social-v1-feed',
  traderPosition: 'trader-position',
  positionDetails: 'position-details',
} as const;

export type PostTradeShareOwnerId =
  (typeof PostTradeShareOwner)[keyof typeof PostTradeShareOwner];

export interface PostTradeShareSession {
  sessionId: string;
  status: PostTradeShareStatus;
  pairLabel?: string;
  tradeInFlightChain?: string;
  transactionHash?: string;
  target: QuickBuyTarget;
  preview: SocialPostTradePreview;
  tradeMode: QuickBuyTradeMode;
  /** Post being copied, so a failed swap can reopen Quick Buy with the same intent. */
  copyTradeOrigin?: CopyTradeOrigin;
  /** Screen that should reopen Quick Buy after a failure. */
  owner?: string;
  reopenRequested: boolean;
}

export interface PostTradeShareReopen {
  target: QuickBuyTarget;
  copyTradeOrigin?: CopyTradeOrigin;
  tradeMode: QuickBuyTradeMode;
}

type Listener = () => void;

const STORE_GLOBAL_KEY = '__mmPostTradeShareSession__';

interface StoreState {
  session: PostTradeShareSession | null;
  listeners: Set<Listener>;
}

const bootstrap = (): StoreState => ({
  session: null,
  listeners: new Set(),
});

const globalScope = globalThis as unknown as Record<string, StoreState>;
const state: StoreState = globalScope[STORE_GLOBAL_KEY] ?? bootstrap();
globalScope[STORE_GLOBAL_KEY] = state;
let nextSessionId = 0;

const notify = () => {
  state.listeners.forEach((listener) => listener());
};

export const subscribePostTradeShareSession = (
  listener: Listener,
): (() => void) => {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
};

export const getPostTradeShareSession = (): PostTradeShareSession | null =>
  state.session;

export const beginPostTradeShareSession = (
  session: Omit<
    PostTradeShareSession,
    'reopenRequested' | 'sessionId' | 'status'
  > & {
    status?: PostTradeShareStatus;
  },
): string => {
  const sessionId = String(nextSessionId++);
  state.session = {
    ...session,
    sessionId,
    status: session.status ?? 'pending',
    reopenRequested: false,
  };
  notify();
  return sessionId;
};

export const patchPostTradeShareSession = (
  sessionId: string,
  patch: Partial<PostTradeShareSession>,
): boolean => {
  if (!state.session || state.session.sessionId !== sessionId) {
    return false;
  }
  state.session = { ...state.session, ...patch };
  notify();
  return true;
};

export const clearPostTradeShareSession = (): void => {
  state.session = null;
  notify();
};

export const requestPostTradeShareReopen = (): void => {
  if (!state.session) {
    return;
  }
  state.session = { ...state.session, reopenRequested: true };
  notify();
};

export const consumePostTradeShareReopen = (): PostTradeShareReopen | null => {
  if (!state.session?.reopenRequested) {
    return null;
  }
  const { target, copyTradeOrigin, tradeMode } = state.session;
  state.session = null;
  notify();
  return { target, copyTradeOrigin, tradeMode };
};
