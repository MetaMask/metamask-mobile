import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';

import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import SettingsView from '../../page-objects/Settings/SettingsView';
import SecurityAndPrivacy from '../../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import ChangePasswordView from '../../page-objects/Settings/SecurityAndPrivacy/ChangePasswordView';
import ToastModal from '../../page-objects/wallet/ToastModal';

import { createOAuthMockttpService } from '../../api-mocking/seedless-onboarding';
import { SmokeSeedlessOnboarding } from '../../tags';
import { loginWithPassword, FIXTURE_PASSWORD } from './utils';

const NEW_PASSWORD = 'NewPass456!@#';

describe(SmokeSeedlessOnboarding('Change Password'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000);
  });

  it('changes password after onboarding', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureGoogleNewUser();
          await oAuthMockttpService.setup(mockServer);
        },
      },
      async () => {
        await loginWithPassword(FIXTURE_PASSWORD);
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();

        await SecurityAndPrivacy.scrollToChangePassword();
        await SecurityAndPrivacy.tapChangePassword();

        await ChangePasswordView.typeInConfirmPasswordInputBox(
          FIXTURE_PASSWORD,
        );
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
          SecurityAndPrivacy.securityAndPrivacyHeading,
          {
            timeout: 30000,
            description:
              'Security & Privacy screen should be visible after password change',
          },
        );

        await Assertions.expectElementToBeVisible(
          ToastModal.notificationTitle,
          {
            timeout: 20000,
            description: 'Password changed success toast should appear',
          },
        );

        await Assertions.expectElementToNotBeVisible(
          ToastModal.notificationTitle,
          {
            timeout: 10000,
            description: 'Toast should disappear',
          },
        );
      },
    );
  });
});
