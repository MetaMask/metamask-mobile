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
  SmokeAccounts('AES Crypto - Encryption and decryption with encryption key'),
  () => {
    const PASSWORD_ONE = '123123123';
    // const PASSWORD_TWO = '456456456';
    const SALT_ONE = 'ZDuWAyf5kcDxVvMgVaoyzJNB9kP3Ykdq8DSx8rR/+ro=';
    // const SALT_TWO = 'avJ8b37znYTLyeCL0sNxkYxctQrfUdFKoK7SeqC3JSU=';
    const DATA_TO_ENCRYPT_ONE = 'random data to encrypt';
    // const DATA_TO_ENCRYPT_TWO = 'more random data to encrypt';

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

    it('encrypts and decrypts using encryption key', async () => {
      await TabBarComponent.tapSettings();
      await SettingsView.scrollToAesCryptoButton();
      await SettingsView.tapAesCryptoTestForm();

      // Assert the address derived from SRP
      await Assertions.checkIfElementToHaveText(
        AesCryptoTestForm.accountAddress,
        '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      );

      const encryptionKey = await AesCryptoTestForm.generateEncryptionKey(
        PASSWORD_ONE,
        SALT_ONE,
      );
      await AesCryptoTestForm.encryptWithKey(
        encryptionKey,
        DATA_TO_ENCRYPT_ONE,
      );
      await AesCryptoTestForm.decryptWithKey(encryptionKey);
      await Assertions.checkIfElementHasLabel(
        AesCryptoTestForm.decryptWithKeyResponse,
        DATA_TO_ENCRYPT_ONE,
      );

      // await AesCryptoTestForm.scrollUpToGenerateEncryptionKey();
      // encryptionKey = await AesCryptoTestForm.generateEncryptionKey(
      //   PASSWORD_TWO,
      //   SALT_TWO,
      // );
      // await AesCryptoTestForm.encryptWithKey(
      //   encryptionKey,
      //   DATA_TO_ENCRYPT_TWO,
      // );
      // await AesCryptoTestForm.decryptWithKey(encryptionKey);
      // await Assertions.checkIfElementHasLabel(
      //   AesCryptoTestForm.decryptWithKeyResponse,
      //   DATA_TO_ENCRYPT_TWO,
      // );
    });
  },
);
