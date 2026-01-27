import { RegressionWalletUX } from '../../../../e2e/tags';
import SettingsView from '../../../../e2e/pages/Settings/SettingsView.ts';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.ts';
import { loginToApp } from '../../../../e2e/viewHelper.ts';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent.ts';
import Assertions from '../../../framework/Assertions.ts';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.ts';

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
