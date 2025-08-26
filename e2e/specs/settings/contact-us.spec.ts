import { RegressionWalletUX } from '../../tags';
import SettingsView from '../../pages/Settings/SettingsView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { loginToApp, navigateToSettings } from '../../viewHelper';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

describe(RegressionWalletUX('Settings'), () => {
  it('Open contact support', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await navigateToSettings();
        await SettingsView.scrollToContactSupportButton();
        await SettingsView.tapContactSupport();

        await Assertions.expectElementToBeVisible(
          SettingsView.contactSupportSectionTitle,
        );
      },
    );
  });
});
