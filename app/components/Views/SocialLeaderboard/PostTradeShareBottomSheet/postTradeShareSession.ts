import type { QuickBuyTarget, QuickBuyTradeMode } from '../../../UI/QuickBuy';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';
import type {
  SocialPostPerpsPreview,
  SocialPostTradePreview,
} from '../SocialPostComposerView/SocialPostComposerView.types';

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

interface PostTradeShareSessionBase {
  sessionId: string;
  status: PostTradeShareStatus;
  pairLabel?: string;
  tradeInFlightChain?: string;
  reopenRequested: boolean;
}

export interface SpotPostTradeShareSession extends PostTradeShareSessionBase {
  product: 'spot';
  transactionHash?: string;
  target: QuickBuyTarget;
  preview: SocialPostTradePreview;
  tradeMode: QuickBuyTradeMode;
  /** Post being copied, so a failed swap can reopen Quick Buy with the same intent. */
  copyTradeOrigin?: CopyTradeOrigin;
  /** Screen that should reopen Quick Buy after a failure. */
  owner?: string;
}

export interface PerpsPostTradeShareSession extends PostTradeShareSessionBase {
  product: 'perps';
  /** Hyperliquid order id. Absent until the exchange accepts the order. */
  orderId?: string;
  preview: SocialPostPerpsPreview;
}

export type PostTradeShareSession =
  | SpotPostTradeShareSession
  | PerpsPostTradeShareSession;

type BeginSpotPostTradeShareSession = Omit<
  SpotPostTradeShareSession,
  'reopenRequested' | 'sessionId' | 'status' | 'product'
> & {
  status?: PostTradeShareStatus;
  product?: 'spot';
};

type BeginPerpsPostTradeShareSession = Omit<
  PerpsPostTradeShareSession,
  'reopenRequested' | 'sessionId' | 'status' | 'product'
> & {
  status?: PostTradeShareStatus;
  product: 'perps';
};

export type BeginPostTradeShareSession =
  | BeginSpotPostTradeShareSession
  | BeginPerpsPostTradeShareSession;

export interface PostTradeShareSessionPatch {
  status?: PostTradeShareStatus;
  pairLabel?: string;
  tradeInFlightChain?: string;
  transactionHash?: string;
  orderId?: string;
  preview?: SocialPostTradePreview | SocialPostPerpsPreview;
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
  session: BeginPostTradeShareSession,
): string => {
  const sessionId = String(nextSessionId++);
  const status = session.status ?? 'pending';
  if (session.product === 'perps') {
    state.session = {
      ...session,
      product: 'perps',
      sessionId,
      status,
      reopenRequested: false,
    };
  } else {
    state.session = {
      ...session,
      product: 'spot',
      sessionId,
      status,
      reopenRequested: false,
    };
  }
  notify();
  return sessionId;
};

export const patchPostTradeShareSession = (
  sessionId: string,
  patch: PostTradeShareSessionPatch,
): boolean => {
  if (!state.session || state.session.sessionId !== sessionId) {
    return false;
  }
  const current = state.session;
  if (current.product === 'perps') {
    state.session = {
      ...current,
      ...patch,
      product: 'perps',
      preview:
        patch.preview && 'product' in patch.preview
          ? patch.preview
          : current.preview,
    };
  } else {
    state.session = {
      ...current,
      ...patch,
      product: 'spot',
      preview:
        patch.preview && !('product' in patch.preview)
          ? patch.preview
          : current.preview,
    };
  }
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
  if (!state.session?.reopenRequested || state.session.product !== 'spot') {
    return null;
  }
  const { target, copyTradeOrigin, tradeMode } = state.session;
  state.session = null;
  notify();
  return { target, copyTradeOrigin, tradeMode };
};
