import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import {
  mockAuthServices,
  createUserStorageController,
  setupAccountMockedBalances,
} from './mocks';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import {
  pathRegexps,
  UserStorageMockttpController,
  UserStorageMockttpControllerOverrides,
} from './user-storage/userStorageMockttpController';
import { Mockttp } from 'mockttp';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import { TestSpecificMock } from '../../../framework/types';

export interface IdentityFixtureOptions {
  fixture?: object;
  restartDevice?: boolean;
  testSpecificMock?: TestSpecificMock;
  userStorageFeatures?: (keyof typeof pathRegexps)[];
  userStorageOverrides?: Partial<
    Record<keyof typeof pathRegexps, UserStorageMockttpControllerOverrides>
  >;
  sharedUserStorageController?: UserStorageMockttpController;
  mockBalancesAccounts?: string[];
}

export interface IdentityTestContext {
  mockServer: Mockttp;
  userStorageMockttpController: UserStorageMockttpController;
}

export async function withIdentityFixtures(
  options: IdentityFixtureOptions,
  testFn: (context: IdentityTestContext) => Promise<void>,
): Promise<void> {
  const {
    fixture = new FixtureBuilder().withBackupAndSyncSettings().build(),
    restartDevice = true,
    testSpecificMock = {
      POST: [mockEvents.POST.segmentTrack],
    },
    mockBalancesAccounts = [],
    userStorageFeatures = [
      USER_STORAGE_FEATURE_NAMES.accounts,
      USER_STORAGE_FEATURE_NAMES.addressBook,
    ],
    userStorageOverrides,
    sharedUserStorageController,
  } = options;

  await withFixtures(
    {
      fixture,
      restartDevice,
      testSpecificMock,
    },
    async ({ mockServer }) => {
      if (!mockServer) {
        throw new Error('Mock server is not defined');
      }

      // mock auth services
      await mockAuthServices(mockServer);
      if (mockBalancesAccounts.length > 0) {
        await setupAccountMockedBalances(mockServer, mockBalancesAccounts);
      }

      let userStorageController: UserStorageMockttpController;

      if (sharedUserStorageController) {
        userStorageController = sharedUserStorageController;
      } else {
        userStorageController = createUserStorageController();
      }

      for (const feature of userStorageFeatures) {
        const overrides = userStorageOverrides?.[feature] || {};
        await userStorageController.setupPath(feature, mockServer, overrides);
      }

      await testFn({
        mockServer,
        userStorageMockttpController: userStorageController,
      });
    },
  );
}
