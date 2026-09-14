import {
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
} from '../../../Ledger/Ledger';
import { withLedgerTimeout } from './with-timeout';
import { LEDGER_OPERATION_TIMEOUT_MS } from './ledger-constants';

/**
 * Options for {@link handleWrongLedgerApp}.
 */
export interface HandleWrongLedgerAppOptions {
  /** Currently running app name ('BOLOS' for the dashboard). */
  appName: string;
  /** Release the caller's session/transport (timeout or failure path). */
  cleanup: () => void | Promise<void>;
  /** Emit the AppNotOpen event (called once, before the app switch). */
  emitAppNotOpen: () => void;
  /** Optional structured logger (adapters pass their DevLogger-prefixed one). */
  log?: (...args: unknown[]) => void;
}

/**
 * Shared wrong-app recovery for the Ledger BLE adapters (legacy + DMK).
 *
 * Emits AppNotOpen via the caller's callback, then attempts to switch the
 * device to the required app: from the BOLOS dashboard we open the Ethereum
 * app directly; from any other app we close it (returning to BOLOS) so the
 * user can open Ethereum manually. On failure or timeout we run the
 * caller's cleanup so a wedged session/transport is not reused.
 */
export async function handleWrongLedgerApp(
  options: HandleWrongLedgerAppOptions,
): Promise<void> {
  const { appName, cleanup, emitAppNotOpen, log } = options;

  log?.('Wrong app or BOLOS:', appName, '- user needs to open Ethereum app');
  emitAppNotOpen();

  const isDashboard = appName === 'BOLOS';
  const appSwitch = isDashboard
    ? openEthereumAppOnLedger
    : closeRunningAppOnLedger;

  try {
    log?.(
      isDashboard ? 'Requesting Ethereum app to open...' : 'Closing wrong app:',
      ...(isDashboard ? [] : [appName]),
    );
    await withLedgerTimeout(
      appSwitch(),
      LEDGER_OPERATION_TIMEOUT_MS,
      isDashboard
        ? 'Device unresponsive while opening Ethereum app'
        : 'Device unresponsive while closing current app',
      cleanup,
    );
    log?.(isDashboard ? 'Open app command sent' : 'Close app command sent');
  } catch (error) {
    log?.(
      isDashboard ? 'Failed to send open app command:' : 'Failed to close app:',
      error,
    );
    await cleanup();
  }
}
