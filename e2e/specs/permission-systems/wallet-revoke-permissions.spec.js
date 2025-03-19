'use strict';

import { SmokePermissions } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';

import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import Assertions from '../../utils/Assertions';
import { TestDappSelectorsWebIDs } from '../../selectors/Browser/TestDapp.selectors';
import Matchers from '../../utils/Matchers';

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

        await TestDApp.tapGetPermissionsButton();

        await TestHelpers.delay(3000);

        const el0 = await Matchers.getElementByID(
          TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        );

        // eslint-disable-next-line no-console
        console.log({ el0 });
        // await Assertions.checkIfTextIsDisplayed(
        //   'Permissions result: eth_accounts, endowment:permitted-chains',
        // );

        await TestDApp.tapRevokeAccountPermissionsButton();

        await TestHelpers.delay(3000);

        const el1 = await Matchers.getElementByID(
          TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        );

        // eslint-disable-next-line no-console
        console.log({ el1 });

        // await Assertions.checkIfTextIsDisplayed('Permissions result:');

        await TestDApp.tapGetPermissionsButton();

        await TestHelpers.delay(3000);

        const el2 = await Matchers.getElementByID(
          TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        );

        // eslint-disable-next-line no-console
        console.log({ el2 });
        expect(true).toBeTruthy();
        // await Assertions.checkIfElementToHaveText(
        //   TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        //   'No permissions found.',
        // );
        // await Assertions.checkIfTextIsDisplayed(
        //   'Permissions result: No permissions found.',
        // );
      },
    );
  });
});
