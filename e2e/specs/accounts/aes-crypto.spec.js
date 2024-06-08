import { SmokeAccounts } from '../../tags';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import { loginToApp } from '../../viewHelper';
import AesCryptoTestForm from '../../pages/Settings/AesCryptoTestForm';

describe(SmokeAccounts('AES Crypto'), () => {
  const SALT_BYTES_COUNT = 32;
  const PASSWORD_ONE = '123123123';
  const PASSWORD_TWO = '456456456';
  const SALT_ONE = 'ZDuWAyf5kcDxVvMgVaoyzJNB9kP3Ykdq8DSx8rR/+ro=';
  const SALT_TWO = 'avJ8b37znYTLyeCL0sNxkYxctQrfUdFKoK7SeqC3JSU=';
  const DATA_TO_ENCRYPT_ONE = 'random data to encrypt';
  const DATA_TO_ENCRYPT_TWO = 'more random data to encrypt';

  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('generates random salt', async () => {
    const fixture = new FixtureBuilder().build();
    await withFixtures({ fixture, restartDevice: true }, async () => {
      await loginToApp();

      await TabBarComponent.tapSettings();
      await SettingsView.scrollToAesCryptoButton();
      await SettingsView.tapAesCryptoTestForm();

      await AesCryptoTestForm.generateSalt(SALT_BYTES_COUNT.toString());

      await expect(await AesCryptoTestForm.generateSaltResponse).toExist();
    });
  });

  it('encrypts and decrypts using password', async () => {
    const fixture = new FixtureBuilder().build();
    await withFixtures({ fixture, restartDevice: true }, async () => {
      await loginToApp();
      // should go to settings then security & privacy
      await TabBarComponent.tapSettings();
      await SettingsView.scrollToAesCryptoButton();
      await SettingsView.tapAesCryptoTestForm();

      // encrypt and decrypt with password first piece of data
      await AesCryptoTestForm.encrypt(DATA_TO_ENCRYPT_ONE, PASSWORD_ONE);
      await AesCryptoTestForm.decrypt(PASSWORD_ONE);
      await expect(await AesCryptoTestForm.decryptResponse).toHaveLabel(
        DATA_TO_ENCRYPT_ONE,
      );

      // encrypt and decrypt with password second piece of data
      await AesCryptoTestForm.encrypt(DATA_TO_ENCRYPT_TWO, PASSWORD_TWO);
      await AesCryptoTestForm.decrypt(PASSWORD_TWO);
      await expect(await AesCryptoTestForm.decryptResponse).toHaveLabel(
        DATA_TO_ENCRYPT_TWO,
      );
    });
  });

  it('encrypts and decrypts using encryption key', async () => {
    const fixture = new FixtureBuilder().build();
    await withFixtures({ fixture, restartDevice: true }, async () => {
      await loginToApp();
      // should go to settings then security & privacy
      await TabBarComponent.tapSettings();
      await SettingsView.scrollToAesCryptoButton();
      await SettingsView.tapAesCryptoTestForm();

      let encryptionKey;

      // generate new encryption key
      encryptionKey = await AesCryptoTestForm.generateEncryptionKey(
        PASSWORD_ONE,
        SALT_ONE,
      );
      // encrypt and decrypt with password first piece of data
      await AesCryptoTestForm.encryptWithKey(
        encryptionKey,
        DATA_TO_ENCRYPT_ONE,
      );
      await AesCryptoTestForm.decryptWithKey(encryptionKey);
      await expect(await AesCryptoTestForm.decryptWithKeyResponse).toHaveLabel(
        DATA_TO_ENCRYPT_ONE,
      );

      // generate new encryption key
      await AesCryptoTestForm.scrollUpToGenerateEncryptionKey();
      // encrypt and decrypt with password second piece of data
      encryptionKey = await AesCryptoTestForm.generateEncryptionKey(
        PASSWORD_TWO,
        SALT_TWO,
      );
      await AesCryptoTestForm.encryptWithKey(
        encryptionKey,
        DATA_TO_ENCRYPT_TWO,
      );
      await AesCryptoTestForm.decryptWithKey(encryptionKey);
      await expect(await AesCryptoTestForm.decryptWithKeyResponse).toHaveLabel(
        DATA_TO_ENCRYPT_TWO,
      );
    });
  });
});
