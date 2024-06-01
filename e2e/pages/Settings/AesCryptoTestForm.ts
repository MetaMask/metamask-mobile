import {
  aesCryptoFormInputs,
  aesCryptoFormResponses,
  aesCryptoFormButtons,
} from '../../selectors/AesCrypto.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class AesCryptoTestForm {
  // Generate salt getters
  get generateSaltBytesCountInput() {
    return Matchers.getElementByID(aesCryptoFormInputs.saltBytesCountInput);
  }
  get generateSaltResponse() {
    return Matchers.getElementByID(aesCryptoFormResponses.saltResponse);
  }
  get generateSaltButton() {
    return Matchers.getElementByID(aesCryptoFormButtons.generateSaltButton);
  }

  // Generate encryption key from password getters
  get generateEncryptionKeyPasswordInput() {
    return Matchers.getElementByID(aesCryptoFormInputs.passwordInput);
  }
  get generateEncryptionKeySaltInput() {
    return Matchers.getElementByID(
      aesCryptoFormInputs.saltInputForEncryptionKey,
    );
  }
  get generateEncryptionKeyResponse() {
    return Matchers.getElementByID(
      aesCryptoFormResponses.generateEncryptionKeyResponse,
    );
  }
  get generateEncryptionKeyButton() {
    return Matchers.getElementByID(
      aesCryptoFormButtons.generateEncryptionKeyButton,
    );
  }

  // Encrypt getters
  get encryptDataInput() {
    return Matchers.getElementByID(aesCryptoFormInputs.dataInputForEncryption);
  }
  get encryptEncryptionKeyInput() {
    return Matchers.getElementByID(
      aesCryptoFormInputs.encryptionKeyInputForEncryption,
    );
  }
  get encryptIvInput() {
    return Matchers.getElementByID(aesCryptoFormInputs.ivInputForEncryption);
  }
  get encryptResponse() {
    return Matchers.getElementByID(aesCryptoFormResponses.encryptionResponse);
  }
  get encryptButton() {
    return Matchers.getElementByID(aesCryptoFormButtons.encryptButton);
  }

  // Decrypt getters
  get decryptDataInput() {
    return Matchers.getElementByID(aesCryptoFormInputs.dataInputForDecryption);
  }
  get decryptEncryptionKeyInput() {
    return Matchers.getElementByID(
      aesCryptoFormInputs.encryptionKeyInputForDecryption,
    );
  }
  get decryptIvInput() {
    return Matchers.getElementByID(aesCryptoFormInputs.ivInputForDecryption);
  }
  get decryptResponse() {
    return Matchers.getElementByID(aesCryptoFormResponses.decryptionResponse);
  }
  get decryptButton() {
    return Matchers.getElementByID(aesCryptoFormButtons.decryptButton);
  }

  // Encrypt with key getters
  get encryptWithKeyEncryptionKeyInput() {
    return Matchers.getElementByID(
      aesCryptoFormInputs.encryptionKeyInputForEncryptionWithKey,
    );
  }
  get encryptWithKeyDataInput() {
    return Matchers.getElementByID(
      aesCryptoFormInputs.dataInputForEncryptionWithKey,
    );
  }
  get encryptWithKeyResponse() {
    return Matchers.getElementByID(
      aesCryptoFormResponses.encryptionWithKeyResponse,
    );
  }
  get encryptWithKeyButton() {
    return Matchers.getElementByID(aesCryptoFormButtons.encryptWithKeyButton);
  }

  // Decrypt with key getters
  get decryptWithKeyEncryptionKeyInput() {
    return Matchers.getElementByID(
      aesCryptoFormInputs.encryptionKeyInputForDecryptionWithKey,
    );
  }
  get decryptWithKeyEncryptedDataInput() {
    return Matchers.getElementByID(
      aesCryptoFormInputs.encryptedDataInputForDecryptionWithKey,
    );
  }
  get decryptWithKeyResponse() {
    return Matchers.getElementByID(
      aesCryptoFormResponses.decryptionWithKeyResponse,
    );
  }
  get decryptWithKeyButton() {
    return Matchers.getElementByID(aesCryptoFormButtons.decryptWithKeyButton);
  }

  async generateSalt(saltBytesCount: string): Promise<string> {
    await Gestures.typeTextAndHideKeyboard(
      this.generateSaltBytesCountInput,
      saltBytesCount,
    );
    await Gestures.waitAndTap(this.generateSaltButton);
    return await this.generateSaltResponse.getText();
  }
}

export default AesCryptoTestForm;
