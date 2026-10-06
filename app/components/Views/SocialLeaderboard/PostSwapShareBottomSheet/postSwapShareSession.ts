import type { QuickBuyTarget, QuickBuyTradeMode } from '../../../UI/QuickBuy';
import type { SocialPostComposerViewParams } from '../SocialPostComposerView/SocialPostComposerView.types';

export type PostSwapShareStatus = 'pending' | 'complete' | 'failed';

export interface PostSwapShareSession {
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
  session: Omit<PostSwapShareSession, 'reopenRequested' | 'status'> & {
    status?: PostSwapShareStatus;
  },
): void => {
  state.session = {
    ...session,
    status: session.status ?? 'pending',
    reopenRequested: false,
  };
  notify();
};

export const patchPostSwapShareSession = (
  patch: Partial<PostSwapShareSession>,
): void => {
  if (!state.session) {
    return;
  }
  state.session = { ...state.session, ...patch };
  notify();
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
