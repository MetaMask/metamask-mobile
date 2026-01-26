import { SmokeAccounts } from '../../../tags';
import TestHelpers from '../../../helpers';
import Assertions from '../../../../tests/framework/Assertions';
import type { IndexableNativeElement } from 'detox/detox';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import SettingsView from '../../../pages/Settings/SettingsView';
import { loginToApp } from '../../../viewHelper';
import AesCryptoTestForm from '../../../pages/Settings/AesCryptoTestForm';
import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';

describe(
  SmokeAccounts('AES Crypto - Encryption and decryption with password'),
  (): void => {
    const PASSWORD_ONE: string = '123123123';
    const PASSWORD_TWO: string = '456456456';
    const DATA_TO_ENCRYPT_ONE: string = 'random data to encrypt';
    const DATA_TO_ENCRYPT_TWO: string = 'more random data to encrypt';

    beforeAll(async (): Promise<void> => {
      jest.setTimeout(150000);
      await TestHelpers.reverseServerPort();
    });

    it('encrypts and decrypts using password', async (): Promise<void> => {
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

          await AesCryptoTestForm.encrypt(DATA_TO_ENCRYPT_ONE, PASSWORD_ONE);
          await Assertions.expectElementToBeVisible(
            AesCryptoTestForm.responseText,
          );
          await AesCryptoTestForm.decrypt(PASSWORD_ONE);
          await Assertions.expectElementToHaveLabel(
            AesCryptoTestForm.decryptResponse as Promise<IndexableNativeElement>,
            DATA_TO_ENCRYPT_ONE,
          );

          // encrypt and decrypt with password second piece of data
          await AesCryptoTestForm.encrypt(DATA_TO_ENCRYPT_TWO, PASSWORD_TWO);
          await AesCryptoTestForm.decrypt(PASSWORD_TWO);
          await Assertions.expectElementToHaveLabel(
            AesCryptoTestForm.decryptResponse as Promise<IndexableNativeElement>,
            DATA_TO_ENCRYPT_TWO,
          );
        },
      );
    });
  },
);
