/**
 * DeeplinkManager - Main export file
 *
 * This file provides the public API for the DeeplinkManager module.
 *
 * ## Structure:
 * - `utils/` - Shared utilities (URL parsing, signatures, transactions)
 *
 * ## Main Entry Points:
 * - `handleDeeplink.ts` - Primary deeplink entry point
 * - `DeeplinkManager.ts` - Legacy manager class and SharedDeeplinkManager instance
 */

// Main entry points
export { handleDeeplink } from './handlers/legacy/handleDeeplink';

// Legacy system (for backward compatibility - will be removed in future)
export {
  default as SharedDeeplinkManager, // Re-exports the default (wrapper) as SharedDeeplinkManager
  DeeplinkManager, // Re-exports the class
} from './DeeplinkManager';

// Utilities
export { default as extractURLParams } from './utils/extractURLParams';
export type { DeeplinkUrlParams } from './types/deepLink.types';
export { default as parseOriginatorInfo } from './utils/parseOriginatorInfo';
export {
  hasSignature,
  verifyDeeplinkSignature,
  VALID,
  INVALID,
  MISSING,
} from './utils/verifySignature';
