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

describe(SmokeConfirmationsRedesigned('Personal Sign'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('should sign personal message', async () => {
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

        // cancel request
        await TestDApp.tapPersonalSignButton();
        await Assertions.checkIfVisible(RequestTypes.PersonalSignRequest);
        await FooterActions.tapCancelButton();
        await Assertions.checkIfNotVisible(RequestTypes.PersonalSignRequest);

        await TestDApp.tapPersonalSignButton();
        await Assertions.checkIfVisible(RequestTypes.PersonalSignRequest);

        // check different sections are visible
        await Assertions.checkIfVisible(PageSections.AccountNetworkSection);
        await Assertions.checkIfVisible(PageSections.OriginInfoSection);
        await Assertions.checkIfVisible(PageSections.MessageSection);

        // confirm request
        await FooterActions.tapConfirmButton();
        await Assertions.checkIfNotVisible(RequestTypes.PersonalSignRequest);
      },
    );
  });
});
