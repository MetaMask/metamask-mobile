import { mockEvents } from '../../api-mocking/mock-config/mock-events.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { buildPermissions } from '../../framework/fixtures/FixtureUtils.ts';
import Browser from '../../pages/Browser/BrowserView.ts';
import ConfirmationFooterActions from '../../pages/Browser/Confirmations/FooterActions.ts';
import ConfirmationUITypes from '../../pages/Browser/Confirmations/ConfirmationUITypes.ts';
import TestDApp from '../../pages/Browser/TestDApp.ts';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal.ts';
import NetworkListModal from '../../pages/Network/NetworkListModal.ts';
import TabBarComponent from '../../pages/wallet/TabBarComponent.ts';
import WalletView from '../../pages/wallet/WalletView.ts';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors.ts';
import { TestDappSelectorsWebIDs } from '../../selectors/Browser/TestDapp.selectors.ts';
import { SmokeConfirmationsRedesigned } from '../../tags.js';
import Assertions from '../../framework/Assertions.ts';
import Matchers from '../../framework/Matchers.ts';
import { loginToApp } from '../../viewHelper.ts';
import { DappVariants } from '../../framework/Constants.ts';
import { setupMockRequest } from '../../api-mocking/mockHelpers.ts';

const LOCAL_CHAIN_ID = '0x539';
const LOCAL_CHAIN_NAME = 'Localhost';

async function checkChainIdInTestDapp(assertedChainId) {
  const chainIdElement = await Matchers.getElementByWebID(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    TestDappSelectorsWebIDs.CHAIN_ID_TEXT,
  );
  const chainIdText = await chainIdElement.getText();
  await Assertions.checkIfTextMatches(chainIdText, assertedChainId);
}

async function changeNetworkFromNetworkListModal(networkName) {
  await TabBarComponent.tapWallet();
  await WalletView.tapNetworksButtonOnNavBar();
  await NetworkListModal.changeNetworkTo(networkName);
  await device.disableSynchronization();
  await NetworkEducationModal.tapGotItButton();
  await device.enableSynchronization();
}

describe(SmokeConfirmationsRedesigned('Per Dapp Selected Network'), () => {
  const testSpecificMock = async (mockServer) => {
    const { urlEndpoint, response } =
      mockEvents.GET.remoteFeatureFlagsRedesignedConfirmations;
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: urlEndpoint,
      response,
      responseCode: 200,
    });
  };

  // Some tests depend on the MM_REMOVE_GLOBAL_NETWORK_SELECTOR environment variable being set to false.
  const isRemoveGlobalNetworkSelectorEnabled =
    process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
  const itif = (condition) => (condition ? it.skip : it);

  beforeAll(async () => {
    jest.setTimeout(15000);
  });

  itif(isRemoveGlobalNetworkSelectorEnabled)(
    'submits a transaction to a dApp selected network',
    async () => {
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
              buildPermissions([LOCAL_CHAIN_ID]),
            )
            .build(),
          restartDevice: true,
          testSpecificMock,
        },
        async () => {
          await loginToApp();
          await TabBarComponent.tapBrowser();
          await Browser.navigateToTestDApp();

          // Make sure the dapp is connected to the predefined network in configuration (LOCAL_CHAIN_ID)
          // by checking chainId text in the test dapp
          await checkChainIdInTestDapp(LOCAL_CHAIN_ID);

          // Change the network to Ethereum Main Network in app
          await changeNetworkFromNetworkListModal('Ethereum Main Network');

          await TabBarComponent.tapBrowser();
          // Assert the dapp is still connected the previously selected network (LOCAL_CHAIN_ID)
          await checkChainIdInTestDapp(LOCAL_CHAIN_ID);

          // Now do a transaction
          await TestDApp.tapSendEIP1559Button();

          // Wait for the confirmation modal to appear
          await Assertions.expectElementToBeVisible(
            ConfirmationUITypes.ModalConfirmationContainer,
          );

          // Assert the transaction is happening on the correct network
          await Assertions.expectTextDisplayed(LOCAL_CHAIN_NAME);

          // Accept confirmation
          await ConfirmationFooterActions.tapConfirmButton();

          // Change the network to Localhost in app
          await changeNetworkFromNetworkListModal(LOCAL_CHAIN_NAME);

          // Check activity tab
          await TabBarComponent.tapActivity();
          await Assertions.expectTextDisplayed('Confirmed');
        },
      );
    },
  );
});
