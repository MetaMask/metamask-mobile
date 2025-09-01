import Assertions from '../../../framework/Assertions';
import Browser from '../../../pages/Browser/BrowserView';
import FooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import RequestTypes from '../../../pages/Browser/Confirmations/RequestTypes';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import TestDApp from '../../../pages/Browser/TestDApp';
import { loginToApp } from '../../../viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { SmokeConfirmationsRedesigned } from '../../../tags';
import { buildPermissions } from '../../../framework/fixtures/FixtureUtils';
import RowComponents from '../../../pages/Browser/Confirmations/RowComponents';
import { DappVariants } from '../../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationsRedesignedFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks';

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

describe(SmokeConfirmationsRedesigned('Signature Requests'), () => {
  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      Object.assign({}, ...confirmationsRedesignedFeatureFlags),
    );
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  for (const {
    specName,
    testDappBtn,
    requestType,
    additionAssertions,
  } of SIGNATURE_LIST) {
    it(`should sign ${specName} message`, async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withGanacheNetwork()
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(['0x539']),
            )
            .build(),
          restartDevice: true,
          testSpecificMock,
        },
        async () => {
          await loginToApp();

          await TabBarComponent.tapBrowser();
          await Browser.navigateToTestDApp();

          // cancel request
          await testDappBtn();
          await Assertions.expectElementToBeVisible(requestType);
          await FooterActions.tapCancelButton();
          await Assertions.expectElementToNotBeVisible(requestType);

          await testDappBtn();
          await Assertions.expectElementToBeVisible(requestType);

          // check different sections are visible
          await Assertions.expectElementToBeVisible(
            RowComponents.AccountNetwork,
          );
          await Assertions.expectElementToBeVisible(RowComponents.OriginInfo);
          await Assertions.expectElementToBeVisible(RowComponents.Message);

          // any signature specific additional assertions
          if (additionAssertions) {
            await additionAssertions();
          }

          // confirm request
          await FooterActions.tapConfirmButton();
          await Assertions.expectElementToNotBeVisible(requestType);
        },
      );
    });
  }
});
