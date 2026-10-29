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
import { AccessibilityInfo, InteractionManager, Platform } from 'react-native';
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
    // Isolate from prior CV suites that use nock (Ramp/PriceAlerts) — leftover
    // interceptor TLS state surfaces here as unhandled `read EINVAL`.
    clearSeedlessAuthServerMocks();
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
    'keeps create password disabled until the password meets the length rule for $label login',
    async ({ provider }) => {
      const { findByTestId, findByText } = renderChoosePasswordForSocialLogin({
        routeParams: {
          oauthLoginSuccess: true,
          provider,
        },
      });

      const submitButton = await findByTestId(
        ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
      );
      const lengthHelpText = strings('choose_password.must_be_at_least', {
        number: MIN_PASSWORD_LENGTH,
      });

      expect(submitButton).toBeDisabled();

      const passwordInput = await findByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      fireEvent.changeText(passwordInput, 'short');
      fireEvent.changeText(
        await findByTestId(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
        'short',
      );
      fireEvent(passwordInput, 'blur');

      const lengthHelp = await findByText(lengthHelpText);
      expect(lengthHelp.props.accessibilityElementsHidden).toBe(false);
      expect(submitButton).toBeDisabled();

      fireEvent.changeText(passwordInput, VALID_PASSWORD);
      fireEvent.changeText(
        await findByTestId(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
        VALID_PASSWORD,
      );

      const hiddenLengthHelp = await findByText(lengthHelpText, {
        includeHiddenElements: true,
      });
      expect(hiddenLengthHelp.props.accessibilityElementsHidden).toBe(true);
      expect(hiddenLengthHelp).toHaveStyle({ opacity: 0 });
      expect(submitButton).toBeEnabled();
    },
  );

  itEach(socialLoginProviders)(
    'shows the length error after blurring a confirm password below the minimum length for $label login',
    async ({ provider }) => {
      const { findByTestId, findByText, queryByText } =
        renderChoosePasswordForSocialLogin({
          routeParams: {
            oauthLoginSuccess: true,
            provider,
          },
        });
      const lengthHelpText = strings('choose_password.must_be_at_least', {
        number: MIN_PASSWORD_LENGTH,
      });

      const passwordInput = await findByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = await findByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      fireEvent.changeText(passwordInput, VALID_PASSWORD);
      fireEvent.changeText(confirmPasswordInput, 'x');
      fireEvent(confirmPasswordInput, 'blur');

      expect(queryByText(strings('choose_password.password_error'))).toBeNull();
      expect(await findByText(lengthHelpText)).toBeOnTheScreen();
    },
  );

  itEach(socialLoginProviders)(
    'shows the length error after pressing Done on a confirm password below the minimum length for $label login',
    async ({ provider }) => {
      const { findByTestId, findByText, queryByText } =
        renderChoosePasswordForSocialLogin({
          routeParams: {
            oauthLoginSuccess: true,
            provider,
          },
        });
      const lengthHelpText = strings('choose_password.must_be_at_least', {
        number: MIN_PASSWORD_LENGTH,
      });

      const passwordInput = await findByTestId(
        ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
      );
      const confirmPasswordInput = await findByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );

      fireEvent.changeText(passwordInput, VALID_PASSWORD);
      fireEvent.changeText(confirmPasswordInput, 'x');

      expect(queryByText(lengthHelpText)).toBeNull();
      expect(queryByText(strings('choose_password.password_error'))).toBeNull();

      fireEvent(confirmPasswordInput, 'submitEditing');

      expect(await findByText(lengthHelpText)).toBeOnTheScreen();
      expect(queryByText(strings('choose_password.password_error'))).toBeNull();
      expect(
        await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
      ).toBeDisabled();
    },
  );

  itEach(socialLoginProviders)(
    'shows a danger mismatch message and keeps create password disabled for $label login',
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
      const confirmPasswordInput = await findByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      fireEvent.changeText(
        confirmPasswordInput,
        `${VALID_PASSWORD.slice(0, -1)}x`,
      );

      expect(
        await findByText(strings('choose_password.password_error')),
      ).toBeOnTheScreen();

      fireEvent.changeText(confirmPasswordInput, `${VALID_PASSWORD}x`);

      expect(
        await findByText(strings('choose_password.password_error')),
      ).toBeOnTheScreen();

      fireEvent(confirmPasswordInput, 'blur');

      const mismatchHelp = await findByText(
        strings('choose_password.password_error'),
      );
      expect(mismatchHelp).toBeOnTheScreen();

      expect(
        await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
      ).toBeDisabled();
    },
  );

  itEach(socialLoginProviders)(
    'shows a mismatch error after pressing Done when confirm length differs for $label login',
    async ({ provider }) => {
      const { findByTestId, findByText, queryByText } =
        renderChoosePasswordForSocialLogin({
          routeParams: {
            oauthLoginSuccess: true,
            provider,
          },
        });

      fireEvent.changeText(
        await findByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
        VALID_PASSWORD,
      );
      const confirmPasswordInput = await findByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      fireEvent.changeText(confirmPasswordInput, `${VALID_PASSWORD}x`);

      expect(queryByText(strings('choose_password.password_error'))).toBeNull();

      fireEvent(confirmPasswordInput, 'submitEditing');

      expect(
        await findByText(strings('choose_password.password_error')),
      ).toBeOnTheScreen();
      expect(
        await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
      ).toBeDisabled();
    },
  );

  itEach(socialLoginProviders)(
    'enables create password without a mismatch message when passwords match for $label login',
    async ({ provider }) => {
      const { findByTestId, queryByText } = renderChoosePasswordForSocialLogin({
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

      expect(queryByText(strings('choose_password.password_error'))).toBeNull();

      expect(
        await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
      ).toBeEnabled();
    },
  );

  it('announces confirm-password errors and names why create password stays disabled', async () => {
    const announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    const lengthHelpText = strings('choose_password.must_be_at_least', {
      number: MIN_PASSWORD_LENGTH,
    });
    const mismatchText = strings('choose_password.password_error');
    const { findByTestId, findByText } = renderChoosePasswordForSocialLogin({
      routeParams: {
        oauthLoginSuccess: true,
        provider: AuthConnection.Google,
      },
    });

    try {
      expect(
        (await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID)).props
          .accessibilityHint,
      ).toBe(lengthHelpText);
      expect(announceSpy).not.toHaveBeenCalled();

      fireEvent.changeText(
        await findByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
        VALID_PASSWORD,
      );
      const confirmPasswordInput = await findByTestId(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
      fireEvent.changeText(confirmPasswordInput, 'x');
      announceSpy.mockClear();
      fireEvent(confirmPasswordInput, 'blur');

      const tooShortHelp = await findByText(lengthHelpText);
      expect(tooShortHelp).toBeOnTheScreen();
      expect(
        (await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID)).props
          .accessibilityHint,
      ).toBe(lengthHelpText);

      if (Platform.OS === 'android') {
        expect(tooShortHelp.props.accessibilityLiveRegion).toBe('polite');
        expect(announceSpy).not.toHaveBeenCalled();
      } else {
        expect(tooShortHelp.props.accessibilityLiveRegion).toBeUndefined();
        expect(announceSpy).toHaveBeenCalledTimes(1);
        expect(announceSpy).toHaveBeenCalledWith(lengthHelpText);
      }

      announceSpy.mockClear();
      fireEvent.changeText(
        await findByTestId(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
        `${VALID_PASSWORD.slice(0, -1)}x`,
      );

      const mismatchHelp = await findByText(mismatchText);
      expect(mismatchHelp).toBeOnTheScreen();
      expect(
        (await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID)).props
          .accessibilityHint,
      ).toBe(mismatchText);

      if (Platform.OS === 'android') {
        expect(mismatchHelp.props.accessibilityLiveRegion).toBe('polite');
        expect(announceSpy).not.toHaveBeenCalled();
      } else {
        expect(announceSpy).toHaveBeenCalledTimes(1);
        expect(announceSpy).toHaveBeenCalledWith(mismatchText);
      }

      announceSpy.mockClear();
      fireEvent.changeText(
        await findByTestId(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
        `${VALID_PASSWORD}y`,
      );
      expect(await findByText(mismatchText)).toBeOnTheScreen();
      expect(announceSpy).not.toHaveBeenCalled();

      fireEvent.changeText(
        await findByTestId(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
        VALID_PASSWORD,
      );
      expect(
        (await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID)).props
          .accessibilityHint,
      ).toBeUndefined();
    } finally {
      announceSpy.mockRestore();
    }
  });

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
