/**
 * Component View tests for the iOS social-login success screen (new user).
 *
 * Mirrors (partial, iOS path only):
 * - tests/smoke/seedless/apple-login-new-user.spec.ts
 * - tests/smoke/seedless/google-login-new-user.spec.ts (iOS branch in utils)
 *
 * CV covers the iOS post-OAuth PIN setup screen and navigation to ChoosePassword.
 * Full E2E still required for OAuth mockttp, OnboardingSheet, password creation,
 * MetaMetrics opt-in, and wallet home — keep those specs active.
 *
 * Not migratable to CV (keep E2E):
 * - google-login-add-srp.spec.ts — full onboarding + wallet + SRP import
 * - google-login-lock-unlock.spec.ts — native Keychain lock/unlock
 * - google-login-reset-wallet.spec.ts — native Keychain reset from login
 *
 * Run:
 * yarn jest -c jest.config.view.js SocialLoginIosUser.view.test.tsx --runInBand
 */
import '../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import {
  describeForPlatforms,
  itEach,
} from '../../../../tests/component-view/platform';
import {
  renderSocialLoginIosNewUser,
  renderSocialLoginIosExistingUser,
} from '../../../../tests/component-view/renderers/seedlessOnboarding';
import Routes from '../../../constants/navigation/Routes';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { OnboardingSelectorIDs } from '../Onboarding/Onboarding.testIds';

const iosNewUserProviders = [
  {
    provider: AuthConnection.Apple,
    label: 'Apple',
  },
  {
    provider: AuthConnection.Google,
    label: 'Google',
  },
] as const;

describeForPlatforms(
  'SocialLoginIosUser — new user (iOS)',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    itEach(iosNewUserProviders)(
      'shows iOS new-user screen after $label login and navigates to ChoosePassword on Set PIN',
      async ({ provider }) => {
        const { findByTestId } = renderSocialLoginIosNewUser({
          routeParams: {
            provider,
            oauthLoginSuccess: true,
            accountName: 'seedless-cv@example.com',
          },
        });

        expect(
          await findByTestId(
            OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_TITLE,
          ),
        ).toBeOnTheScreen();

        expect(
          await findByTestId(
            OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_BUTTON,
          ),
        ).toBeOnTheScreen();

        fireEvent.press(
          await findByTestId(
            OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_NEW_USER_BUTTON,
          ),
        );

        await findByTestId(`route-${Routes.ONBOARDING.CHOOSE_PASSWORD}`);
      },
    );

    itEach(iosNewUserProviders)(
      'shows iOS existing-user screen after $label login and navigates to OAuth rehydrate on Secure wallet',
      async ({ provider }) => {
        const { findByTestId } = renderSocialLoginIosExistingUser({
          routeParams: {
            provider,
            oauthLoginSuccess: true,
            accountName: 'seedless-cv@example.com',
          },
        });

        expect(
          await findByTestId(
            OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_TITLE,
          ),
        ).toBeOnTheScreen();

        fireEvent.press(
          await findByTestId(
            OnboardingSelectorIDs.SOCIAL_LOGIN_IOS_EXISTING_USER_BUTTON,
          ),
        );

        await findByTestId(
          `route-${Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE}`,
        );
      },
    );
  },
  { only: 'ios' },
);
