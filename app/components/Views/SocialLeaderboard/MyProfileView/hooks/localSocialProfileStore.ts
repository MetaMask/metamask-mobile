import type { MySocialProfile } from './useMyProfile';

type Listener = () => void;

export interface LocalSocialProfileSnapshot {
  profile: MySocialProfile | null;
  revision: number;
}

interface StoreState {
  profile: MySocialProfile | null;
  revision: number;
  snapshot: LocalSocialProfileSnapshot;
  listeners: Set<Listener>;
}

const STORE_GLOBAL_KEY = '__mmLocalSocialProfileStore__';

const bootstrap = (): StoreState => ({
  profile: null,
  revision: 0,
  snapshot: { profile: null, revision: 0 },
  listeners: new Set(),
});

const globalScope = globalThis as unknown as Record<string, StoreState>;
const state: StoreState = globalScope[STORE_GLOBAL_KEY] ?? bootstrap();
globalScope[STORE_GLOBAL_KEY] = state;

const notify = () => {
  state.revision += 1;
  state.snapshot = {
    profile: state.profile,
    revision: state.revision,
  };
  state.listeners.forEach((listener) => listener());
};

export const subscribeLocalSocialProfile = (
  listener: Listener,
): (() => void) => {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
};

export const getLocalSocialProfileSnapshot = (): LocalSocialProfileSnapshot =>
  state.snapshot;

export const saveLocalSocialProfile = (profile: MySocialProfile): void => {
  state.profile = { ...profile };
  notify();
};

/** Test helper. Empties the store between tests. */
export const clearLocalSocialProfile = (): void => {
  state.profile = null;
  notify();
};
