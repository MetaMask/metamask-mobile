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

const fixtureServer = new FixtureServer();
const SHORT_HAND_NETWORK_TEXT = 'ar';
const INVALID_NETWORK_TEXT = 'cccM';
describe(Regression('Popular Networks'), () => {
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

    // await Assertions.checkIfVisible(NetworkView.networkContainer);
    await NetworkView.tapNetworkByName(
      Networks.Arbitrum.providerConfig.nickname,
    );

    await NetworkApprovalModal.tapApproveButton();
    await NetworkAddedModal.tapCloseButton();
    await NetworkView.closePopularNetwork();
  });

  it('search network list', async () => {
    await NetworkView.SearchNetworkName(INVALID_NETWORK_TEXT);
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
