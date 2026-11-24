import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import { getDappUrlForFixture } from '../../../framework/fixtures/FixtureUtils.js';
import Assertions from '../../../framework/Assertions.js';
import ConfirmationUITypes from '../../../page-objects/Browser/Confirmations/ConfirmationUITypes.js';
import RequestTypes from '../../../page-objects/Browser/Confirmations/RequestTypes.js';
import DappConnectionModal from '../../../page-objects/MMConnect/DappConnectionModal.js';
import TestDApp from '../../../page-objects/Browser/TestDApp.js';
import { TestDappSelectorsWebIDs } from '../../../selectors/Browser/TestDapp.selectors.js';
import { SmokeConfirmations } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../../flows/browser.flow.js';
import { tapTestDappButtonAndWaitForConfirm } from '../../../flows/confirmations.flow.js';
import { DappVariants } from '../../../framework/Constants.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { confirmationFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks.js';
import { LocalNodeType } from '../../../framework/types.js';

// The default fixture registers Localhost (0x539) but keeps Ethereum mainnet
// selected, and the dapp is connected with `eip155:1` only. 0x539 can
// therefore only enter the dapp's CAIP-25 permission after the connection,
// through the switch-chain approval.
const ADDED_CHAIN_ID = '0x539';

function buildFixture() {
  const fixture = new FixtureBuilder()
    .withPermissionControllerConnectedToTestDapp()
    .withAnvilLocalEthBalance()
    .build();

  fixture.state.browser.tabs[0].url = getDappUrlForFixture(0);

  return fixture;
}

const REQUESTS = [
  {
    name: 'eth_sendTransaction',
    buttonId: TestDappSelectorsWebIDs.SEND_EIP_1559_BUTTON_ID,
    confirmation: async () => ConfirmationUITypes.ModalConfirmationContainer,
  },
  {
    name: 'eth_signTypedData_v4',
    buttonId: TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V4,
    confirmation: async () => RequestTypes.TypedSignRequest,
  },
];

appiumTest.describe(
  SmokeConfirmations('Chain permitted after initial connection'),
  () => {
    appiumTest.describe.configure({ timeout: 2500000 });

    for (const { name, buttonId, confirmation } of REQUESTS) {
      appiumTest(
        `shows a confirmation for ${name} on a chain added after connecting`,
        async ({ driver: _driver, currentDeviceDetails }) => {
          await withFixtures(
            {
              dapps: [{ dappVariant: DappVariants.TEST_DAPP }],
              fixture: buildFixture,
              localNodeOptions: [
                {
                  type: LocalNodeType.anvil,
                  options: { chainId: 1337 },
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
              await waitForTestDappToLoad();

              // Add 0x539 to the existing session. The switch-chain approval
              // only appears if the chain was not already permitted, so this
              // also guards the precondition of the scenario.
              await TestDApp.switchEthereumChain(ADDED_CHAIN_ID);
              await DappConnectionModal.tapConnectButton({
                shouldCooldown: true,
                timeToCooldown: 3000,
              });
              await TestDApp.verifyConnectedChainId(ADDED_CHAIN_ID);

              // Fails here (no confirmation appears) while the bug is present.
              await tapTestDappButtonAndWaitForConfirm(buttonId, name);
              await Assertions.expectElementToBeVisible(confirmation(), {
                description: `${name} confirmation on the added chain`,
              });
            },
          );
        },
      );
    }
  },
);
