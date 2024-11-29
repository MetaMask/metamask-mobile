import { Regression } from '../../tags';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import Assertions from '../../utils/Assertions';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { stopFixtureServer, withFixtures } from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { CustomNetworks } from '../../resources/networks.e2e';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/TabBarComponent';
import NetworkNonPemittedBottomSheet from '../../pages/Network/NetworkNonPemittedBottomSheet';

const fixtureServer = new FixtureServer();
const ETHEREUM = 'Ethereum Main Network';

describe(Regression('Connect to a Test Network'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should switch to test Network then dismiss the network education modal', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .withChainPermission()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);
        // TODO 1: connect to test dapp
        await Browser.navigateToTestDApp();

        await TabBarComponent.tapWallet();
        await Assertions.checkIfVisible(WalletView.container);
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.scrollToBottomOfNetworkList();
        await Assertions.checkIfVisible(NetworkListModal.networkScroll);
        await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
        await NetworkListModal.changeNetworkTo(
          CustomNetworks.Sepolia.providerConfig.nickname,
        );
        await Assertions.checkIfVisible(NetworkEducationModal.container);
        await Assertions.checkIfElementToHaveText(
          NetworkEducationModal.networkName,
          CustomNetworks.Sepolia.providerConfig.nickname,
        );
        await NetworkEducationModal.tapGotItButton();
        await Assertions.checkIfNotVisible(NetworkEducationModal.container);
        await Assertions.checkIfVisible(WalletView.container);

        const networkPicker = await WalletView.getNavbarNetworkPicker();
        await Assertions.checkIfElementHasLabel(
          networkPicker,
          CustomNetworks.Sepolia.providerConfig.nickname,
        );

        await TabBarComponent.tapBrowser();
        // await Assertions.checkIfVisible(Browser.browserScreenID);

        await Assertions.checkIfVisible(
          NetworkNonPemittedBottomSheet.addThisNetworkTitle,
        );

        await NetworkNonPemittedBottomSheet.tapAddThisNetworkButton();
        // two steps that might come in handy
        // await Assertions.checkIfVisible(WalletView.container);
        // const networkPicker = await WalletView.getNavbarNetworkPicker();
      },
    );
  });
});
