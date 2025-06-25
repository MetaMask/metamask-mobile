import { SmokeNetworkExpansion } from '../../../tags';
import TestHelpers from '../../../helpers';
import Assertions from '../../../utils/Assertions';

import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import SettingsView from '../../../pages/Settings/SettingsView';
import { loginToApp } from '../../../viewHelper';
import AesCryptoTestForm from '../../../pages/Settings/AesCryptoTestForm';

import FixtureBuilder from '../../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../../fixtures/utils';
import FixtureServer from '../../../fixtures/fixture-server';

const fixtureServer = new FixtureServer();

describe(SmokeNetworkExpansion('AES Crypto - Salt generation'), () => {
  const SALT_BYTES_COUNT = 32;

  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('generates random salt', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.scrollToAesCryptoButton();
    await SettingsView.tapAesCryptoTestForm();

    let currentSalt;
    let previousSalt;

    // Validate that the first generated salt is created correctly
    currentSalt = await AesCryptoTestForm.generateSalt(
      SALT_BYTES_COUNT.toString(),
    );
    await Assertions.checkIfVisible(AesCryptoTestForm.generateSaltResponse);

    // Validate that subsequent salts are different from the previous ones
    for (let count = 0; count < 5; count++) {
      previousSalt = currentSalt;
      currentSalt = await AesCryptoTestForm.generateSalt(
        SALT_BYTES_COUNT.toString(),
      );
      await Assertions.checkIfElementDoesNotHaveLabel(
        AesCryptoTestForm.generateSaltResponse,
        previousSalt,
      );
    }
  });
});
