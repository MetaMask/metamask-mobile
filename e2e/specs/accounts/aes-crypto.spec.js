import { SmokeAccounts } from '../../tags';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';

import TabBarComponent from '../../pages/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import { loginToApp } from '../../viewHelper';
import AesCryptoTestForm from '../../pages/Settings/AesCryptoTestForm';

import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';

const fixtureServer = new FixtureServer();

describe(SmokeAccounts('AES Crypto'), () => {
  const SALT_BYTES_COUNT = 32;
  const PASSWORD_ONE = '123123123';
  const PASSWORD_TWO = '456456456';
  const SALT_ONE = 'ZDuWAyf5kcDxVvMgVaoyzJNB9kP3Ykdq8DSx8rR/+ro=';
  const SALT_TWO = 'avJ8b37znYTLyeCL0sNxkYxctQrfUdFKoK7SeqC3JSU=';
  const DATA_TO_ENCRYPT_ONE = 'random data to encrypt';
  const DATA_TO_ENCRYPT_TWO = 'more random data to encrypt';

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
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

  it('encrypts and decrypts using password', async () => {
    // encrypt and decrypt with password first piece of data
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

  it('encrypts and decrypts using encryption key', async () => {
    // should go to settings then security & privacy

    let encryptionKey;

    // generate new encryption key
    encryptionKey = await AesCryptoTestForm.generateEncryptionKey(
      PASSWORD_ONE,
      SALT_ONE,
    );
    // encrypt and decrypt with password first piece of data
    await AesCryptoTestForm.encryptWithKey(encryptionKey, DATA_TO_ENCRYPT_ONE);
    await AesCryptoTestForm.decryptWithKey(encryptionKey);
    await Assertions.checkIfElementHasLabel(
      AesCryptoTestForm.decryptWithKeyResponse,
      DATA_TO_ENCRYPT_ONE,
    );

    // generate new encryption key
    await AesCryptoTestForm.scrollUpToGenerateEncryptionKey();
    // encrypt and decrypt with password second piece of data
    encryptionKey = await AesCryptoTestForm.generateEncryptionKey(
      PASSWORD_TWO,
      SALT_TWO,
    );
    await AesCryptoTestForm.encryptWithKey(encryptionKey, DATA_TO_ENCRYPT_TWO);
    await AesCryptoTestForm.decryptWithKey(encryptionKey);
    await Assertions.checkIfElementHasLabel(
      AesCryptoTestForm.decryptWithKeyResponse,
      DATA_TO_ENCRYPT_TWO,
    );
  });
});
