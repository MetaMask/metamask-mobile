import { RegressionAccounts } from '../../../tags.js';
import TestHelpers from '../../../helpers.js';
import Assertions from '../../../../tests/framework/Assertions';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import SettingsView from '../../../pages/Settings/SettingsView';
import { loginToApp } from '../../../viewHelper';
import AesCryptoTestForm from '../../../pages/Settings/AesCryptoTestForm';
import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';

describe(
  RegressionAccounts(
    'AES Crypto - Encryption and decryption with encryption key',
  ),
  () => {
    const PASSWORD_ONE = '123123123';
    const PASSWORD_TWO = '456456456';
    const SALT_ONE = 'ZDuWAyf5kcDxVvMgVaoyzJNB9kP3Ykdq8DSx8rR/+ro=';
    const SALT_TWO = 'avJ8b37znYTLyeCL0sNxkYxctQrfUdFKoK7SeqC3JSU=';
    const DATA_TO_ENCRYPT_ONE = 'random data to encrypt';
    const DATA_TO_ENCRYPT_TWO = 'more random data to encrypt';
    const ADDRESS = '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3';

    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.reverseServerPort();
    });

    it('encrypts and decrypts using encryption key', async () => {
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

          await Assertions.expectElementToHaveText(
            AesCryptoTestForm.accountAddress,
            ADDRESS,
            {
              description: `Account address should match ${ADDRESS}`,
            },
          );

          let encryptionKey = await AesCryptoTestForm.generateEncryptionKey(
            PASSWORD_ONE,
            SALT_ONE,
          );
          await AesCryptoTestForm.encryptWithKey(
            encryptionKey,
            DATA_TO_ENCRYPT_ONE,
          );
          await AesCryptoTestForm.decryptWithKey(encryptionKey);

          await Assertions.expectElementToHaveLabel(
            AesCryptoTestForm.decryptWithKeyResponse,
            DATA_TO_ENCRYPT_ONE,
            {
              description: `Decrypted data should match ${DATA_TO_ENCRYPT_ONE}`,
            },
          );

          await AesCryptoTestForm.scrollUpToGenerateEncryptionKey();
          encryptionKey = await AesCryptoTestForm.generateEncryptionKey(
            PASSWORD_TWO,
            SALT_TWO,
          );
          await AesCryptoTestForm.encryptWithKey(
            encryptionKey,
            DATA_TO_ENCRYPT_TWO,
          );
          await AesCryptoTestForm.decryptWithKey(encryptionKey);
          await Assertions.expectElementToHaveLabel(
            AesCryptoTestForm.decryptWithKeyResponse,
            DATA_TO_ENCRYPT_TWO,
            {
              description: `Decrypted data should match ${DATA_TO_ENCRYPT_TWO}`,
            },
          );
        },
      );
    });
  },
);
