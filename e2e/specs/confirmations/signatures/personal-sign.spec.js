'use strict';
import Assertions from '../../../utils/Assertions';
import Browser from '../../../pages/Browser/BrowserView';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions.js';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import PageSections from '../../../pages/Browser/Confirmations/PageSections.js';
import RequestTypes from '../../../pages/Browser/Confirmations/RequestTypes.js';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import TestDApp from '../../../pages/Browser/TestDApp';
import TestHelpers from '../../../helpers';
import { loginToApp } from '../../../viewHelper';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../../fixtures/fixture-helper';
import { SmokeConfirmations } from '../../../tags';

describe(SmokeConfirmations('Personal Sign'), () => {
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
