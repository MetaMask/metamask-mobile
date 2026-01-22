/**
 * OAuth Module Mocking exports for E2E tests
 *
 * This module provides:
 * 1. E2EOAuthHelpers - Configure mock behavior (new/existing user, provider, errors)
 * 2. OAuthLoginHandlers mock - Bypasses native OAuth UI (Google/Apple sign-in)
 *
 */

// Export shared helpers
export {
  E2EOAuthHelpers,
  E2E_EMAILS,
  E2EScenario,
  E2ELoginProvider,
  type E2EOAuthConfig,
} from './E2EOAuthHelpers';

// Re-export for backwards compatibility
export { E2EOAuthHelpers as default } from './E2EOAuthHelpers';
