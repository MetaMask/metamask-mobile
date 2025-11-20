/**
 * DeeplinkManager - Main exports
 *
 * This module provides the public API for deep link handling in MetaMask Mobile.
 * Use these exports to interact with the deep link system.
 */

// ============================================
// MAIN ENTRY POINTS (Recommended Usage)
// ============================================

/**
 * SharedDeeplinkManager - Primary singleton interface for deep link handling
 * Use this for most deep link operations
 */
export { default as SharedDeeplinkManager } from './entry/SharedDeeplinkManager';

/**
 * handleDeeplink - Main entry point for processing deep links
 * Called when a deep link is received by the app
 */
export { handleDeeplink } from './entry/handleDeeplink';

// ============================================
// CORE SYSTEM (New Handler-Based Architecture)
// ============================================

/**
 * UniversalRouter - Modern handler-based routing system
 * Provides extensible handler registration and execution
 */
export { UniversalRouter } from './core/UniversalRouter';

/**
 * CoreLinkNormalizer - URL normalization and validation
 * Converts various deep link formats into standardized CoreUniversalLink format
 */
export { CoreLinkNormalizer } from './core/CoreLinkNormalizer';

/**
 * HandlerRegistry - Handler registration and lookup
 * Manages handler lifecycle and execution order
 */
export { HandlerRegistry } from './core/HandlerRegistry';

/**
 * UniversalRouterIntegration - Integration layer between new and legacy systems
 * Provides feature flag checking and gradual migration support
 */
export { UniversalRouterIntegration } from './core/UniversalRouterIntegration';

// Core Handlers
export {
  BaseHandler,
  NavigationHandler,
  SwapHandler,
  SendHandler,
} from './core/handlers';

// Core Interfaces
export type {
  HandlerContext,
  HandlerResult,
  UniversalLinkHandler,
} from './core/interfaces/UniversalLinkHandler';

// ============================================
// LEGACY SYSTEM (Maintained for Compatibility)
// ============================================

/**
 * DeeplinkManager - Legacy deep link manager
 * @deprecated Use SharedDeeplinkManager instead
 * Kept for backward compatibility during migration
 */
export { default as DeeplinkManager } from './legacy/DeeplinkManager';

/**
 * LegacyLinkAdapter - Bridge between new and legacy formats
 * Used internally during gradual migration
 */
export { LegacyLinkAdapter } from './legacy/LegacyLinkAdapter';

// ============================================
// TYPES
// ============================================

/**
 * Type definitions for deep links
 */
export type {
  CoreUniversalLink,
  CoreLinkParams,
} from './types/CoreUniversalLink';

export {
  DEFAULT_ACTION,
  RAMP_ACTIONS,
  PERPS_ACTIONS,
  AUTH_REQUIRED_ACTIONS,
  SUPPORTED_PROTOCOLS,
} from './types/CoreUniversalLink';

// ============================================
// UTILITIES
// ============================================

/**
 * Utility functions for URL parsing and validation
 */
export { default as extractURLParams } from './utils/extractURLParams';
export type { DeeplinkUrlParams } from './utils/extractURLParams';

export { default as parseOriginatorInfo } from './utils/parseOriginatorInfo';

export {
  hasSignature,
  verifyDeeplinkSignature,
  INVALID,
  MISSING,
  VALID,
} from './utils/verifySignature';
