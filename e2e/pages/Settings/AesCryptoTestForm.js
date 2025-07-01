import {
  aesCryptoFormInputs,
  aesCryptoFormResponses,
  aesCryptoFormButtons,
  aesCryptoFormScrollIdentifier,
  accountAddress,
} from '../../selectors/Settings/AesCrypto.selectors';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

class AesCryptoTestForm {
  get scrollViewIdentifier() {
    return Matchers.getIdentifier(aesCryptoFormScrollIdentifier);
  }

  // Get account address
  get accountAddress() {
    return Matchers.getElementByID(accountAddress);
  }

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
  get encryptPasswordInput() {
    return Matchers.getElementByID(
      aesCryptoFormInputs.passwordInputForEncryption,
    );
  }
  get encryptResponse() {
    return Matchers.getElementByID(aesCryptoFormResponses.encryptionResponse);
  }
  get encryptButton() {
    return Matchers.getElementByID(aesCryptoFormButtons.encryptButton);
  }

  // Decrypt getters
  get decryptPasswordInput() {
    return Matchers.getElementByID(
      aesCryptoFormInputs.passwordInputForDecryption,
    );
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
  get decryptWithKeyResponse() {
    return Matchers.getElementByID(
      aesCryptoFormResponses.decryptionWithKeyResponse,
    );
  }
  get decryptWithKeyButton() {
    return Matchers.getElementByID(aesCryptoFormButtons.decryptWithKeyButton);
  }

  async scrollUpToGenerateSalt() {
    await Gestures.scrollToElement(
      this.generateSaltBytesCountInput,
      this.scrollViewIdentifier,
      'up',
    );
  }

  async scrollUpToGenerateEncryptionKey() {
    await Gestures.scrollToElement(
      this.generateEncryptionKeyPasswordInput,
      this.scrollViewIdentifier,
      'up',
    );
  }

  async scrollToEncrypt() {
    await Gestures.scrollToElement(
      this.encryptButton,
      this.scrollViewIdentifier,
    );
  }

  async scrollToDecrypt() {
    await Gestures.scrollToElement(
      this.decryptButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'AES Form - Decrypt Button',
      }
    );
  }

  async scrollToEncryptWithKey() {
    await Gestures.scrollToElement(
      this.encryptWithKeyButton,
      this.scrollViewIdentifier,
    );
  }

  async scrollToDecryptWithKey() {
    await Gestures.scrollToElement(
      this.decryptWithKeyButton,
      this.scrollViewIdentifier,
    );
  }

  async generateSalt(saltBytesCount) {
    await this.scrollUpToGenerateSalt();
    await Gestures.typeText(
      this.generateSaltBytesCountInput,
      saltBytesCount,
      {
        elemDescription: 'AES Form - Generate Salt Bytes Count Input',
        hideKeyboard: true,
        checkStability: true,
      }
    );
    await Gestures.waitAndTap(this.generateSaltButton, {
      elemDescription: 'AES Form - Generate Salt Button',
      checkStability: true,
    });

    const responseFieldAtts = await (
      await this.generateSaltResponse
    ).getAttributes();

    // @ts-expect-error - the label property does exist in this object.
    return responseFieldAtts.label;
  }

  async generateEncryptionKey(password, salt) {
    await this.scrollUpToGenerateEncryptionKey();
    await Gestures.typeText(
      this.generateEncryptionKeyPasswordInput,
      password,
      {
        elemDescription: 'AES Form - Generate Encryption Key Password Input',
        hideKeyboard: true,
        checkStability: true,
      }
    );
    await Gestures.typeText(
      this.generateEncryptionKeySaltInput,
      salt,
      {
        elemDescription: 'AES Form - Generate Encryption Key Salt Input',
        hideKeyboard: true,
        checkStability: true,
      }
    );
    await Gestures.waitAndTap(this.generateEncryptionKeyButton, {
      elemDescription: 'AES Form - Generate Encryption Key Button',
      checkStability: true,
    });

    await Gestures.waitAndTap(this.generateEncryptionKeyResponse, {
      elemDescription: 'AES Form - Generate Encryption Key Response',
      checkStability: true,
    });

    const responseFieldAtts = await (
      await this.generateEncryptionKeyResponse
    ).getAttributes();

    // @ts-expect-error - the label property does exist in this object.
    return responseFieldAtts.label;
  }

  async encrypt(data, encryptionKey) {
    await this.scrollToEncrypt();
    await Gestures.typeText(this.encryptDataInput, data, {
      hideKeyboard: true,
      elemDescription: 'AES Form - Encrypt Input',
      checkStability: true,
    });

    await Gestures.typeText(
      this.encryptPasswordInput,
      encryptionKey,
      {
        elemDescription: 'AES Form - Encrypt Password Input',
        checkStability: true,
        hideKeyboard: true,
      }
    );
    await Gestures.waitAndTap(this.encryptButton, {
      elemDescription: 'AES Form - Encrypt Button',
      checkStability: true,
    });
  }

  async decrypt(encryptionKey) {
    await this.scrollToDecrypt();
    await Gestures.typeText(
      this.decryptPasswordInput,
      encryptionKey,
      {
        hideKeyboard: true,
        elemDescription: 'AES Form - Decrypt Input',
        checkStability: true,
      }
    );
    await this.scrollToDecrypt();
    await Gestures.waitAndTap(this.decryptButton, {
      elemDescription: 'AES Form - Decrypt Button',
      checkStability: true,
    });
  }

  async encryptWithKey(encryptionKey, data) {
    await this.scrollToEncryptWithKey();
    await Gestures.typeText(
      this.encryptWithKeyEncryptionKeyInput,
      encryptionKey,
      {
        elemDescription: 'AES Form - Encrypt With Key Input',
        hideKeyboard: true,
        checkStability: true,
      }
    );
    await Gestures.typeText(this.encryptWithKeyDataInput, data, {
      elemDescription: 'AES Form - Encrypt With Key Data Input',
      hideKeyboard: true,
      checkStability: true,
    });
    await Gestures.waitAndTap(this.encryptWithKeyButton, {
      elemDescription: 'AES Form - Encrypt With Key Button',
      checkStability: true,
    });
  }

  async decryptWithKey(encryptionKey) {
    await this.scrollToDecryptWithKey();
    await Gestures.typeText(
      this.decryptWithKeyEncryptionKeyInput,
      encryptionKey,
      {
        elemDescription: 'AES Form - Decrypt With Key Input',
        hideKeyboard: true,
        checkStability: true,
      }
    );
    await Gestures.waitAndTap(this.decryptWithKeyButton, {
      elemDescription: 'AES Form - Decrypt With Key Button',
      checkStability: true,
    });
  }
}

export default new AesCryptoTestForm();
