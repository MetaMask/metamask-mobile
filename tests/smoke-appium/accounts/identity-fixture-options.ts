import type { CurrentDeviceDetails } from '../../framework/fixtures/playwright/types.js';
import type { IdentityFixtureOptions } from '../../smoke/identity/utils/withIdentityFixtures.js';
import type { UserStorageMockttpController } from '../../smoke/identity/utils/user-storage/userStorageMockttpController.js';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import {
  USER_STORAGE_GROUPS_FEATURE_KEY,
  USER_STORAGE_WALLETS_FEATURE_KEY,
} from '@metamask/account-tree-controller';

export const identityFixtureOptions = (
  sharedUserStorageController: UserStorageMockttpController,
  currentDeviceDetails: CurrentDeviceDetails,
  overrides: Partial<IdentityFixtureOptions> = {},
): IdentityFixtureOptions => ({
  userStorageFeatures: [
    USER_STORAGE_GROUPS_FEATURE_KEY,
    USER_STORAGE_WALLETS_FEATURE_KEY,
  ],
  sharedUserStorageController,
  currentDeviceDetails,
  ...overrides,
});

export const contactFixtureOptions = (
  sharedUserStorageController: UserStorageMockttpController,
  currentDeviceDetails: CurrentDeviceDetails,
  overrides: Partial<IdentityFixtureOptions> = {},
): IdentityFixtureOptions => ({
  userStorageFeatures: [
    USER_STORAGE_FEATURE_NAMES.addressBook,
    USER_STORAGE_FEATURE_NAMES.accounts,
  ],
  sharedUserStorageController,
  currentDeviceDetails,
  ...overrides,
});
