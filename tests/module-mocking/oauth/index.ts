/**
 * OAuth Module Mocking exports for E2E tests
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
