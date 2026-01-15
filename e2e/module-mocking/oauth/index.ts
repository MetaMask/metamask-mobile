/**
 * OAuth Module Mocking exports for E2E tests
 *
 * This module is aliased via metro.config.js during E2E builds
 * to replace the real OAuthLoginService.
 *
 * Key Integration with Backend QA Mock:
 * - Uses E2E email patterns (*+e2e@web3auth.io) that backend recognizes
 * - Email prefix determines test scenario (newuser, existinguser, error.*)
 * - Backend QA mock generates real, valid tokens
 *
 * @example
 * import { E2EOAuthHelpers } from '../../module-mocking/oauth';
 *
 * beforeEach(() => {
 *   E2EOAuthHelpers.reset();
 * });
 *
 * it('tests Google new user flow', async () => {
 *   E2EOAuthHelpers.configureGoogleNewUser();
 *   // E2E email: google.newuser+e2e@web3auth.io
 * });
 *
 * it('tests Apple existing user flow', async () => {
 *   E2EOAuthHelpers.configureAppleExistingUser();
 *   // E2E email: apple.existinguser+e2e@web3auth.io
 * });
 *
 * it('tests error scenario', async () => {
 *   E2EOAuthHelpers.configureError('timeout');
 *   // E2E email: error.timeout+e2e@web3auth.io
 * });
 */

export { default as OAuthLoginService, E2EOAuthHelpers } from './OAuthService';
