import {
  aesCryptoFormInputs,
  aesCryptoFormResponses,
  aesCryptoFormButtons,
  aesCryptoFormScrollIdentifier,
  accountAddress,
  responseText,
} from '../../../app/components/Views/AesCryptoTestForm/AesCrypto.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AesCryptoTestForm {
  get scrollViewIdentifier(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(aesCryptoFormScrollIdentifier);
  }

  // Get account address
  get accountAddress(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(accountAddress),
      appium: () => PlaywrightMatchers.getElementById(accountAddress),
    });
  }

  // Get response text
  get responseText(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(responseText),
      appium: () => PlaywrightMatchers.getElementById(responseText),
    });
  }

  // Generate salt getters
  get generateSaltBytesCountInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(aesCryptoFormInputs.saltBytesCountInput),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormInputs.saltBytesCountInput,
        ),
    });
  }
  get generateSaltResponse(): Promise<IndexableNativeElement> {
    return Matchers.getElementByID(aesCryptoFormResponses.saltResponse);
  }

  get generateSaltButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(aesCryptoFormButtons.generateSaltButton),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormButtons.generateSaltButton,
        ),
    });
  }

  // Generate encryption key from password getters
  get generateEncryptionKeyPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(aesCryptoFormInputs.passwordInput),
      appium: () =>
        PlaywrightMatchers.getElementById(aesCryptoFormInputs.passwordInput),
    });
  }
  get generateEncryptionKeySaltInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(aesCryptoFormInputs.saltInputForEncryptionKey),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormInputs.saltInputForEncryptionKey,
        ),
    });
  }
  get generateEncryptionKeyResponse(): Promise<IndexableNativeElement> {
    return Matchers.getElementByID(
      aesCryptoFormResponses.generateEncryptionKeyResponse,
    );
  }
  get generateEncryptionKeyButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          aesCryptoFormButtons.generateEncryptionKeyButton,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormButtons.generateEncryptionKeyButton,
        ),
    });
  }

  // Encrypt getters
  get encryptDataInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(aesCryptoFormInputs.dataInputForEncryption),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormInputs.dataInputForEncryption,
        ),
    });
  }
  get encryptPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(aesCryptoFormInputs.passwordInputForEncryption),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormInputs.passwordInputForEncryption,
        ),
    });
  }
  get encryptResponse(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(aesCryptoFormResponses.encryptionResponse),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormResponses.encryptionResponse,
        ),
    });
  }
  get encryptButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(aesCryptoFormButtons.encryptButton),
      appium: () =>
        PlaywrightMatchers.getElementById(aesCryptoFormButtons.encryptButton),
    });
  }

  // Decrypt getters
  get decryptPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(aesCryptoFormInputs.passwordInputForDecryption),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormInputs.passwordInputForDecryption,
        ),
    });
  }
  get decryptResponse(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(aesCryptoFormResponses.decryptionResponse),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormResponses.decryptionResponse,
        ),
    });
  }
  get decryptButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(aesCryptoFormButtons.decryptButton),
      appium: () =>
        PlaywrightMatchers.getElementById(aesCryptoFormButtons.decryptButton),
    });
  }

  // Encrypt with key getters
  get encryptWithKeyEncryptionKeyInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          aesCryptoFormInputs.encryptionKeyInputForEncryptionWithKey,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormInputs.encryptionKeyInputForEncryptionWithKey,
        ),
    });
  }
  get encryptWithKeyDataInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          aesCryptoFormInputs.dataInputForEncryptionWithKey,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormInputs.dataInputForEncryptionWithKey,
        ),
    });
  }
  get encryptWithKeyResponse(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          aesCryptoFormResponses.encryptionWithKeyResponse,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormResponses.encryptionWithKeyResponse,
        ),
    });
  }
  get encryptWithKeyButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(aesCryptoFormButtons.encryptWithKeyButton),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormButtons.encryptWithKeyButton,
        ),
    });
  }

  // Decrypt with key getters
  get decryptWithKeyEncryptionKeyInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          aesCryptoFormInputs.encryptionKeyInputForDecryptionWithKey,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormInputs.encryptionKeyInputForDecryptionWithKey,
        ),
    });
  }
  get decryptWithKeyResponse(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          aesCryptoFormResponses.decryptionWithKeyResponse,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormResponses.decryptionWithKeyResponse,
        ),
    });
  }
  get decryptWithKeyButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(aesCryptoFormButtons.decryptWithKeyButton),
      appium: () =>
        PlaywrightMatchers.getElementById(
          aesCryptoFormButtons.decryptWithKeyButton,
        ),
    });
  }

  async scrollUpToGenerateSalt(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.generateSaltBytesCountInput,
      this.scrollViewIdentifier,
      {
        direction: 'up',
      },
    );
  }

  async scrollUpToGenerateEncryptionKey(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.generateEncryptionKeyPasswordInput,
      this.scrollViewIdentifier,
      {
        direction: 'up',
      },
    );
  }

  async scrollToEncrypt(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.encryptButton,
      this.scrollViewIdentifier,
    );
  }

  async scrollToDecrypt(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.decryptButton,
      this.scrollViewIdentifier,
      {
        delay: 1000,
      },
    );
  }

  async scrollToEncryptWithKey(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.encryptWithKeyButton,
      this.scrollViewIdentifier,
    );
  }

  async scrollToDecryptWithKey(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.decryptWithKeyButton,
      this.scrollViewIdentifier,
      {
        delay: 1000,
      },
    );
  }

  async generateSalt(saltBytesCount: string): Promise<string> {
    await this.scrollUpToGenerateSalt();
    await UnifiedGestures.typeText(
      this.generateSaltBytesCountInput,
      saltBytesCount,
      {
        hideKeyboard: true,
        elemDescription: 'Generate Salt Bytes Count Input',
      },
    );
    await UnifiedGestures.waitAndTap(this.generateSaltButton, {
      elemDescription: 'Generate Salt Button',
    });

    const responseFieldAtts = await (
      await this.generateSaltResponse
    ).getAttributes();

    return (responseFieldAtts as { label: string }).label;
  }

  async generateEncryptionKey(password: string, salt: string): Promise<string> {
    await this.scrollUpToGenerateEncryptionKey();
    await UnifiedGestures.typeText(
      this.generateEncryptionKeyPasswordInput,
      password,
      {
        hideKeyboard: true,
        elemDescription: 'Generate Encryption Key Password Input',
      },
    );
    await UnifiedGestures.typeText(this.generateEncryptionKeySaltInput, salt, {
      hideKeyboard: true,
      elemDescription: 'Generate Encryption Key Salt Input',
    });

    await UnifiedGestures.waitAndTap(this.generateEncryptionKeyButton, {
      elemDescription: 'Generate Encryption Key Button',
    });
    await UnifiedGestures.waitAndTap(this.generateEncryptionKeyResponse, {
      elemDescription: 'Generate Encryption Key Response',
    });

    const responseFieldAtts = await (
      await this.generateEncryptionKeyResponse
    ).getAttributes();

    return (responseFieldAtts as { label: string }).label;
  }

  async encrypt(data: string, encryptionKey: string): Promise<void> {
    await this.scrollToEncrypt();
    await UnifiedGestures.typeText(this.encryptDataInput, data, {
      hideKeyboard: true,
      elemDescription: 'Encrypt Data Input',
    });
    await UnifiedGestures.typeText(this.encryptPasswordInput, encryptionKey, {
      hideKeyboard: true,
      elemDescription: 'Encrypt Password Input',
    });
    await UnifiedGestures.waitAndTap(this.encryptButton, {
      elemDescription: 'Encrypt Button',
    });
  }

  async decrypt(encryptionKey: string): Promise<void> {
    await this.scrollToDecrypt();
    await UnifiedGestures.typeText(this.decryptPasswordInput, encryptionKey, {
      hideKeyboard: true,
      elemDescription: 'Decrypt Password Input',
    });
    await this.scrollToDecrypt();
    await UnifiedGestures.waitAndTap(this.decryptButton, {
      elemDescription: 'Decrypt Button',
    });
  }

  async encryptWithKey(encryptionKey: string, data: string): Promise<void> {
    await this.scrollToEncryptWithKey();
    await UnifiedGestures.typeText(
      this.encryptWithKeyEncryptionKeyInput,
      encryptionKey,
      {
        hideKeyboard: true,
        elemDescription: 'Encrypt With Key Encryption Key Input',
      },
    );
    await UnifiedGestures.typeText(this.encryptWithKeyDataInput, data, {
      hideKeyboard: true,
      elemDescription: 'Encrypt With Key Data Input',
    });
    await UnifiedGestures.waitAndTap(this.encryptWithKeyButton, {
      elemDescription: 'Encrypt With Key Button',
    });
  }

  async decryptWithKey(encryptionKey: string): Promise<void> {
    await this.scrollToDecryptWithKey();
    await UnifiedGestures.typeText(
      this.decryptWithKeyEncryptionKeyInput,
      encryptionKey,
      {
        hideKeyboard: true,
        elemDescription: 'Decrypt With Key Encryption Key Input',
      },
    );
    await UnifiedGestures.waitAndTap(this.decryptWithKeyButton, {
      elemDescription: 'Decrypt With Key Button',
    });
  }
}

export default new AesCryptoTestForm();
