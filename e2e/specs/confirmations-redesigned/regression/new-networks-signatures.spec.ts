import Assertions from '../../../framework/Assertions';
import Browser from '../../../pages/Browser/BrowserView';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import RequestTypes from '../../../pages/Browser/Confirmations/RequestTypes';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import TestDApp from '../../../pages/Browser/TestDApp';
import { loginToApp } from '../../../viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { Regression } from '../../../tags';
import { buildPermissions } from '../../../fixtures/utils';
import RowComponents from '../../../pages/Browser/Confirmations/RowComponents';
import { DappVariants } from '../../../framework/Constants';

import { NETWORK_TEST_CONFIGS } from '../../../resources/mock-configs';

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
    additionAssertions: async () => {
      await Assertions.expectElementToBeVisible(
        RowComponents.SiweSigningAccountInfo,
      );
    },
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

describe(Regression('Signature Requests'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  // Table-driven tests for all networks
  for (const networkConfig of NETWORK_TEST_CONFIGS) {
    for (const { specName, testDappBtn, requestType } of SIGNATURE_LIST) {
      it(`should sign ${specName} using ${networkConfig.name}`, async () => {
        await withFixtures(
          {
            dapps: [
              {
                dappVariant: DappVariants.TEST_DAPP,
              },
            ],
            fixture: new FixtureBuilder()
              .withNetworkController({
                providerConfig: networkConfig.providerConfig,
              })
              .withPermissionControllerConnectedToTestDapp(
                buildPermissions(networkConfig.permissions),
              )
              .build(),
            restartDevice: true,
            testSpecificMock: networkConfig.testSpecificMock,
          },
          async () => {
            await loginToApp();

            await TabBarComponent.tapBrowser();
            await Browser.navigateToTestDApp();

            //Signing Flow
            await testDappBtn();
            await Assertions.expectElementToBeVisible(requestType);
            await FooterActions.tapConfirmButton();
            await Assertions.expectElementToNotBeVisible(requestType);
          },
        );
      });
    }
  }
});
