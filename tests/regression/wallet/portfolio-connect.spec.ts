import { RegressionNetworkAbstractions } from '../../tags';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../page-objects/viewHelper.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import WalletView from '../../page-objects/wallet/WalletView';
import BrowserView from '../../page-objects/Browser/BrowserView';
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
