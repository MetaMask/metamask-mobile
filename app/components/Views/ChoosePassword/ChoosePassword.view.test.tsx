/**
 * Component View tests for ChoosePassword during seedless social-login onboarding.
 *
 * Mirrors (partial):
 * - tests/smoke/seedless/apple-login-new-user.spec.ts
 * - tests/smoke/seedless/google-login-new-user.spec.ts (Android path skips iOS screen)
 *
 * CV covers password validation UX and marketing opt-in auth-server sync (nock).
 * Full wallet creation, MetaMetrics, and wallet home remain E2E.
 *
 * Run: yarn jest -c jest.config.view.js ChoosePassword.view.test.tsx --runInBand
 */
import '../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import {
  describeForPlatforms,
  itEach,
} from '../../../../tests/component-view/platform';
import {
  clearSeedlessAuthServerMocks,
  setupSeedlessAuthServerMocks,
} from '../../../../tests/component-view/api-mocking/seedless-onboarding';
import { renderChoosePasswordForSocialLogin } from '../../../../tests/component-view/renderers/seedlessOnboarding';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
import { ChoosePasswordSelectorsIDs } from './ChoosePassword.testIds';
import { strings } from '../../../../locales/i18n';
import { MIN_PASSWORD_LENGTH } from '../../../util/password';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { SEEDLESS_CV_ACCESS_TOKEN } from '../../../../tests/component-view/presets/seedlessOnboarding';

const VALID_PASSWORD = 'Test1234!';
const socialLoginProviders = [
  { provider: AuthConnection.Google, label: 'Google' },
  { provider: AuthConnection.Apple, label: 'Apple' },
] as const;

function mockAuthenticationForSocialWalletCreation() {
  jest.spyOn(Authentication, 'componentAuthenticationType').mockResolvedValue({
    currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
  });
  jest
    .spyOn(Authentication, 'requestBiometricsAccessControlForIOS')
    .mockImplementation(async (authType) => authType);
  jest
    .spyOn(Authentication, 'newWalletAndKeychain')
    .mockResolvedValue(undefined);
}

function mockAuthenticationGetType() {
  return jest.spyOn(Authentication, 'getType').mockResolvedValue({
    currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
  });
}

beforeAll(() => {
  jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation(
    jest.fn().mockImplementation((callback) => {
      if (typeof callback === 'function') {
        callback();
      }
      return {
        then: (onfulfilled?: () => void) => Promise.resolve(onfulfilled?.()),
        done: (onfulfilled?: () => void, onrejected?: () => void) =>
          Promise.resolve().then(onfulfilled, onrejected),
        cancel: jest.fn(),
      };
    }),
  );
});

afterAll(() => {
  jest.restoreAllMocks();
});

describeForPlatforms('ChoosePassword — seedless social login', () => {
  let getTypeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    getTypeSpy = mockAuthenticationGetType();
    if (Engine.context.SeedlessOnboardingController?.state) {
      Engine.context.SeedlessOnboardingController.state.accessToken =
        SEEDLESS_CV_ACCESS_TOKEN;
    }
  });

  afterEach(() => {
    clearSeedlessAuthServerMocks();
    getTypeSpy.mockRestore();
  });

  itEach(socialLoginProviders)(
    'keeps submit disabled for $label login until matching passwords meet minimum length',
    async ({ provider }) => {
      const { findByTestId } = renderChoosePasswordForSocialLogin({
        routeParams: {
          oauthLoginSuccess: true,
          provider,
        },
      });

      const submitButton = await findByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );

      expect(submitButton).toBeDisabled();

      fireEvent.changeText(
        await findByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
        'short',
      );
      fireEvent.changeText(
        await findByTestId(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
        'short',
      );

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    },
  );

  itEach(socialLoginProviders)(
    'shows password mismatch error for $label login when confirm password differs',
    async ({ provider }) => {
      const { findByTestId, findByText } = renderChoosePasswordForSocialLogin({
        routeParams: {
          oauthLoginSuccess: true,
          provider,
        },
      });

      fireEvent.changeText(
        await findByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
        VALID_PASSWORD,
      );
      fireEvent.changeText(
        await findByTestId(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
        `${VALID_PASSWORD}x`,
      );

      expect(
        await findByText(strings('choose_password.password_error')),
      ).toBeOnTheScreen();

      expect(
        await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
      ).toBeDisabled();
    },
  );

  itEach(socialLoginProviders)(
    'enables submit for $label login when passwords match and meet minimum length',
    async ({ provider }) => {
      const { findByTestId } = renderChoosePasswordForSocialLogin({
        routeParams: {
          oauthLoginSuccess: true,
          provider,
        },
      });

      fireEvent.changeText(
        await findByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
        VALID_PASSWORD,
      );
      fireEvent.changeText(
        await findByTestId(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
        VALID_PASSWORD,
      );

      await waitFor(async () => {
        expect(
          await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
        ).toBeEnabled();
      });

      expect(VALID_PASSWORD.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
    },
  );

  it('posts marketing opt-in to auth server and navigates to interest questionnaire after wallet creation', async () => {
    setupSeedlessAuthServerMocks({ marketingOptIn: true });
    mockAuthenticationForSocialWalletCreation();

    const { findByTestId } = renderChoosePasswordForSocialLogin({
      routeParams: {
        oauthLoginSuccess: true,
        provider: AuthConnection.Google,
      },
    });

    fireEvent.changeText(
      await findByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
      VALID_PASSWORD,
    );
    fireEvent.changeText(
      await findByTestId(ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID),
      VALID_PASSWORD,
    );

    await waitFor(async () => {
      expect(
        await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
      ).toBeEnabled();
    });

    fireEvent.press(
      await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
    );

    await findByTestId(`route-${Routes.ONBOARDING.INTEREST_QUESTIONNAIRE}`);
  });
});
