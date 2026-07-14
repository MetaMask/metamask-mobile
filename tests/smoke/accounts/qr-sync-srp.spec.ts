'use strict';

import type { Mockttp } from 'mockttp';
import { SmokeAccounts } from '../../tags';
import TestHelpers from '../../helpers';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  remoteFeatureMultichainAccountsAccountDetails,
  remoteFeaturePredictGtmOnboardingModalDisabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import Assertions from '../../framework/Assertions';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import {
  completeExistingUserQrSyncSrp,
  completeNewUserQrSyncSrp,
} from '../../flows/qr-sync.flow';
import { assertAccountCount } from '../../flows/accounts.flow';

const DEFAULT_ACCOUNT_NAME = 'Account 1';

const enableAddDeviceSyncFlag = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureMultichainAccountsAccountDetails(),
    ...remoteFeaturePredictGtmOnboardingModalDisabled(),
    addDeviceSyncEnabled: {
      enabled: true,
      minimumVersion: '1.0.0',
    },
  });
};

describe(SmokeAccounts('QR sync SRP — mobile ↔ extension'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('new user: imports SRP from extension sync and lands on wallet home', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        restartDevice: true,
        testSpecificMock: enableAddDeviceSyncFlag,
      },
      async () => {
        await completeNewUserQrSyncSrp();

        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet home visible after new-user QR sync',
        });

        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
          {
            description: 'Account list visible after new-user QR sync',
          },
        );
        // Phase C may rename to the extension label asynchronously; default name is enough.
        await assertAccountCount(DEFAULT_ACCOUNT_NAME, 1, 15_000);
      },
    );
  });

  it('existing user: links extension and imports one additional SRP', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: enableAddDeviceSyncFlag,
      },
      async () => {
        await completeExistingUserQrSyncSrp();

        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
          {
            description: 'Account list visible after existing-user QR sync',
          },
        );
        // Fixture Account 1 + imported SRP Account 1 → two rows with the same label.
        await assertAccountCount(DEFAULT_ACCOUNT_NAME, 2, 15_000);
      },
    );
  });
});
