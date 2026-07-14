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
import { EncapsulatedElementType } from '../../framework';

class AesCryptoTestForm {
  get scrollViewIdentifier(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(aesCryptoFormScrollIdentifier);
  }

  // Get account address
  get accountAddress(): EncapsulatedElementType {
    return Matchers.getElementByID(accountAddress);
  }

  // Get response text
  get responseText(): EncapsulatedElementType {
    return Matchers.getElementByID(responseText);
  }

  // Generate salt getters
  get generateSaltBytesCountInput(): EncapsulatedElementType {
    return Matchers.getElementByID(aesCryptoFormInputs.saltBytesCountInput);
  }
  get generateSaltResponse(): EncapsulatedElementType {
    return Matchers.getElementByID(aesCryptoFormResponses.saltResponse);
  }

  get generateSaltButton(): EncapsulatedElementType {
    return Matchers.getElementByID(aesCryptoFormButtons.generateSaltButton);
  }

  // Generate encryption key from password getters
  get generateEncryptionKeyPasswordInput(): EncapsulatedElementType {
    return Matchers.getElementByID(aesCryptoFormInputs.passwordInput);
  }
  get generateEncryptionKeySaltInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      aesCryptoFormInputs.saltInputForEncryptionKey,
    );
  }
  get generateEncryptionKeyResponse(): EncapsulatedElementType {
    return Matchers.getElementByID(
      aesCryptoFormResponses.generateEncryptionKeyResponse,
    );
  }
  get generateEncryptionKeyButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      aesCryptoFormButtons.generateEncryptionKeyButton,
    );
  }

  // Encrypt getters
  get encryptDataInput(): EncapsulatedElementType {
    return Matchers.getElementByID(aesCryptoFormInputs.dataInputForEncryption);
  }
  get encryptPasswordInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      aesCryptoFormInputs.passwordInputForEncryption,
    );
  }
  get encryptResponse(): EncapsulatedElementType {
    return Matchers.getElementByID(aesCryptoFormResponses.encryptionResponse);
  }
  get encryptButton(): EncapsulatedElementType {
    return Matchers.getElementByID(aesCryptoFormButtons.encryptButton);
  }

  // Decrypt getters
  get decryptPasswordInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      aesCryptoFormInputs.passwordInputForDecryption,
    );
  }
  get decryptResponse(): EncapsulatedElementType {
    return Matchers.getElementByID(aesCryptoFormResponses.decryptionResponse);
  }
  get decryptButton(): EncapsulatedElementType {
    return Matchers.getElementByID(aesCryptoFormButtons.decryptButton);
  }

  // Encrypt with key getters
  get encryptWithKeyEncryptionKeyInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      aesCryptoFormInputs.encryptionKeyInputForEncryptionWithKey,
    );
  }
  get encryptWithKeyDataInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      aesCryptoFormInputs.dataInputForEncryptionWithKey,
    );
  }
  get encryptWithKeyResponse(): EncapsulatedElementType {
    return Matchers.getElementByID(
      aesCryptoFormResponses.encryptionWithKeyResponse,
    );
  }
  get encryptWithKeyButton(): EncapsulatedElementType {
    return Matchers.getElementByID(aesCryptoFormButtons.encryptWithKeyButton);
  }

  // Decrypt with key getters
  get decryptWithKeyEncryptionKeyInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      aesCryptoFormInputs.encryptionKeyInputForDecryptionWithKey,
    );
  }
  get decryptWithKeyResponse(): EncapsulatedElementType {
    return Matchers.getElementByID(
      aesCryptoFormResponses.decryptionWithKeyResponse,
    );
  }
  get decryptWithKeyButton(): EncapsulatedElementType {
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

    const responseFieldAtts = await (
      (await this.generateSaltResponse) as Detox.IndexableNativeElement
    ).getAttributes();

    return (responseFieldAtts as { label: string }).label;
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

    const responseFieldAtts = await (
      (await this.generateEncryptionKeyResponse) as Detox.IndexableNativeElement
    ).getAttributes();

    return (responseFieldAtts as { label: string }).label;
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
