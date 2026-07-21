import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import Assertions from '../../../framework/Assertions.js';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import RequestTypes from '../../../page-objects/Browser/Confirmations/RequestTypes.js';
import TestDApp from '../../../page-objects/Browser/TestDApp.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../../flows/browser.flow.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import { SmokeConfirmations } from '../../../tags.js';
import {
  buildPermissions,
  AnvilPort,
} from '../../../framework/fixtures/FixtureUtils.js';
import RowComponents from '../../../page-objects/Browser/Confirmations/RowComponents.js';
import { DappVariants } from '../../../framework/Constants.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { confirmationFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks.js';
import { LocalNode, LocalNodeType } from '../../../framework/types.js';
import { AnvilManager } from '../../../seeder/anvil-manager.js';

const SIGNATURE_LIST = [
  {
    specName: 'Personal Sign',
    testDappBtn: TestDApp.tapPersonalSignButton.bind(TestDApp),
    requestType: () => RequestTypes.PersonalSignRequest,
    additionAssertions: async () => {
      await Assertions.expectElementToBeVisible(RowComponents.NetworkAndOrigin);
    },
  },
  {
    specName: 'SIWE Sign',
    testDappBtn: TestDApp.tapEthereumSignButton.bind(TestDApp),
    requestType: () => RequestTypes.PersonalSignRequest,
    additionAssertions: async () => {
      await Assertions.expectElementToBeVisible(
        RowComponents.SiweSigningAccountInfo,
      );
    },
  },
];

function buildSignatureFixture({ localNodes }: { localNodes?: LocalNode[] }) {
  const node = localNodes?.[0] as unknown as AnvilManager;
  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;

  return new FixtureBuilder()
    .withNetworkController({
      chainId: '0x539',
      rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
      type: 'custom',
      nickname: 'Local RPC',
      ticker: 'ETH',
    })
    .withPermissionControllerConnectedToTestDapp(buildPermissions(['0x539']))
    .build();
}

appiumTest.describe(SmokeConfirmations('Signature Requests'), () => {
  appiumTest.describe.configure({ timeout: 2500000 });

  for (const {
    specName,
    testDappBtn,
    requestType,
    additionAssertions,
  } of SIGNATURE_LIST) {
    appiumTest(
      `should sign ${specName} message`,
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            dapps: [
              {
                dappVariant: DappVariants.TEST_DAPP,
              },
            ],
            fixture: buildSignatureFixture,
            localNodeOptions: [
              {
                type: LocalNodeType.anvil,
                options: {
                  chainId: 1337,
                },
              },
            ],
            restartDevice: true,
            testSpecificMock: async (mockServer) => {
              await setupRemoteFeatureFlagsMock(
                mockServer,
                Object.assign({}, ...confirmationFeatureFlags),
              );
            },
            currentDeviceDetails,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await navigateToBrowserView();
            await Browser.navigateToTestDApp();
            await waitForTestDappToLoad();

            // cancel request
            await testDappBtn();
            await Assertions.expectElementToBeVisible(requestType());
            await FooterActions.tapCancelButton();
            await Assertions.expectElementToNotBeVisible(requestType());

            await testDappBtn();
            await Assertions.expectElementToBeVisible(requestType());

            // check different sections are visible
            await Assertions.expectElementToBeVisible(
              RowComponents.AccountNetwork,
            );
            await Assertions.expectElementToBeVisible(RowComponents.Message);

            // any signature specific additional assertions
            if (additionAssertions) {
              await additionAssertions();
            }

            // confirm request
            await FooterActions.tapConfirmButton();
            await Assertions.expectElementToNotBeVisible(requestType());
          },
        );
      },
    );
  }
});
