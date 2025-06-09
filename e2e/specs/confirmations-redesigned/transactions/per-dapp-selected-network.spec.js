'use strict';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events.js';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../../fixtures/fixture-helper';
import { buildPermissions } from '../../../fixtures/utils';
import TestHelpers from '../../../helpers';
import Browser from '../../../pages/Browser/BrowserView';
import ConfirmationFooterActions from '../../../pages/Browser/Confirmations/FooterActions';
import ConfirmationUITypes from '../../../pages/Browser/Confirmations/ConfirmationUITypes';
import TestDApp from '../../../pages/Browser/TestDApp';
import NetworkEducationModal from '../../../pages/Network/NetworkEducationModal';
import NetworkListModal from '../../../pages/Network/NetworkListModal';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import WalletView from '../../../pages/wallet/WalletView';
import { BrowserViewSelectorsIDs } from '../../../selectors/Browser/BrowserView.selectors';
import { TestDappSelectorsWebIDs } from '../../../selectors/Browser/TestDapp.selectors';
import { SmokeConfirmationsRedesigned } from '../../../tags';
import Assertions from '../../../utils/Assertions';
import Matchers from '../../../utils/Matchers';
import { loginToApp } from '../../../viewHelper';

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
  const testSpecificMock = {
    GET: [mockEvents.GET.remoteFeatureFlagsRedesignedConfirmations],
  };

  beforeAll(async () => {
    jest.setTimeout(15000);
    await TestHelpers.reverseServerPort();
  });

  it('submits a transaction to a dApp selected network', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions([LOCAL_CHAIN_ID]),
          )
          .build(),
        ganacheOptions: defaultGanacheOptions,
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();
        await Browser.waitForBrowserPageToLoad();

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
        await Assertions.checkIfVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );

        // Assert the transaction is happening on the correct network
        await Assertions.checkIfTextIsDisplayed(LOCAL_CHAIN_NAME);

        // Accept confirmation
        await ConfirmationFooterActions.tapConfirmButton();

        // Change the network to Localhost in app
        await changeNetworkFromNetworkListModal(LOCAL_CHAIN_NAME);

        // Check activity tab
        await TabBarComponent.tapActivity();
        await Assertions.checkIfTextIsDisplayed('Confirmed');
      },
    );
  });
});
