import type { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { remoteFeatureMultichainAccountsAccountDetails } from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import {
  completeExistingUserQrSyncSrp,
  completeNewUserQrSyncSrp,
} from '../../flows/qr-sync.flow.js';
import { assertAccountCount } from '../../flows/accounts.flow.js';
import { waitForWalletHomePlaywright } from '../../flows/wallet.flow.js';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants.js';
import type { TestSuiteParams } from '../../framework/index.js';

const DEFAULT_ACCOUNT_NAME = 'Account 1';

const enableAddDeviceSyncFlag = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureMultichainAccountsAccountDetails(),
    addDeviceSyncEnabled: true,
  });
};

appiumTest.describe(
  SmokeSeedlessOnboarding('QR sync SRP — mobile ↔ extension'),
  () => {
    appiumTest(
      'new user: imports SRP from extension sync and lands on wallet home',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withOnboardingFixture().build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: enableAddDeviceSyncFlag,
            useCommandQueueServer: true,
          },
          async ({ commandQueueServer }: TestSuiteParams) => {
            if (!commandQueueServer) {
              throw new Error('Command queue server not found');
            }

            await completeNewUserQrSyncSrp({ commandQueueServer });

            await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(30_000));

            await WalletView.tapIdenticon();
            await Assertions.expectElementToBeVisible(
              AccountListBottomSheet.accountList,
              {
                description: 'Account list visible after new-user QR sync',
              },
            );
            await assertAccountCount(DEFAULT_ACCOUNT_NAME, 1, 15_000);
          },
        );
      },
    );

    appiumTest(
      'existing user: links extension and imports one additional SRP',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: enableAddDeviceSyncFlag,
            useCommandQueueServer: true,
          },
          async ({ commandQueueServer }: TestSuiteParams) => {
            if (!commandQueueServer) {
              throw new Error('Command queue server not found');
            }

            await completeExistingUserQrSyncSrp({ commandQueueServer });

            await WalletView.tapIdenticon();
            await Assertions.expectElementToBeVisible(
              AccountListBottomSheet.accountList,
              {
                description: 'Account list visible after existing-user QR sync',
              },
            );
            await assertAccountCount(DEFAULT_ACCOUNT_NAME, 2, 15_000);
          },
        );
      },
    );
  },
);
