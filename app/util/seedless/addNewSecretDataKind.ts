import { EncAccountDataType } from '@metamask/seedless-onboarding-controller';

/** Second argument to `SeedlessOnboardingController.addNewSecretData` (TOPRF enum). */
export type SeedlessAddNewSecretDataKind = EncAccountDataType;

export const SEEDLESS_ADD_NEW_SECRET_DATA_KIND = {
  ImportedSrp: EncAccountDataType.ImportedSrp,
  ImportedPrivateKey: EncAccountDataType.ImportedPrivateKey,
} as const;
