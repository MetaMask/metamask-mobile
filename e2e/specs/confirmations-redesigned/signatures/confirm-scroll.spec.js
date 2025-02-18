'use strict';
import Assertions from '../../../utils/Assertions.js';
import Browser from '../../../pages/Browser/BrowserView.js';
import FixtureBuilder from '../../../fixtures/fixture-builder.js';
import PageSections from '../../../pages/Browser/Confirmations/PageSections.js';
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

const permitSignRequestBody = {
  method: 'eth_signTypedData_v4',
  params: [
    '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
    '{"primaryType":"Permit","types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Permit":[{"name":"owner","type":"address"},{"name":"spender","type":"address"},{"name":"value","type":"uint256"},{"name":"nonce","type":"uint256"},{"name":"deadline","type":"uint256"}]},"domain":{"chainId":1,"name":"MyToken","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","version":"1"},"message":{"owner":"0x8eeee1781fd885ff5ddef7789486676961873d12","spender":"0x5B38Da6a701c568545dCfcB03FcB875f56beddC4","value":3000,"nonce":0,"deadline":50000000000}}',
  ],
  origin: 'localhost',
};

describe(SmokeConfirmationsRedesigned('Confirmations Page Scroll'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('should not display scroll button if the page has no scroll', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        testSpecificMock: {
          GET: [mockEvents.GET.remoteFeatureFlagsReDesignedConfirmations],
        },
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapPersonalSignButton.bind(TestDApp);
        await Assertions.checkIfNotVisible(PageSections.ScrollButton);
      },
    );
  });

  it('should display scroll button if the page has scroll', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        testSpecificMock: {
          GET: [mockEvents.GET.remoteFeatureFlagsReDesignedConfirmations],
          POST: [
            {
              ...mockEvents.POST.securityAlertApiValidate,
              requestBody: permitSignRequestBody,
              response: {
                block: 20733277,
                result_type: 'Malicious',
                reason: 'malicious_domain',
                description: `You're interacting with a malicious domain. If you approve this request, you might lose your assets.`,
                features: [],
              },
            },
          ],
        },
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapPermitSignButton.bind(TestDApp);
        await Assertions.checkIfVisible(PageSections.ScrollButton);
      },
    );
  });
});
