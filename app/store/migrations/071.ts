/**
 * Migration 71: set completedOnboarding based on the state of the KeyringController.
 *
 * This migration ended up never being useful, since `onboarding` was blacklisted in `persistConfig`.
 * We're re-running it in migration 81 because we unblacklisted `onboarding` since.
 */
const migration = (state: unknown): unknown => state;

export default migration;
