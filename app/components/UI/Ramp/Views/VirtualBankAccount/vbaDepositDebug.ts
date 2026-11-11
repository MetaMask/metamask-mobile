import { readVbaDepositDebugEnv } from './vbaDepositDebug.env';

/**
 * Dev-only deposit diagnostics. Set `MM_MONEY_VBA_DEBUG_PANEL=true` in
 * `.js.env` and restart Metro. Production builds ignore it, and transaction
 * polling stays off unless this is enabled.
 *
 * @returns Whether the debug sheet and transaction poll should run.
 */
export const isVbaDepositDebugEnabled = (): boolean =>
  __DEV__ && readVbaDepositDebugEnv() === 'true';
