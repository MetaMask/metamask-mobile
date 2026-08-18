/**
 * E2E Metro mock for `@metamask/seedless-onboarding-controller`.
 *
 * Wallet constructs SeedlessOnboardingController itself, so E2E must replace the
 * package class (not the former mobile `seedlessOnboardingControllerInit`).
 *
 * Metro resolves this file for app/wallet imports, and resolves the real package
 * when the importer is under `tests/module-mocking/seedless` (see metro.config.js).
 */
export {
  getDefaultSeedlessOnboardingControllerState,
  Web3AuthNetwork,
  SeedlessOnboardingControllerErrorMessage,
  SeedlessOnboardingMigrationVersion,
  AuthConnection,
  SecretType,
  SecretMetadata,
  RecoveryError,
  SeedlessOnboardingError,
  EncAccountDataType,
} from '@metamask/seedless-onboarding-controller';

export {
  MockSeedlessOnboardingController as SeedlessOnboardingController,
  E2EMockSeedlessHelpers,
} from './MockSeedlessOnboardingController';
