import type { QuickBuyTarget, QuickBuyTradeMode } from '../../../UI/QuickBuy';
import type { SocialPostComposerViewParams } from '../SocialPostComposerView/SocialPostComposerView.types';

export type PostSwapShareStatus = 'pending' | 'complete' | 'failed';

export interface PostSwapShareSession {
  sessionId: string;
  status: PostSwapShareStatus;
  pairLabel?: string;
  tradeInFlightChain?: string;
  transactionHash?: string;
  target: QuickBuyTarget;
  preview: SocialPostComposerViewParams['preview'];
  tradeMode: QuickBuyTradeMode;
  reopenRequested: boolean;
}

type Listener = () => void;

const STORE_GLOBAL_KEY = '__mmPostSwapShareSession__';

interface StoreState {
  session: PostSwapShareSession | null;
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

export const subscribePostSwapShareSession = (
  listener: Listener,
): (() => void) => {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
};

export const getPostSwapShareSession = (): PostSwapShareSession | null =>
  state.session;

export const beginPostSwapShareSession = (
  session: Omit<
    PostSwapShareSession,
    'reopenRequested' | 'sessionId' | 'status'
  > & {
    status?: PostSwapShareStatus;
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

export const patchPostSwapShareSession = (
  sessionId: string,
  patch: Partial<PostSwapShareSession>,
): boolean => {
  if (!state.session || state.session.sessionId !== sessionId) {
    return false;
  }
  state.session = { ...state.session, ...patch };
  notify();
  return true;
};

export const clearPostSwapShareSession = (): void => {
  state.session = null;
  notify();
};

export const requestPostSwapShareReopen = (): void => {
  if (!state.session) {
    return;
  }
  state.session = { ...state.session, reopenRequested: true };
  notify();
};

export const consumePostSwapShareReopen = (): QuickBuyTarget | null => {
  if (!state.session?.reopenRequested) {
    return null;
  }
  const { target } = state.session;
  state.session = null;
  notify();
  return target;
};
