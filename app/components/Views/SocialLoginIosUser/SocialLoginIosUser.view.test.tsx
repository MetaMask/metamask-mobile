/**
 * Component View tests for the iOS social-login success screen (existing user).
 *
 * CV covers the iOS post-OAuth existing-user screen and navigation to
 * OAuth rehydrate. New-user social login goes directly to ChoosePassword.
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
import { renderSocialLoginIosExistingUser } from '../../../../tests/component-view/renderers/seedlessOnboarding';
import Routes from '../../../constants/navigation/Routes';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { OnboardingSelectorIDs } from '../Onboarding/Onboarding.testIds';

const iosExistingUserProviders = [
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
  'SocialLoginIosUser — existing user (iOS)',
  () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    itEach(iosExistingUserProviders)(
      'shows iOS existing-user screen after $label login and navigates to OAuth rehydrate on Unlock wallet',
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
