import { RegressionWalletUX } from '../../../../e2e/tags';
import SettingsView from '../../../../e2e/pages/Settings/SettingsView';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../../e2e/viewHelper';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent';
import Assertions from '../../../framework/Assertions';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';

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
