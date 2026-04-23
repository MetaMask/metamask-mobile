/**
 * Tron multichain module for WalletConnect.
 *
 * Re-exports the chain adapter (session config + permissions) and the
 * request/response mappers (WC ↔ CAIP translation) as a single entry point.
 */

export { tronAdapter } from './adapter';
export { tronRequestMapper, tronResponseMapper } from './request-mapper';
export {
  extractTronRawDataHex,
  extractTronType,
  normalizeSignTransactionResult,
} from './utils';
