import { RegressionNetworkAbstractions } from '../../../e2e/tags';
import { loginToApp, navigateToBrowserView } from '../../../e2e/viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import BrowserView from '../../../e2e/pages/Browser/BrowserView';
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
          await navigateToBrowserView();
          await BrowserView.tapOpenAllTabsButton();
          await BrowserView.tapCloseTabsButton();
          await Assertions.expectElementToBeVisible(BrowserView.noTabsMessage);
        },
      );
    });
  },
);
