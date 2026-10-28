export type OwnedTokensMode = 'find' | 'owned';

let sessionMode: OwnedTokensMode = 'find';
const listeners = new Set<() => void>();

/** Mode survives navigation for this JS session and defaults to Find tokens. */
export const getOwnedTokensMode = (): OwnedTokensMode => sessionMode;

export const setOwnedTokensMode = (mode: OwnedTokensMode): void => {
  if (sessionMode === mode) {
    return;
  }
  sessionMode = mode;
  listeners.forEach((listener) => listener());
};

export const subscribeOwnedTokensMode = (
  listener: () => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const resetOwnedTokensModeForTests = (): void => {
  sessionMode = 'find';
  listeners.clear();
};
