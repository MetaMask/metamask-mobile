// Main entry point
export { default as SharedDeeplinkManager } from './entry/SharedDeeplinkManager';
export { handleDeeplink } from './entry/handleDeeplink';

// Core system (new)
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

// Types
export * from './types/CoreUniversalLink';

// Legacy (for backward compatibility)
export { default as DeeplinkManager } from './legacy/DeeplinkManager';
export { LegacyLinkAdapter } from './legacy/LegacyLinkAdapter';

// Utilities (for advanced use cases)
export { default as extractURLParams } from './utils/extractURLParams';
export { default as parseOriginatorInfo } from './utils/parseOriginatorInfo';
export {
  hasSignature,
  verifyDeeplinkSignature,
  INVALID,
  MISSING,
  VALID,
} from './utils/verifySignature';
