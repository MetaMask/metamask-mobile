/**
 * Component View tests for ChoosePassword during seedless social-login onboarding.
 *
 * Mirrors (partial):
 * - tests/smoke/seedless/apple-login-new-user.spec.ts
 * - tests/smoke/seedless/google-login-new-user.spec.ts (Android path skips iOS screen)
 *
 * CV covers password validation UX and social login wallet creation (nock).
 * Full wallet creation, MetaMetrics, and wallet home remain E2E.
 *
 * Run: yarn jest -c jest.config.view.js ChoosePassword.view.test.tsx --runInBand
 */
import '../../../../tests/component-view/mocks';
import {
  fireEvent,
  waitFor,
  type RenderAPI,
} from '@testing-library/react-native';
import { AccessibilityInfo, InteractionManager, Platform } from 'react-native';
import { Button as DesignSystemButton } from '@metamask/design-system-react-native';
import type { DeepPartial } from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import {
  describeForPlatforms,
  itEach,
} from '../../../../tests/component-view/platform';
import {
  clearSeedlessAuthServerMocks,
  getSeedlessAuthServerRequests,
  setupSeedlessAuthServerMocks,
} from '../../../../tests/component-view/api-mocking/seedless-onboarding';
import {
  findTrackedEvent,
  isMarketingSyncError,
} from '../../../../tests/component-view/helpers/analytics';
import { renderChoosePasswordForSocialLogin } from '../../../../tests/component-view/renderers/seedlessOnboarding';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
import { ChoosePasswordSelectorsIDs } from './ChoosePassword.testIds';
import { strings } from '../../../../locales/i18n';
import { MIN_PASSWORD_LENGTH } from '../../../util/password';
import { Authentication } from '../../../core';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { analytics } from '../../../util/analytics/analytics';
import Logger from '../../../util/Logger';
import { UserProfileProperty } from '../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
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

async function fillValidPasswords(screen: Pick<RenderAPI, 'findByTestId'>) {
  fireEvent.changeText(
    await screen.findByTestId(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
    VALID_PASSWORD,
  );
  fireEvent.changeText(
    await screen.findByTestId(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    ),
    VALID_PASSWORD,
  );
}

async function submitChoosePassword(
  screen: Pick<RenderAPI, 'findByTestId' | 'getByTestId'>,
) {
  await waitFor(() => {
    expect(
      screen.getByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
    ).toBeEnabled();
  });
  fireEvent.press(
    await screen.findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
  );
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

  it('navigates to interest questionnaire after social login wallet creation', async () => {
    setupSeedlessAuthServerMocks({ marketingOptIn: true });
    mockAuthenticationForSocialWalletCreation();

    const screen = renderChoosePasswordForSocialLogin({
      routeParams: {
        oauthLoginSuccess: true,
        provider: AuthConnection.Google,
      },
    });

    await fillValidPasswords(screen);
    await submitChoosePassword(screen);

    await screen.findByTestId(
      `route-${Routes.ONBOARDING.INTEREST_QUESTIONNAIRE}`,
    );
  });

  it('keeps marketing consent off when the unchecked marketing checkbox sync fails during wallet creation', async () => {
    // Desync setup: the server still holds is_opt_in=true while the sync
    // POST fails with HTTP 500.
    setupSeedlessAuthServerMocks({
      marketingOptIn: true,
      marketingPostFails: true,
    });
    mockAuthenticationForSocialWalletCreation();

    const identifySpy = jest.spyOn(analytics, 'identify');
    const trackEventSpy = jest.spyOn(analytics, 'trackEvent');
    const loggerErrorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => Promise.resolve());

    try {
      const screen = renderChoosePasswordForSocialLogin({
        routeParams: {
          oauthLoginSuccess: true,
          provider: AuthConnection.Google,
        },
      });

      await fillValidPasswords(screen);

      // The view-test env keeps the marketing checkbox unchecked
      // (HAS_TEST_OVERRIDES), so opt-out is an explicit on-then-off toggle.
      await screen.findByTestId(
        ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
      );
      fireEvent.press(
        screen.getByTestId(ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID),
      );
      await waitFor(() => {
        expect(
          screen.getByTestId(
            ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
          ).props.accessibilityState?.checked,
        ).toBe(true);
      });
      fireEvent.press(
        screen.getByTestId(ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID),
      );
      await waitFor(() => {
        expect(
          screen.getByTestId(
            ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
          ).props.accessibilityState?.checked,
        ).toBe(false);
      });

      await submitChoosePassword(screen);

      // The failed consent sync must not block wallet creation.
      await screen.findByTestId(
        `route-${Routes.ONBOARDING.INTEREST_QUESTIONNAIRE}`,
      );

      // The opt-out lands in the local security preference despite the 500.
      await waitFor(() => {
        expect(
          screen.store.getState().security.dataCollectionForMarketing,
        ).toBe(false);
      });

      // Exactly one opt-out POST reached the auth server and nothing was read.
      await waitFor(() => {
        expect(getSeedlessAuthServerRequests()).toEqual([
          { method: 'POST', body: { opt_in_status: false } },
        ]);
      });

      expect(loggerErrorSpy.mock.calls.some(isMarketingSyncError)).toBe(true);

      expect(identifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: false,
        }),
      );
      expect(
        findTrackedEvent(
          trackEventSpy,
          MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
        ),
      ).toMatchObject({
        properties: expect.objectContaining({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: false,
          location: 'onboarding_choosePassword',
          account_type: 'metamask_google',
        }),
      });
    } finally {
      identifySpy.mockRestore();
      trackEventSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    }
  });

  it('resolves geolocation before enabling create password for social login', async () => {
    let resolveGeolocation!: (location: string) => void;
    const geolocationMock = jest.fn(
      async () =>
        new Promise<string>((resolve) => {
          resolveGeolocation = resolve;
        }),
    );

    const { findByTestId, UNSAFE_getByType } =
      renderChoosePasswordForSocialLogin({
        geolocationMock,
        overrides: {
          engine: {
            backgroundState: {
              GeolocationController: { location: 'UNKNOWN' },
            },
          },
        },
      });

    await findByTestId(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID);
    expect(geolocationMock).toHaveBeenCalledTimes(1);
    expect(UNSAFE_getByType(DesignSystemButton).props.isLoading).toBe(true);

    resolveGeolocation('US');
    await waitFor(() => {
      expect(UNSAFE_getByType(DesignSystemButton).props.isLoading).toBe(false);
    });
  });
});
