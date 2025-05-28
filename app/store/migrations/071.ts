/**
 * Migration 71: set completedOnboarding based on the state of the KeyringController.
 *
 * This migration ended up never being useful, since `onboarding` was blacklisted in `persistConfig`.
 * We're instead applying the original logic in `onPersistComplete` in `app/store/index.ts`.
 */
const migration = (state: unknown): unknown => state;

export default migration;
