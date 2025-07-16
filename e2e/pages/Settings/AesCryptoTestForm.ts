import {
  aesCryptoFormInputs,
  aesCryptoFormResponses,
  aesCryptoFormButtons,
  aesCryptoFormScrollIdentifier,
  accountAddress,
  responseText,
} from '../../selectors/Settings/AesCrypto.selectors.ts';
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

  // Get response text
  get responseText() {
    return Matchers.getElementByID(responseText);
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
      {
        direction: 'up',
      },
    );
  }

  async scrollUpToGenerateEncryptionKey() {
    await Gestures.scrollToElement(
      this.generateEncryptionKeyPasswordInput,
      this.scrollViewIdentifier,
      {
        direction: 'up',
      },
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

  async generateSalt(saltBytesCount: string) {
    await this.scrollUpToGenerateSalt();
    await Gestures.typeText(this.generateSaltBytesCountInput, saltBytesCount, {
      hideKeyboard: true,
      elemDescription: 'Generate Salt Bytes Count Input',
    });
    await Gestures.waitAndTap(this.generateSaltButton, {
      elemDescription: 'Generate Salt Button',
    });

    const responseFieldAtts = await (
      await this.generateSaltResponse
    ).getAttributes();

    // @ts-expect-error - the label property does exist in this object.
    return responseFieldAtts.label;
  }

  async generateEncryptionKey(password: string, salt: string) {
    await this.scrollUpToGenerateEncryptionKey();
    await Gestures.typeText(this.generateEncryptionKeyPasswordInput, password, {
      hideKeyboard: true,
      elemDescription: 'Generate Encryption Key Password Input',
    });
    await Gestures.typeText(this.generateEncryptionKeySaltInput, salt, {
      hideKeyboard: true,
      elemDescription: 'Generate Encryption Key Salt Input',
    });

    await Gestures.waitAndTap(this.generateEncryptionKeyButton, {
      elemDescription: 'Generate Encryption Key Button',
    });
    // todo: can remove?
    await Gestures.waitAndTap(this.generateEncryptionKeyResponse, {
      elemDescription: 'Generate Encryption Key Response',
    });

    const responseFieldAtts = await (
      await this.generateEncryptionKeyResponse
    ).getAttributes();

    // @ts-expect-error - the label property does exist in this object.
    return responseFieldAtts.label;
  }

  async encrypt(data: string, encryptionKey: string) {
    await this.scrollToEncrypt();
    await Gestures.typeText(this.encryptDataInput, data, {
      hideKeyboard: true,
      elemDescription: 'Encrypt Data Input',
    });
    await Gestures.typeText(this.encryptPasswordInput, encryptionKey, {
      hideKeyboard: true,
      elemDescription: 'Encrypt Password Input',
    });
    await Gestures.waitAndTap(this.encryptButton, {
      elemDescription: 'Encrypt Button',
    });
  }

  async decrypt(encryptionKey: string) {
    await this.scrollToDecrypt();
    await Gestures.typeText(this.decryptPasswordInput, encryptionKey, {
      hideKeyboard: true,
      elemDescription: 'Decrypt Password Input',
    });
    await this.scrollToDecrypt();
    await Gestures.waitAndTap(this.decryptButton, {
      elemDescription: 'Decrypt Button',
    });
  }

  async encryptWithKey(encryptionKey: string, data: string) {
    await this.scrollToEncryptWithKey();
    await Gestures.typeText(
      this.encryptWithKeyEncryptionKeyInput,
      encryptionKey,
      {
        hideKeyboard: true,
        elemDescription: 'Encrypt With Key Encryption Key Input',
      },
    );
    await Gestures.typeText(this.encryptWithKeyDataInput, data, {
      hideKeyboard: true,
      elemDescription: 'Encrypt With Key Data Input',
    });
    await Gestures.waitAndTap(this.encryptWithKeyButton, {
      elemDescription: 'Encrypt With Key Button',
    });
  }

  async decryptWithKey(encryptionKey: string) {
    await this.scrollToDecryptWithKey();
    await Gestures.typeText(
      this.decryptWithKeyEncryptionKeyInput,
      encryptionKey,
      {
        hideKeyboard: true,
        elemDescription: 'Decrypt With Key Encryption Key Input',
      },
    );
    await Gestures.waitAndTap(this.decryptWithKeyButton, {
      elemDescription: 'Decrypt With Key Button',
    });
  }
}

export default new AesCryptoTestForm();
