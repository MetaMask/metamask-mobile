/**
 * DeeplinkManager - Main export file
 *
 * This file provides the public API for the DeeplinkManager module.
 *
 * ## Structure:
 * - `handlers/` - Protocol/orchestration entry points
 * - `handlers/deferred/` - Handlers that can describe a destination before navigating
 * - `handlers/immediate/` - Handlers that navigate immediately
 * - `utils/` - Shared utilities (URL parsing, signatures, interstitial)
 *
 * ## Main Entry Points:
 * - `handlers/handleDeeplink.ts` - Primary deeplink intake
 * - `DeeplinkManager.ts` - Manager class and SharedDeeplinkManager instance
 */

// Main entry points
export { handleDeeplink } from './handlers/handleDeeplink';

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
