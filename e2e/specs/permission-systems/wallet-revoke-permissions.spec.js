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
import Browser from '../../../app/components/Views/Browser';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';

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
        await Browser.navigateToTestDApp();

        await TestDApp.tapGetPermissionsButton();

        await TestHelpers.delay(3000);

        // await Assertions.checkIfTextIsDisplayed(
        //   'eth_accounts, endowment:permitted-chains',
        // );

        // TODO: [ffmcgee] proper place to abstract and store this
        const elementId0 = Matchers.getElementByID(
          TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        );

        // await Assertions.checkIfElementToHaveText(
        //   elementId0,
        //   'eth_accounts, endowment:permitted-chains',
        // );

        const el0 = await Matchers.getElementByID(
          TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        );
        // eslint-disable-next-line no-console
        console.log({ el0 });

        await TestDApp.tapRevokeAccountPermissionsButton();

        await TestHelpers.delay(3000);

        // await Assertions.checkIfTextIsDisplayed('Permissions result:');

        const el1 = await Matchers.getElementByID(
          TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        );
        // eslint-disable-next-line no-console
        console.log({ el1 });

        await TestDApp.tapGetPermissionsButton();

        await TestHelpers.delay(3000);

        const elementId = Matchers.getElementByID(
          TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        );

        // await Assertions.checkIfElementToHaveText(
        //   elementId,
        //   'No permissions found.',
        //   120000,
        // );

        // Verify UI state after revoking permissions
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
        await Assertions.checkIfVisible(NetworkListModal.networkScroll);
        await NetworkListModal.swipeToDismissModal();
        await Assertions.checkIfNotVisible(NetworkListModal.networkScroll);

        const el2 = await Matchers.getElementByID(
          TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        );
        // eslint-disable-next-line no-console
        console.log({ el2 });

        // await Assertions.checkIfTextIsDisplayed('No permissions found.');

        const el3 = await Matchers.getElementByID(
          TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        );
        // eslint-disable-next-line no-console
        console.log({ el3 });

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
