import { RegressionNetworkAbstractions } from '../../tags';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import WalletView from '../../pages/wallet/WalletView';
import BrowserView from '../../pages/Browser/BrowserView';
import Assertions from '../../framework/Assertions';

describe(
  RegressionNetworkAbstractions('Connect account to Portfolio'),
  (): void => {
    it('should close all browser tabs', async (): Promise<void> => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withKeyringController()
            .withSeedphraseBackedUpDisabled()
            .build(),
          restartDevice: true,
        },
        async (): Promise<void> => {
          await loginToApp();
          await Assertions.expectElementToBeVisible(WalletView.container);
          await TabBarComponent.tapBrowser();
          await BrowserView.tapOpenAllTabsButton();
          await BrowserView.tapCloseTabsButton();
          await Assertions.expectElementToBeVisible(BrowserView.noTabsMessage);
        },
      );
    });
  },
);
