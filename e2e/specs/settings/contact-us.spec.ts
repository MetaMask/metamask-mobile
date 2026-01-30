import { RegressionWalletUX } from '../../tags';
import SettingsView from '../../pages/Settings/SettingsView';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../../tests/framework/Assertions';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';

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
