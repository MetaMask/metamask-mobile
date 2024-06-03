import { Regression } from '../../tags';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import TabBarComponent from '../../pages/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import { loginToApp } from '../../viewHelper';
import AesCryptoTestForm from '../../pages/Settings/AesCryptoTestForm';

describe(Regression('AES Crypto'), () => {
  const SALT_BYTES_COUNT = 32;
  const PASSWORD = '123123123';
  const SALT = 'ZDuWAyf5kcDxVvMgVaoyzJNB9kP3Ykdq8DSx8rR/+ro=';
  const ENCRYPTION_KEY =
    'a446066c5dfb33db2cfedc266a33102eb452cc64d36aac4c6c3ae086dc00875c';

  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('executes all aes crypto methods successfully', async () => {
    const fixture = new FixtureBuilder().build();
    await withFixtures({ fixture, restartDevice: true }, async () => {
      await loginToApp();
      // should go to settings then security & privacy
      await TabBarComponent.tapSettings();
      await SettingsView.scrollToAesCryptoButton();
      await SettingsView.tapAesCryptoTestForm();

      await AesCryptoTestForm.generateSalt(SALT_BYTES_COUNT.toString());

      // expect(salt.length).toBe(SALT_BYTES_COUNT * 2);

      await AesCryptoTestForm.generateEncryptionKey(PASSWORD, SALT);

      await AesCryptoTestForm.encrypt('random data to encrypt', PASSWORD);

      await AesCryptoTestForm.decrypt(PASSWORD);

      await AesCryptoTestForm.encryptWithKey(
        ENCRYPTION_KEY,
        'more random data to encrypt',
      );

      await AesCryptoTestForm.decryptedWithKey(ENCRYPTION_KEY);
    });
  });
});
