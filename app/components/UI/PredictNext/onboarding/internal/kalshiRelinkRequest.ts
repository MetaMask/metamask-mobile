/**
 * TEMPORARY debug. Lets the user debug panel ask the onboarding gate to run
 * the link flow again for an already active profile. Delete with the demo
 * onboarding.
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let nonce = 0;

export const requestKalshiRelink = (): void => {
  nonce += 1;
  listeners.forEach((listener) => listener());
};

export const subscribeKalshiRelink = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Zero until a relink is requested. Changes on every request. */
export const getKalshiRelinkNonce = (): number => nonce;
