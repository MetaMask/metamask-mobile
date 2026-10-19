export type MoneyMfaPhase = 'idle' | 'setting_up' | 'failed';

export interface MoneyMfaStoreState {
  phase: MoneyMfaPhase;
  /** Set by the More sheet toggle until turning 2FA off has an API (MFA-776). */
  isTurnedOff: boolean;
}

const initialState: MoneyMfaStoreState = {
  phase: 'idle',
  isTurnedOff: false,
};

let state: MoneyMfaStoreState = initialState;
const listeners = new Set<() => void>();

export const moneyMfaStore = {
  getState: (): MoneyMfaStoreState => state,
  setState: (patch: Partial<MoneyMfaStoreState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  reset: () => {
    state = initialState;
    listeners.forEach((listener) => listener());
  },
};
