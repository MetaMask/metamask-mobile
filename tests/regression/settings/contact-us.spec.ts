import { RegressionWalletUX } from '../../tags';
import SettingsView from '../../page-objects/Settings/SettingsView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../page-objects/viewHelper.ts';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

describe.skip(RegressionWalletUX('Settings'), () => {
  it('Open contact support', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapSettings();
        await SettingsView.scrollToContactSupportButton();
        await SettingsView.tapContactSupport();

        await Assertions.expectElementToBeVisible(
          SettingsView.contactSupportSectionTitle,
        );
      },
    );
  });
});
