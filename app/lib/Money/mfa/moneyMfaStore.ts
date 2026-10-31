import StorageWrapper from '../../../store/storage-wrapper';
import Logger from '../../../util/Logger';

export interface MoneyMfaStoreState {
  /** Money 2-step verification is on. Stands in for the MPC account state. */
  isMoneyAccountMfaEnabled: boolean;
  /** The user closed the setting-up banner of the current migration. */
  isMigrationBannerDismissed: boolean;
  /** The user closed the wallet home prompt for good. */
  isHomePromptDismissed: boolean;
}

export const MONEY_MFA_STORAGE_KEY = '@MetaMask:moneyMfa';

const initialState: MoneyMfaStoreState = {
  isMoneyAccountMfaEnabled: false,
  isMigrationBannerDismissed: false,
  isHomePromptDismissed: false,
};

const readPersisted = (): Partial<MoneyMfaStoreState> => {
  try {
    const raw = StorageWrapper.getItemSync(MONEY_MFA_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const {
      isMoneyAccountMfaEnabled,
      isMigrationBannerDismissed,
      isHomePromptDismissed,
    } = JSON.parse(raw);
    return {
      isMoneyAccountMfaEnabled: Boolean(isMoneyAccountMfaEnabled),
      isMigrationBannerDismissed: Boolean(isMigrationBannerDismissed),
      isHomePromptDismissed: Boolean(isHomePromptDismissed),
    };
  } catch {
    return {};
  }
};

let state: MoneyMfaStoreState = { ...initialState, ...readPersisted() };
const listeners = new Set<() => void>();

export const moneyMfaStore = {
  getState: (): MoneyMfaStoreState => state,
  setState: (patch: Partial<MoneyMfaStoreState>) => {
    state = { ...state, ...patch };
    StorageWrapper.setItem(MONEY_MFA_STORAGE_KEY, JSON.stringify(state)).catch(
      (error: Error) => Logger.error(error, 'Money MFA state not saved'),
    );
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
  /** Forgets the saved state, e.g. when the wallet is reset. */
  clear: async () => {
    state = initialState;
    listeners.forEach((listener) => listener());
    await StorageWrapper.removeItem(MONEY_MFA_STORAGE_KEY);
  },
};
