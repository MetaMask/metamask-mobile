import { SecretType } from '@metamask/seedless-onboarding-controller';

/** Second argument to `SeedlessOnboardingController.addNewSecretData` (TOPRF enum). */
export type SeedlessAddNewSecretDataKind = SecretType;

export const SEEDLESS_ADD_NEW_SECRET_DATA_KIND = {
  ImportedSrp: SecretType.Mnemonic,
  ImportedPrivateKey: SecretType.PrivateKey,
} as const;
