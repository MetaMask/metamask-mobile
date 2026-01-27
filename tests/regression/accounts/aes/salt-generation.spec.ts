import { RegressionAccounts } from '../../../../e2e/tags';
import TestHelpers from '../../../../e2e/helpers';
import Assertions from '../../../framework/Assertions.ts';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent.ts';
import SettingsView from '../../../../e2e/pages/Settings/SettingsView.ts';
import { loginToApp } from '../../../../e2e/viewHelper.ts';
import AesCryptoTestForm from '../../../../e2e/pages/Settings/AesCryptoTestForm.ts';

import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.ts';

describe(RegressionAccounts('AES Crypto - Salt generation'), () => {
  const SALT_BYTES_COUNT = 32;

  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('generates random salt', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapSettings();
        await SettingsView.scrollToAesCryptoButton();
        await SettingsView.tapAesCryptoTestForm();

        let currentSalt;
        let previousSalt;

        // Validate that the first generated salt is created correctly
        currentSalt = await AesCryptoTestForm.generateSalt(
          SALT_BYTES_COUNT.toString(),
        );
        await Assertions.expectElementToBeVisible(
          AesCryptoTestForm.generateSaltResponse,
        );

        // Validate that subsequent salts are different from the previous ones
        for (let count = 0; count < 5; count++) {
          previousSalt = currentSalt;
          currentSalt = await AesCryptoTestForm.generateSalt(
            SALT_BYTES_COUNT.toString(),
          );
          await Assertions.expectElementToNotHaveText(
            AesCryptoTestForm.generateSaltResponse,
            previousSalt,
          );
        }
      },
    );
  });
});
