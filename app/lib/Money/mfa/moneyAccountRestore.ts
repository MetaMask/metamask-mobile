import Logger from '../../../util/Logger';
import { restoreMpcMoneyAccount } from './restoreMpcMoneyAccount';

export type MoneyAccountRestoreStatus =
  | 'idle'
  | 'verifying'
  | 'restoring'
  | 'restored'
  | 'failed';

let status: MoneyAccountRestoreStatus = 'idle';
let statusBeforeVerifying: MoneyAccountRestoreStatus = 'idle';
const listeners = new Set<() => void>();
const setStatus = (next: MoneyAccountRestoreStatus) => {
  status = next;
  listeners.forEach((listener) => listener());
};
const isBusy = () => status === 'verifying' || status === 'restoring';

/** Runs one sign-in at a time and remembers a failure until the next try or a wallet reset. */
export const moneyAccountRestore = {
  getStatus: (): MoneyAccountRestoreStatus => status,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Starts verification; false when a sign-in is already running. */
  begin: (): boolean => {
    if (isBusy()) {
      return false;
    }
    statusBeforeVerifying = status;
    setStatus('verifying');
    return true;
  },
  /** Ends a verification that didn't lead to a restore, e.g. cancelled. */
  end: () => {
    if (status === 'verifying') {
      setStatus(statusBeforeVerifying);
    }
  },
  restore: async (expectedAddress: string): Promise<'restored' | 'failed'> => {
    setStatus('restoring');
    try {
      await restoreMpcMoneyAccount(expectedAddress);
      setStatus('restored');
      return 'restored';
    } catch (error) {
      Logger.error(error as Error, 'Money MPC account restore failed');
      setStatus('failed');
      return 'failed';
    }
  },
  reset: () => setStatus('idle'),
};
