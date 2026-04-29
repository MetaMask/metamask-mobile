import {
  Assertions,
  Gestures,
  Matchers,
  PlaywrightAssertions,
  PlaywrightMatchers,
  UnifiedGestures,
  asDetoxElement,
  asPlaywrightElement,
  encapsulated,
  encapsulatedAction,
  type EncapsulatedElementType,
} from '../../framework';
import { OnboardingSelectorIDs } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import { AccountStatusSelectorIDs } from '../../../app/components/Views/AccountStatus/AccountStatus.testIds';

class SocialLoginView {
  get iosNewUserTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_TITLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_TITLE,
          {
            exact: true,
          },
        ),
    });
  }

  get iosNewUserButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  async isIosNewUserScreenVisible(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(
          asDetoxElement(this.iosNewUserTitle),
          {
            description: 'iOS New User Social Login screen should be visible',
          },
        );
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(this.iosNewUserTitle),
          {
            timeout: 30000,
            description: 'iOS New User Social Login screen should be visible',
          },
        );
      },
    });
  }

  async tapIosNewUserSetPinButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(asDetoxElement(this.iosNewUserButton), {
          elemDescription: 'Set MetaMask PIN button on iOS new user screen',
        });
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.iosNewUserButton, {
          description: 'Set MetaMask PIN button on iOS new user screen',
        });
      },
    });
  }

  get iosExistingUserTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_TITLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_TITLE,
          {
            exact: true,
          },
        ),
    });
  }

  get iosExistingUserButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  async isIosExistingUserScreenVisible(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(
          asDetoxElement(this.iosExistingUserTitle),
          {
            description:
              'iOS Existing User Social Login screen should be visible',
          },
        );
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(this.iosExistingUserTitle),
          {
            timeout: 30000,
            description:
              'iOS Existing User Social Login screen should be visible',
          },
        );
      },
    });
  }

  async tapIosExistingUserSecureWalletButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(asDetoxElement(this.iosExistingUserButton), {
          elemDescription:
            'Secure your wallet button on iOS existing user screen',
        });
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.iosExistingUserButton, {
          description: 'Secure your wallet button on iOS existing user screen',
        });
      },
    });
  }

  get accountFoundContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_CONTAINER,
          {
            exact: true,
          },
        ),
    });
  }

  get accountFoundTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AccountStatusSelectorIDs.ACCOUNT_FOUND_TITLE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_TITLE,
          {
            exact: true,
          },
        ),
    });
  }

  get accountFoundLoginButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  get accountFoundDifferentMethodButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_DIFFERENT_METHOD_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_DIFFERENT_METHOD_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  async isAccountFoundScreenVisible(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(
          asDetoxElement(this.accountFoundContainer),
          {
            description: 'Account Already Exists screen should be visible',
          },
        );
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(this.accountFoundContainer),
          {
            timeout: 30000,
            description: 'Account Already Exists screen should be visible',
          },
        );
      },
    });
  }

  async tapLoginButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(
          asDetoxElement(this.accountFoundLoginButton),
          {
            elemDescription: 'Login button on Account Already Exists screen',
          },
        );
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.accountFoundLoginButton, {
          description: 'Login button on Account Already Exists screen',
        });
      },
    });
  }

  async tapAccountFoundLoginButton(): Promise<void> {
    await this.tapLoginButton();
  }

  get accountNotFoundContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CONTAINER,
          {
            exact: true,
          },
        ),
    });
  }

  get accountNotFoundTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_TITLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_TITLE,
          {
            exact: true,
          },
        ),
    });
  }

  get accountNotFoundCreateButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CREATE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CREATE_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  async isAccountNotFoundScreenVisible(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(
          asDetoxElement(this.accountNotFoundContainer),
          {
            description: 'Account Not Found screen should be visible',
          },
        );
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(this.accountNotFoundContainer),
          {
            timeout: 30000,
            description: 'Account Not Found screen should be visible',
          },
        );
      },
    });
  }

  async tapCreateNewWalletButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(
          asDetoxElement(this.accountNotFoundCreateButton),
          {
            elemDescription:
              'Create New Wallet button on Account Not Found screen',
          },
        );
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.accountNotFoundCreateButton, {
          description: 'Create New Wallet button on Account Not Found screen',
        });
      },
    });
  }
}

export default new SocialLoginView();
