'use strict';
import Browser from '../../pages/Browser/BrowserView';
import TestDApp from '../../pages/Browser/TestDApp';
import { buildPermissions } from '../../fixtures/utils';
import SigningBottomSheet from '../../pages/Browser/SigningBottomSheet';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { RegressionNetworkAbstraction } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import Assertions from '../../utils/Assertions';
import enContent from '../../../locales/languages/en.json';

const MEGAETH_TESTNET = CustomNetworks.MegaTestnet.providerConfig.nickname;

describe(RegressionNetworkAbstraction('MegaETH Testnet Network Signing'), () => {
  const TOKEN_NAME = enContent.unit.megaeth;
  const AMOUNT = '0.0000001';

  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it(`should sign personal message using ${MEGAETH_TESTNET}`, async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x18c6']),
          )
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.scrollToBottomOfNetworkList();
        await NetworkListModal.changeNetworkTo(MEGAETH_TESTNET);
        await NetworkEducationModal.tapGotItButton();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapPersonalSignButton();
        await Assertions.checkIfVisible(SigningBottomSheet.personalRequest);
        await SigningBottomSheet.tapSignButton();
        await Assertions.checkIfNotVisible(SigningBottomSheet.typedRequest);
        await Assertions.checkIfNotVisible(SigningBottomSheet.personalRequest);
      },
    );
  });
});
