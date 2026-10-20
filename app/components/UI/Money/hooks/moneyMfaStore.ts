import StorageWrapper from '../../../../store/storage-wrapper';
import Logger from '../../../../util/Logger';

export type MoneyMfaPhase = 'idle' | 'setting_up' | 'failed';

export interface MoneyMfaStoreState {
  phase: MoneyMfaPhase;
  /** Money 2-step verification is on. Stands in for the MPC account state. */
  isEnabled: boolean;
  /** Setup finished at least once, so turning on again skips setup. */
  hasBeenEnabled: boolean;
}

export const MONEY_MFA_STORAGE_KEY = '@MetaMask:moneyMfa';

const initialState: MoneyMfaStoreState = {
  phase: 'idle',
  isEnabled: false,
  hasBeenEnabled: false,
};

const readPersisted = (): Partial<MoneyMfaStoreState> => {
  try {
    const raw = StorageWrapper.getItemSync(MONEY_MFA_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const { isEnabled, hasBeenEnabled } = JSON.parse(raw);
    return {
      isEnabled: Boolean(isEnabled),
      hasBeenEnabled: Boolean(hasBeenEnabled),
    };
  } catch {
    return {};
  }
};

let state: MoneyMfaStoreState = { ...initialState, ...readPersisted() };
const listeners = new Set<() => void>();

const persist = ({ isEnabled, hasBeenEnabled }: MoneyMfaStoreState) => {
  StorageWrapper.setItem(
    MONEY_MFA_STORAGE_KEY,
    JSON.stringify({ isEnabled, hasBeenEnabled }),
  ).catch((error: Error) => Logger.error(error, 'Money MFA state not saved'));
};

export const moneyMfaStore = {
  getState: (): MoneyMfaStoreState => state,
  setState: (patch: Partial<MoneyMfaStoreState>) => {
    const previous = state;
    state = { ...state, ...patch };
    if (
      previous.isEnabled !== state.isEnabled ||
      previous.hasBeenEnabled !== state.hasBeenEnabled
    ) {
      persist(state);
    }
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
