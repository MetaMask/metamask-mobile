import { PLACEHOLDER_FOLLOWER_COUNT } from '../../FollowConnectionsView/hooks/placeholderFollowers';
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

const createDefaultProfile = (): MySocialProfile => ({
  profileId: 'current-user',
  displayName: 'Giga Whale',
  handle: 'giga-whale',
  bio: 'Trading in the open. Copy my moves or fade them, either way we learn.',
  imageUrl: null,
  rankingTag: 'whale',
  xHandle: 'giga-whale',
  followerCount: PLACEHOLDER_FOLLOWER_COUNT,
  shareUrl: 'https://metamask.io/social/giga-whale',
  winRatePercent: 60,
  pnlUsd: 7100,
  holdTimeLabel: '4d',
  timesCopied: 981,
});

const bootstrap = (): StoreState => {
  const profile = createDefaultProfile();
  return {
    profile,
    revision: 0,
    snapshot: { profile, revision: 0 },
    listeners: new Set(),
  };
};

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

/**
 * Drop the mocked owner profile so onboarding can write a new one.
 * Stays in memory for this app session.
 */
export const resetLocalSocialProfile = (): void => {
  state.profile = null;
  notify();
};

export const saveLocalSocialProfile = (profile: MySocialProfile): void => {
  state.profile = { ...profile };
  notify();
};

/** Test helper. Puts the giga-whale mock back. */
export const restoreDefaultLocalSocialProfile = (): void => {
  state.profile = createDefaultProfile();
  notify();
};
