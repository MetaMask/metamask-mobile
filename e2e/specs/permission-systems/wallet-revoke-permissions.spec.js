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

        // TODO: [ffmcgee] proper place to abstract and store this
        const elementId0 = Matchers.getElementByID(
          TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        );

        // eslint-disable-next-line no-console
        console.log('fetched elementId0 passed!', { elementId0 });

        await Assertions.checkIfVisible(elementId0);
        // eslint-disable-next-line no-console
        console.log('element is visible check passed!');
        await Assertions.checkIfElementToHaveText(
          elementId0,
          'eth_accounts',
          120000,
        );
        // eslint-disable-next-line no-console
        console.log('element has eth_accounts check passed!');

        await TestDApp.tapRevokeAccountPermissionsButton();

        await TestHelpers.delay(3000);

        await TestDApp.tapGetPermissionsButton();

        await TestHelpers.delay(3000);

        const elementId = Matchers.getElementByID(
          TestDappSelectorsWebIDs.PERMISSIONS_RESULT,
        );
        // eslint-disable-next-line no-console
        console.log('fetched elementId passed!', { elementId });

        await Assertions.checkIfElementToHaveText(
          elementId,
          'No permissions found',
          120000,
        );
      },
    );
  });
});
