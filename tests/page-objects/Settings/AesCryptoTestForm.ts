import {
  aesCryptoFormInputs,
  aesCryptoFormResponses,
  aesCryptoFormButtons,
  aesCryptoFormScrollIdentifier,
  accountAddress,
  responseText,
} from '../../../app/components/Views/AesCryptoTestForm/AesCrypto.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';
import { type AppiumElement, type ScrollContainer } from '../../framework';

class AesCryptoTestForm {
  get scrollViewIdentifier(): ScrollContainer {
    return Matchers.scrollContainer(aesCryptoFormScrollIdentifier);
  }

  // Get account address
  get accountAddress(): Promise<AppiumElement> {
    return Matchers.getElementByID(accountAddress);
  }

  // Get response text
  get responseText(): Promise<AppiumElement> {
    return Matchers.getElementByID(responseText);
  }

  // Generate salt getters
  get generateSaltBytesCountInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(aesCryptoFormInputs.saltBytesCountInput);
  }
  get generateSaltResponse(): Promise<AppiumElement> {
    return Matchers.getElementByID(aesCryptoFormResponses.saltResponse);
  }

  get generateSaltButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(aesCryptoFormButtons.generateSaltButton);
  }

  // Generate encryption key from password getters
  get generateEncryptionKeyPasswordInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(aesCryptoFormInputs.passwordInput);
  }
  get generateEncryptionKeySaltInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      aesCryptoFormInputs.saltInputForEncryptionKey,
    );
  }
  get generateEncryptionKeyResponse(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      aesCryptoFormResponses.generateEncryptionKeyResponse,
    );
  }
  get generateEncryptionKeyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      aesCryptoFormButtons.generateEncryptionKeyButton,
    );
  }

  // Encrypt getters
  get encryptDataInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(aesCryptoFormInputs.dataInputForEncryption);
  }
  get encryptPasswordInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      aesCryptoFormInputs.passwordInputForEncryption,
    );
  }
  get encryptResponse(): Promise<AppiumElement> {
    return Matchers.getElementByID(aesCryptoFormResponses.encryptionResponse);
  }
  get encryptButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(aesCryptoFormButtons.encryptButton);
  }

  // Decrypt getters
  get decryptPasswordInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      aesCryptoFormInputs.passwordInputForDecryption,
    );
  }
  get decryptResponse(): Promise<AppiumElement> {
    return Matchers.getElementByID(aesCryptoFormResponses.decryptionResponse);
  }
  get decryptButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(aesCryptoFormButtons.decryptButton);
  }

  // Encrypt with key getters
  get encryptWithKeyEncryptionKeyInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      aesCryptoFormInputs.encryptionKeyInputForEncryptionWithKey,
    );
  }
  get encryptWithKeyDataInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      aesCryptoFormInputs.dataInputForEncryptionWithKey,
    );
  }
  get encryptWithKeyResponse(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      aesCryptoFormResponses.encryptionWithKeyResponse,
    );
  }
  get encryptWithKeyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(aesCryptoFormButtons.encryptWithKeyButton);
  }

  // Decrypt with key getters
  get decryptWithKeyEncryptionKeyInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      aesCryptoFormInputs.encryptionKeyInputForDecryptionWithKey,
    );
  }
  get decryptWithKeyResponse(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      aesCryptoFormResponses.decryptionWithKeyResponse,
    );
  }
  get decryptWithKeyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(aesCryptoFormButtons.decryptWithKeyButton);
  }

  async scrollUpToGenerateSalt(): Promise<void> {
    await Gestures.scrollToElement(
      this.generateSaltBytesCountInput,
      this.scrollViewIdentifier,
      {
        direction: 'up',
      },
    );
  }

  async scrollUpToGenerateEncryptionKey(): Promise<void> {
    await Gestures.scrollToElement(
      this.generateEncryptionKeyPasswordInput,
      this.scrollViewIdentifier,
      {
        direction: 'up',
      },
    );
  }

  async scrollToEncrypt(): Promise<void> {
    await Gestures.scrollToElement(
      this.encryptButton,
      this.scrollViewIdentifier,
    );
  }

  async scrollToDecrypt(): Promise<void> {
    await Gestures.scrollToElement(
      this.decryptButton,
      this.scrollViewIdentifier,
      {
        delay: 1000,
      },
    );
  }

  async scrollToEncryptWithKey(): Promise<void> {
    await Gestures.scrollToElement(
      this.encryptWithKeyButton,
      this.scrollViewIdentifier,
    );
  }

  async scrollToDecryptWithKey(): Promise<void> {
    await Gestures.scrollToElement(
      this.decryptWithKeyButton,
      this.scrollViewIdentifier,
      {
        delay: 1000,
      },
    );
  }

  async generateSalt(saltBytesCount: string): Promise<string> {
    await this.scrollUpToGenerateSalt();
    await Gestures.typeText(this.generateSaltBytesCountInput, saltBytesCount, {
      hideKeyboard: true,
      elemDescription: 'Generate Salt Bytes Count Input',
    });
    await Gestures.waitAndTap(this.generateSaltButton, {
      elemDescription: 'Generate Salt Button',
    });

    return Utilities.getElementText(this.generateSaltResponse);
  }

  async generateEncryptionKey(password: string, salt: string): Promise<string> {
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
    await Gestures.waitAndTap(this.generateEncryptionKeyResponse, {
      elemDescription: 'Generate Encryption Key Response',
    });

    return Utilities.getElementText(this.generateEncryptionKeyResponse);
  }

  async encrypt(data: string, encryptionKey: string): Promise<void> {
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

  async decrypt(encryptionKey: string): Promise<void> {
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

  async encryptWithKey(encryptionKey: string, data: string): Promise<void> {
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

  async decryptWithKey(encryptionKey: string): Promise<void> {
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
