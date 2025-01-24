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

const SIGNATURE_LIST = [
  {
    specName: 'Personal Sign',
    testDappBtn: TestDApp.tapPersonalSignButton.bind(TestDApp),
    requestType: RequestTypes.PersonalSignRequest,
  },
  {
    specName: 'SIWE Sign',
    testDappBtn: TestDApp.tapEthereumSignButton.bind(TestDApp),
    requestType: RequestTypes.PersonalSignRequest,
  },
  {
    specName: 'Typed V1 Sign',
    testDappBtn: TestDApp.tapTypedSignButton.bind(TestDApp),
    requestType: RequestTypes.TypedSignRequest,
  },
  {
    specName: 'Typed V3 Sign',
    testDappBtn: TestDApp.tapTypedV3SignButton.bind(TestDApp),
    requestType: RequestTypes.TypedSignRequest,
  },
  {
    specName: 'Typed V4 Sign',
    testDappBtn: TestDApp.tapTypedV4SignButton.bind(TestDApp),
    requestType: RequestTypes.TypedSignRequest,
  },
];

describe(SmokeConfirmationsRedesigned('Signature Requests'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  // using for loop here to ensure synchronous execution
  for (let index = 0; index < SIGNATURE_LIST.length; index++) {
    const { specName, testDappBtn, requestType } = SIGNATURE_LIST[index];
    it(`should sign ${specName} message`, async () => {
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
          await testDappBtn();
          await Assertions.checkIfVisible(requestType);
          await FooterActions.tapCancelButton();
          await Assertions.checkIfNotVisible(requestType);

          await testDappBtn();
          await Assertions.checkIfVisible(requestType);

          // check different sections are visible
          await Assertions.checkIfVisible(PageSections.AccountNetworkSection);
          await Assertions.checkIfVisible(PageSections.OriginInfoSection);
          await Assertions.checkIfVisible(PageSections.MessageSection);

          // confirm request
          await FooterActions.tapConfirmButton();
          await Assertions.checkIfNotVisible(requestType);
        },
      );
    });
  }
});
