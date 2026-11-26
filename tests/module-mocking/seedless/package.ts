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
  getEnvelopeStatus,
  Web3AuthNetwork,
  SeedlessOnboardingControllerErrorMessage,
  SeedlessOnboardingMigrationVersion,
  SeedlessOnboardingOperation,
  SeedlessOnboardingCheckpoint,
  PasswordSyncInstruction,
  AuthConnection,
  AUTH_CONNECTION_BY_NAMESPACE,
  SecretType,
  SecretMetadata,
  InvalidPrimarySecretDataTypeError,
  RecoveryError,
  SeedlessOnboardingError,
  EncAccountDataType,
  parseSeedlessAuthData,
} from '@metamask/seedless-onboarding-controller';

export {
  MockSeedlessOnboardingController as SeedlessOnboardingController,
  E2EMockSeedlessHelpers,
} from './MockSeedlessOnboardingController';
