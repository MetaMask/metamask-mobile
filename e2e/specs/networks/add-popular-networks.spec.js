'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import NetworkView from '../../pages/Settings/NetworksView';
import WalletView from '../../pages/WalletView';
import SettingsView from '../../pages/Settings/SettingsView';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';
import NetworkAddedModal from '../../pages/modals/NetworkAddedModal';
import NetworkApprovalModal from '../../pages/modals/NetworkApprovalModal';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import Assertions from '../../utils/Assertions';
import Networks from '../../resources/networks.json';
import Matchers from '../../utils/Matchers';
import fs from 'fs';

const data = fs.readFile(Networks, 'utf8');
const networks = JSON.parse(data);

// Loop through each network and print its nickname

const fixtureServer = new FixtureServer();
const SHORT_HAND_NETWORK_TEXT = 'ar';
describe(Regression('Custom RPC Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp();
    await loginToApp();
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it(`Add ${Networks.Arbitrum.providerConfig.nickname} via popular network list`, async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapNetworks();
    await NetworkView.tapAddNetworkButton();

    for (const networkName in networks) {
      console.log(networks[networkName].providerConfig.nickname);
      //   await NetworkView.tapNetworkByName(
      //     networks[networkName].providerConfig.nickname,
      //   );

      //   await NetworkApprovalModal.tapApproveButton();
      //   await NetworkAddedModal.tapCloseButton();
      //   await NetworkView.closePopularNetwork();
    } // await Assertions.checkIfVisible(NetworkView.networkContainer);
  });

  it('search network list', async () => {
    await NetworkView.SearchNetworkName('cccM');
    await Assertions.checkIfVisible(NetworkView.NoMatchingText);
    await NetworkView.tapClearSearch();
    await NetworkView.SearchNetworkName(SHORT_HAND_NETWORK_TEXT);
    await NetworkView.tapNetworkByName(
      Networks.Arbitrum.providerConfig.nickname,
    );
    await NetworkView.tapDeleteButton();
    await Assertions.checkIfElementNotToHaveText(
      Matchers.getElementByText(Networks.Arbitrum.providerConfig.nickname),
      Networks.Arbitrum.providerConfig.nickname,
    );
  });

  //   it('should dismiss network education modal', async () => {
  //     await NetworkEducationModal.isVisible();
  //     await NetworkEducationModal.isNetworkNameCorrect(
  //       Networks.Gnosis.providerConfig.nickname,
  //     );
  //     await NetworkEducationModal.tapGotItButton();
  //     await NetworkEducationModal.isNotVisible();
  //   });
});
