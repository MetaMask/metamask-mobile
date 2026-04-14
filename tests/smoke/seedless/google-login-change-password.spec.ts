import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';

import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import SettingsView from '../../page-objects/Settings/SettingsView';
import SecurityAndPrivacy from '../../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import ChangePasswordView from '../../page-objects/Settings/SecurityAndPrivacy/ChangePasswordView';
import LoginView from '../../page-objects/wallet/LoginView';
import WalletView from '../../page-objects/wallet/WalletView';
import ToastModal from '../../page-objects/wallet/ToastModal';

import { createOAuthMockttpService } from '../../api-mocking/seedless-onboarding';
import { SmokeSeedlessOnboarding } from '../../tags';
import {
  completeGoogleNewUserOnboarding,
  loginWithPassword,
  TEST_PASSWORD,
  FIXTURE_PASSWORD,
} from './utils';

const NEW_PASSWORD = 'NewPass456!@#';

describe(SmokeSeedlessOnboarding('Google Login - Change Password'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000);
  });

  it('changes password after seedless onboarding and unlocks with new password', async () => {
    const isIOS = device.getPlatform() === 'ios';

    const fixture = isIOS
      ? new FixtureBuilder().build()
      : new FixtureBuilder({ onboarding: true }).build();

    await withFixtures(
      {
        fixture,
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureGoogleNewUser();
          await oAuthMockttpService.setup(mockServer);
        },
      },
      async () => {
        const currentPassword = isIOS ? FIXTURE_PASSWORD : TEST_PASSWORD;

        if (isIOS) {
          await loginWithPassword(FIXTURE_PASSWORD);
        } else {
          await completeGoogleNewUserOnboarding();
        }
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();

        await SecurityAndPrivacy.scrollToChangePassword();
        await SecurityAndPrivacy.tapChangePassword();

        await ChangePasswordView.typeInConfirmPasswordInputBox(currentPassword);
        await ChangePasswordView.tapSubmitButton();

        await ChangePasswordView.typeInConfirmPasswordInputBox(NEW_PASSWORD);
        await ChangePasswordView.reEnterPassword(NEW_PASSWORD);
        await ChangePasswordView.tapIUnderstandCheckBox();
        await ChangePasswordView.tapSubmitButton();

        await Assertions.expectElementToNotBeVisible(
          ChangePasswordView.submitButton,
          {
            timeout: 30000,
            description:
              'Change password form should dismiss after successful change',
          },
        );
        await Assertions.expectElementToBeVisible(
          ToastModal.notificationTitle,
          {
            description: 'Password changed success toast should appear',
          },
        );

        await Assertions.expectElementToNotBeVisible(
          ToastModal.notificationTitle,
          {
            description: 'Toast should disappear',
          },
        );
      },
    );
  });
});
