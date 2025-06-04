'use strict';
import Assertions from '../../../utils/Assertions.js';
import Browser from '../../../pages/Browser/BrowserView.js';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions.js';
import FixtureBuilder from '../../../fixtures/fixture-builder.js';
import PageSections from '../../../pages/Browser/Confirmations/PageSections.js';
import RequestTypes from '../../../pages/Browser/Confirmations/RequestTypes.js';
import TabBarComponent from '../../../pages/wallet/TabBarComponent.js';
import TestDApp from '../../../pages/Browser/TestDApp.js';
import TestHelpers from '../../../helpers.js';
import { loginToApp } from '../../../viewHelper.js';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../../fixtures/fixture-helper.js';
import { SmokeConfirmationsRedesigned } from '../../../tags.js';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events.js';
import { buildPermissions } from '../../../fixtures/utils.js';
import { TransactionType } from '@metamask/transaction-controller';

describe(SmokeConfirmationsRedesigned('Signature Requests'), () => {
  const testSpecificMock = {
    GET: [mockEvents.GET.remoteFeatureFlags7702Support],
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it(`should be able to submit 5792 wallet_sendCalls`, async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        // cancel request
        await TestDApp.tapEIP5792SendCalls();
        await Assertions.checkIfVisible(TransactionType.batch);

        await FooterActions.tapCancelButton();
      },
    );
  });
});
