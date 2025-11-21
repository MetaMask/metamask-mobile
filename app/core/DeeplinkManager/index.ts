/**
 * DeeplinkManager - Main export file
 *
 * This file provides the public API for the DeeplinkManager module.
 *
 * ## Structure:
 * - `handlers/legacy/` - Current production deeplink handlers
 * - `handlers/v2/` - Modern handler-based routing system (new architecture)
 * - `router/` - UniversalRouter and routing integration
 * - `registry/` - Handler registry for v2 system
 * - `normalization/` - Link normalization and legacy adapter
 * - `utils/` - Shared utilities (URL parsing, signatures, transactions)
 * - `types/` - TypeScript type definitions
 *
 * ## Main Entry Points:
 * - `handleDeeplink.ts` - Primary deeplink entry point
 * - `DeeplinkManager.ts` - Legacy manager class
 * - `SharedDeeplinkManager.ts` - Shared singleton instance
 */

// Main entry points
export { default as SharedDeeplinkManager } from './SharedDeeplinkManager';
export { handleDeeplink } from './handleDeeplink';

// Core system (new handler-based routing)
export { UniversalRouter } from './router/UniversalRouter';
export { CoreLinkNormalizer } from './normalization/CoreLinkNormalizer';
export { HandlerRegistry } from './registry/HandlerRegistry';
export { UniversalRouterIntegration } from './router/UniversalRouterIntegration';

// Core handlers
export {
  BaseHandler,
  NavigationHandler,
  SwapHandler,
  SendHandler,
} from './handlers/v2';

// Core interfaces
export type {
  UniversalLinkHandler,
  HandlerContext,
  HandlerResult,
} from './types/UniversalLinkHandler';

// Types
export type {
  CoreUniversalLink,
  CoreLinkParams,
} from './types/CoreUniversalLink';

// Legacy system (for backward compatibility - will be removed in future)
export { default as DeeplinkManager } from './DeeplinkManager';
export { LegacyLinkAdapter } from './normalization/LegacyLinkAdapter';

// Utilities
export { default as extractURLParams } from './utils/extractURLParams';
export type { DeeplinkUrlParams } from './utils/extractURLParams';
export { default as parseOriginatorInfo } from './utils/parseOriginatorInfo';
export {
  hasSignature,
  verifyDeeplinkSignature,
  VALID,
  INVALID,
  MISSING,
} from './utils/verifySignature';
