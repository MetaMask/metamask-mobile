/**
 * OAuth Module Mocking exports for E2E tests
 *
 * @example
 * import { E2EOAuthHelpers } from '../../module-mocking/oauth';
 *
 * beforeEach(() => {
 *   E2EOAuthHelpers.reset();
 * });
 *
 * it('tests new user flow', async () => {
 *   E2EOAuthHelpers.setNewUserResponse('newuser@example.com');
 * });
 */

export { default as OAuthLoginService, E2EOAuthHelpers } from './OAuthService';
