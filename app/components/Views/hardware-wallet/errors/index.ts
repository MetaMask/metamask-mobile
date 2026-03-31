export { default as ErrorState } from './ErrorState';
/** @deprecated Use ErrorState */
export { default as LedgerErrorState } from './ErrorState';
export { default as LedgerAppClosedError } from './LedgerAppClosedError';
export { default as LedgerBlindSigningDisabledError } from './LedgerBlindSigningDisabledError';
export { default as LedgerConnectionError } from './connection/LedgerConnectionError';
export { default as LedgerDeviceUnresponsiveError } from './LedgerDeviceUnresponsiveError';
export { default as LedgerGenericError } from './LedgerGenericError';
export { isConnectionErrorCode } from './connection/LedgerConnectionError';
export type { ErrorComponentProps, ErrorRendererMap } from './types';
export {
  resolveErrorComponent,
  registerWalletErrors,
  registerSharedErrors,
  resetRegistry,
} from './registry';

import './ledger';
