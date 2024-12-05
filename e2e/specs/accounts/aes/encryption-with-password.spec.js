import { SmokeAccounts } from '../../../tags';
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

describe(
  SmokeAccounts('AES Crypto - Encryption and decryption with password'),
  () => {
    const PASSWORD_ONE = '123123123';
    const PASSWORD_TWO = '456456456';
    const DATA_TO_ENCRYPT_ONE = 'random data to encrypt';
    const DATA_TO_ENCRYPT_TWO = 'more random data to encrypt';

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

    it('encrypts and decrypts using password', async () => {
      await TabBarComponent.tapSettings();
      await SettingsView.scrollToAesCryptoButton();
      await SettingsView.tapAesCryptoTestForm();

      await AesCryptoTestForm.encrypt(DATA_TO_ENCRYPT_ONE, PASSWORD_ONE);
      await AesCryptoTestForm.decrypt(PASSWORD_ONE);
      await Assertions.checkIfElementHasLabel(
        AesCryptoTestForm.decryptResponse,
        DATA_TO_ENCRYPT_ONE,
      );

      // encrypt and decrypt with password second piece of data
      await AesCryptoTestForm.encrypt(DATA_TO_ENCRYPT_TWO, PASSWORD_TWO);
      await AesCryptoTestForm.decrypt(PASSWORD_TWO);
      await Assertions.checkIfElementHasLabel(
        AesCryptoTestForm.decryptResponse,
        DATA_TO_ENCRYPT_TWO,
      );
    });
  },
);
