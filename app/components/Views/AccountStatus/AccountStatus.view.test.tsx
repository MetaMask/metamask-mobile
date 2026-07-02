/**
 * Component View tests for the Account Already Exists screen.
 *
 * Mirrors (partial):
 * - tests/smoke/seedless/apple-login-existing-user.spec.ts
 * - tests/smoke/seedless/google-login-existing-user.spec.ts
 *
 * CV covers Account Already Exists UI and Login navigation after OAuth detects
 * an existing user. Full E2E still required for OAuth mockttp, onboarding sheet,
 * and native provider flows — see SocialLoginIosUser.view.test.tsx and E2E specs.
 *
 * Run:
 * yarn jest -c jest.config.view.js AccountStatus.view.test.tsx --runInBand
 */
import '../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import {
  describeForPlatforms,
  itEach,
  itForPlatforms,
} from '../../../../tests/component-view/platform';
import {
  renderAccountAlreadyExists,
  renderAccountAlreadyExistsWithOnboardingHistory,
  renderAccountNotFound,
  ONBOARDING_PREVIOUS_PROBE_ID,
} from '../../../../tests/component-view/renderers/seedlessOnboarding';
import Routes from '../../../constants/navigation/Routes';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
import { strings } from '../../../../locales/i18n';
import { AccountStatusSelectorIDs } from './AccountStatus.testIds';

const existingUserProviders = [
  {
    provider: AuthConnection.Apple,
    label: 'Apple',
  },
  {
    provider: AuthConnection.Google,
    label: 'Google',
  },
] as const;

describeForPlatforms('AccountStatus — Account Already Exists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  itEach(existingUserProviders)(
    'existing $label user sees Account Already Exists and navigates to OAuth rehydrate on Login',
    async ({ provider }) => {
      const { findByTestId } = renderAccountAlreadyExists({
        routeParams: {
          type: 'found',
          provider,
          accountName: 'seedless-cv@example.com',
          oauthLoginSuccess: true,
        },
      });

      expect(
        await findByTestId(AccountStatusSelectorIDs.ACCOUNT_FOUND_CONTAINER),
      ).toBeOnTheScreen();

      expect(
        await findByTestId(AccountStatusSelectorIDs.ACCOUNT_FOUND_TITLE),
      ).toBeOnTheScreen();

      expect(
        await findByTestId(AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON),
      ).toBeOnTheScreen();

      expect(
        await findByTestId(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_DIFFERENT_METHOD_BUTTON,
        ),
      ).toBeOnTheScreen();

      fireEvent.press(
        await findByTestId(AccountStatusSelectorIDs.ACCOUNT_FOUND_LOGIN_BUTTON),
      );

      await findByTestId(
        `route-${Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE}`,
      );
    },
  );

  itEach(existingUserProviders)(
    'existing $label user taps Use a different login method and returns to onboarding',
    async ({ provider }) => {
      const { findByTestId } = renderAccountAlreadyExistsWithOnboardingHistory({
        routeParams: {
          type: 'found',
          provider,
          oauthLoginSuccess: true,
        },
      });

      await findByTestId(AccountStatusSelectorIDs.ACCOUNT_FOUND_CONTAINER);

      fireEvent.press(
        await findByTestId(
          AccountStatusSelectorIDs.ACCOUNT_FOUND_DIFFERENT_METHOD_BUTTON,
        ),
      );

      await findByTestId(ONBOARDING_PREVIOUS_PROBE_ID);
    },
  );

  itEach(existingUserProviders)(
    'account not found for $label import shows Create wallet and navigates to ChoosePassword',
    async ({ provider }) => {
      const { findByTestId } = renderAccountNotFound({
        routeParams: {
          type: 'not_exist',
          provider,
          accountName: 'seedless-cv@example.com',
        },
      });

      expect(
        await findByTestId(
          AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CONTAINER,
        ),
      ).toBeOnTheScreen();

      expect(
        await findByTestId(AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_TITLE),
      ).toBeOnTheScreen();

      fireEvent.press(
        await findByTestId(
          AccountStatusSelectorIDs.ACCOUNT_NOT_FOUND_CREATE_BUTTON,
        ),
      );

      await findByTestId(`route-${Routes.ONBOARDING.CHOOSE_PASSWORD}`);
    },
  );

  itForPlatforms(
    'Account Already Exists shows Log in on Android and Unlock wallet on iOS',
    async ({ os }) => {
      const { findByText } = renderAccountAlreadyExists({
        routeParams: {
          type: 'found',
          provider: AuthConnection.Google,
        },
      });

      if (os === 'ios') {
        expect(
          await findByText(strings('account_status.unlock_wallet')),
        ).toBeOnTheScreen();
      } else {
        expect(
          await findByText(strings('account_status.log_in')),
        ).toBeOnTheScreen();
      }
    },
  );
});
