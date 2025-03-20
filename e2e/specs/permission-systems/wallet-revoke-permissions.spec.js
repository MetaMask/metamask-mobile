'use strict';
import { SmokePermissions } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import BrowserView from '../../pages/Browser/BrowserView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import Assertions from '../../utils/Assertions';

describe(SmokePermissions('Wallet Revoke Permissions'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('revokes wallet permissions from a dapp', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await BrowserView.navigateToTestDApp();

        await TestDApp.tapGetPermissionsButton();

        await TestHelpers.delay(3000);

        await Assertions.checkIfVisible(TestDApp.permissionsContainer);
        // eslint-disable-next-line no-console
        console.log('element is visible check passed!');
        await Assertions.checkIfElementToHaveText(
          TestDApp.permissionsContainer,
          'eth_accounts',
          120000,
        );
        // eslint-disable-next-line no-console
        console.log('element has eth_accounts check passed!');

        await TestDApp.tapRevokeAccountPermissionsButton();

        await TestHelpers.delay(3000);

        await TestDApp.tapGetPermissionsButton();

        await TestHelpers.delay(3000);
        await Assertions.checkIfVisible(TestDApp.permissionsContainer);
        await Assertions.checkIfElementToHaveText(
          TestDApp.permissionsContainer,
          'No permissions found',
          120000,
        );
      },
    );
  });
});
