/**
 * DeeplinkManager - Main export file
 *
 * This file provides the public API for the DeeplinkManager module.
 *
 * ## Structure:
 * - `entry/` - Main entry points and singleton management
 * - `core/` - Modern handler-based routing system (new)
 * - `legacy/` - Current production system (being phased out)
 * - `utils/` - Shared utilities
 * - `types/` - Type definitions
 */

// Main entry points
export { default as SharedDeeplinkManager } from './entry/SharedDeeplinkManager';
export { handleDeeplink } from './entry/handleDeeplink';

// Core system (new handler-based routing)
export { UniversalRouter } from './core/UniversalRouter';
export { CoreLinkNormalizer } from './core/CoreLinkNormalizer';
export { HandlerRegistry } from './core/HandlerRegistry';
export { UniversalRouterIntegration } from './core/UniversalRouterIntegration';

// Core handlers
export {
  BaseHandler,
  NavigationHandler,
  SwapHandler,
  SendHandler,
} from './core/handlers';

// Core interfaces
export type {
  UniversalLinkHandler,
  HandlerContext,
  HandlerResult,
} from './core/interfaces/UniversalLinkHandler';

// Types
export type {
  CoreUniversalLink,
  CoreLinkParams,
} from './types/CoreUniversalLink';

// Legacy system (for backward compatibility - will be removed in future)
export { default as DeeplinkManager } from './legacy/DeeplinkManager';
export { LegacyLinkAdapter } from './legacy/LegacyLinkAdapter';

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
