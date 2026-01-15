/**
 * Seedless Onboarding Module Mocking exports for E2E tests
 *
 * This module provides mocks for the SeedlessOnboardingController
 * to enable E2E testing without real TOPRF authentication.
 *
 * IMPORTANT: This is needed because the OAuth module mock bypasses
 * SeedlessOnboardingController.authenticate(), leaving the controller
 * in an unauthenticated state.
 *
 * @example
 * import { E2ESeedlessControllerHelpers } from '../../module-mocking/seedless-onboarding';
 *
 * beforeEach(() => {
 *   E2ESeedlessControllerHelpers.reset();
 * });
 *
 * it('tests new user flow', async () => {
 *   E2ESeedlessControllerHelpers.configureNewUser();
 * });
 *
 * it('tests existing user flow', async () => {
 *   E2ESeedlessControllerHelpers.configureExistingUser();
 * });
 */

export {
  default as MockSeedlessOnboardingController,
  E2ESeedlessControllerHelpers,
  MockSeedlessOnboardingController as SeedlessOnboardingController,
} from './SeedlessOnboardingControllerMock';
