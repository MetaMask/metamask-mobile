import { RegressionAccounts } from '../../../tags';
import TestHelpers from '../../../helpers';
import Assertions from '../../../framework/Assertions';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import SettingsView from '../../../pages/Settings/SettingsView';
import { loginToApp } from '../../../viewHelper';
import AesCryptoTestForm from '../../../pages/Settings/AesCryptoTestForm';

import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';

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
