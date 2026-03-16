import {
  getDefaultSeedlessOnboardingControllerState,
  type SeedlessOnboardingControllerState,
  type SeedlessOnboardingControllerMessenger,
} from '@metamask/seedless-onboarding-controller';
import {
  MockSeedlessOnboardingController,
  E2EMockSeedlessHelpers,
} from './MockSeedlessOnboardingController';

// Re-export helpers for test configuration
export { E2EMockSeedlessHelpers };

/**
 * Controller init request type
 */
interface MockControllerInitRequest {
  controllerMessenger: SeedlessOnboardingControllerMessenger;
  persistedState: {
    SeedlessOnboardingController?: SeedlessOnboardingControllerState;
  };
}

export const seedlessOnboardingControllerInit = (
  request: MockControllerInitRequest,
): { controller: MockSeedlessOnboardingController } => {
  console.log('[E2E Mock] seedlessOnboardingControllerInit called');

  const { controllerMessenger, persistedState } = request;

  const seedlessOnboardingControllerState =
    (persistedState.SeedlessOnboardingController as SeedlessOnboardingControllerState) ??
    getDefaultSeedlessOnboardingControllerState();

  const controller = new MockSeedlessOnboardingController({
    messenger: controllerMessenger,
    state: seedlessOnboardingControllerState,
  });

  console.log('[E2E Mock] MockSeedlessOnboardingController created');

  return { controller };
};

// Default export for compatibility
export default {
  seedlessOnboardingControllerInit,
  E2EMockSeedlessHelpers,
};
