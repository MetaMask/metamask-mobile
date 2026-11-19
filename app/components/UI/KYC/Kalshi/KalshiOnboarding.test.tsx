import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  KycApiError,
  type KycStep,
  type KycStepStatus,
} from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import { MfaFlowError } from '../../../../util/identity/mfa/engine/errors';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import KalshiOnboarding, { KalshiOnboardingTestIds } from './KalshiOnboarding';

const mockGoBack = jest.fn();
const mockVerifyOrEnroll = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../../util/identity/mfa', () => ({
  useMfa: () => ({ verifyOrEnroll: mockVerifyOrEnroll }),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

jest.mock('../utils/toSumSubLocale', () => ({
  toSumSubLocale: () => 'en',
}));

jest.mock('../../../../core/Engine', () => {
  const engine = {
    controllerMessenger: { call: jest.fn() },
    context: {
      VendorOnboardingController: {
        refreshStep: jest.fn(),
        acceptTerms: jest.fn(),
        startSession: jest.fn(),
        fetchSessionDisclaimers: jest.fn(),
        acceptSessionDisclaimers: jest.fn(),
        launchProviderFlow: jest.fn(),
        submitPhone: jest.fn(),
        submitPhoneCode: jest.fn(),
        submitEmailCode: jest.fn(),
        resendEmailCode: jest.fn(),
      },
      KycService: {
        getGeoCountry: jest.fn(),
        fetchVendorDisclaimers: jest.fn(),
      },
    },
  };
  return { __esModule: true, default: engine };
});

const flow = Engine.context.VendorOnboardingController as unknown as Record<
  string,
  jest.Mock
>;
const service = Engine.context.KycService as unknown as Record<
  string,
  jest.Mock
>;

const TERMS = [
  { id: 'tos-v1', url: 'https://kalshi.example/tos', display_name: 'Terms' },
  {
    id: 'privacy-v1',
    url: 'https://kalshi.example/p',
    display_name: 'Privacy',
  },
];

const render = (step?: KycStep, status: KycStepStatus = 'none') =>
  renderWithProvider(<KalshiOnboarding />, {
    state: {
      engine: {
        backgroundState: {
          VendorOnboardingController: {
            vendors: step
              ? {
                  kalshi: {
                    step,
                    status,
                    sessionId: 'sid-1',
                  },
                }
              : {},
          },
        },
      },
    },
  });

const primary = (screen: ReturnType<typeof render>) =>
  screen.getByTestId(KalshiOnboardingTestIds.PRIMARY);

const typeInto = (screen: ReturnType<typeof render>, value: string) =>
  fireEvent.changeText(
    screen.getByTestId(KalshiOnboardingTestIds.INPUT),
    value,
  );

/**
 * Walks through MetaMask MFA to the Kalshi email field.
 *
 * The email field is the phone's own state on `mfa`.
 *
 * @returns The rendered screen, showing the email field.
 */
async function reachEmail() {
  const screen = render('mfa');
  fireEvent.press(primary(screen));
  await screen.findByText(
    'Kalshi creates your account with this email and sends you a code. It can differ from your MetaMask email.',
  );
  return screen;
}

describe('KalshiOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    flow.refreshStep.mockResolvedValue('terms');
    for (const name of [
      'acceptTerms',
      'startSession',
      'acceptSessionDisclaimers',
      'submitPhone',
      'submitPhoneCode',
      'submitEmailCode',
      'resendEmailCode',
    ]) {
      flow[name].mockResolvedValue('sumsub');
    }
    flow.launchProviderFlow.mockResolvedValue('submitted');
    flow.fetchSessionDisclaimers.mockResolvedValue({
      idOS: [{ key: 'idos', version: '1', consented: false }],
      kycProvider: [{ key: 'sumsub', version: '2', consented: false }],
      credentialReusabilityConsentGiven: false,
    });
    service.getGeoCountry.mockResolvedValue('USA');
    service.fetchVendorDisclaimers.mockResolvedValue(TERMS);
    mockVerifyOrEnroll.mockResolvedValue({
      token: { accessToken: 'aal2' },
      credentials: [],
    });
  });

  it('asks kyc-api for the step when it opens, and shows nothing to do yet', async () => {
    flow.refreshStep.mockResolvedValue('terms');
    const screen = render();

    await waitFor(() =>
      expect(flow.refreshStep).toHaveBeenCalledWith({ vendor: 'kalshi' }),
    );
    expect(screen.queryByTestId(KalshiOnboardingTestIds.PRIMARY)).toBeNull();
  });

  it('keeps going when kyc-api cannot be reached', async () => {
    flow.refreshStep.mockRejectedValue(new Error('offline'));
    const screen = render('mfa');

    await waitFor(() => expect(flow.refreshStep).toHaveBeenCalled());
    expect(
      screen.getByText(
        'MetaMask confirms it’s you. Next you’ll choose the email Kalshi uses.',
      ),
    ).toBeOnTheScreen();
  });

  describe('terms', () => {
    it('loads the Kalshi terms for the user’s country and links to them', async () => {
      const screen = render('terms');

      expect(await screen.findByText('Terms')).toBeOnTheScreen();
      expect(service.fetchVendorDisclaimers).toHaveBeenCalledWith({
        vendor: 'kalshi',
        country: 'USA',
      });
      fireEvent.press(screen.getByText('Privacy'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://kalshi.example/p');
    });

    it('records the acceptance with kyc-api', async () => {
      const screen = render('terms');
      await screen.findByText('Terms');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.acceptTerms).toHaveBeenCalledWith({
          vendor: 'kalshi',
          country: 'USA',
          disclaimerIds: ['tos-v1', 'privacy-v1'],
        }),
      );
    });
  });

  describe('confirm with MetaMask', () => {
    it('holds the MFA token, then creates the session with the typed email', async () => {
      mockVerifyOrEnroll.mockResolvedValue({
        token: { accessToken: 'aal2' },
        credentials: [{ type: 'email_otp', email: 'mm@b.co' }],
      });
      const screen = render('mfa');

      fireEvent.press(primary(screen));

      expect(await screen.findByDisplayValue('mm@b.co')).toBeOnTheScreen();
      expect(flow.startSession).not.toHaveBeenCalled();
      expect(mockVerifyOrEnroll).toHaveBeenCalledWith(
        expect.objectContaining({ methods: ['email_otp'] }),
      );

      typeInto(screen, '  kalshi@b.co ');
      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.startSession).toHaveBeenCalledWith({
          vendor: 'kalshi',
          aal2Token: 'aal2',
          email: 'kalshi@b.co',
        }),
      );
    });

    it('does not send an empty email', async () => {
      const screen = await reachEmail();

      expect(primary(screen).props.accessibilityState?.disabled).toBe(true);
      expect(flow.startSession).not.toHaveBeenCalled();
    });

    it('says so when MetaMask returns no token', async () => {
      mockVerifyOrEnroll.mockResolvedValue({});
      const screen = render('mfa');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText(/MetaMask couldn’t confirm your email/u),
      ).toBeOnTheScreen();
      expect(flow.startSession).not.toHaveBeenCalled();
    });

    it('stays quiet when the user cancels MFA', async () => {
      mockVerifyOrEnroll.mockRejectedValue(new MfaFlowError('flow_cancelled'));
      const screen = render('mfa');

      fireEvent.press(primary(screen));

      await waitFor(() => expect(mockVerifyOrEnroll).toHaveBeenCalled());
      expect(screen.queryByTestId(KalshiOnboardingTestIds.ERROR)).toBeNull();
      expect(flow.startSession).not.toHaveBeenCalled();
    });
  });

  describe('identity verification', () => {
    it('asks for the email code idOS is waiting for', async () => {
      const screen = render('kalshi_email_link');
      expect(await screen.findByText('Check your email')).toBeOnTheScreen();
      typeInto(screen, ' 123456 ');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.submitEmailCode).toHaveBeenCalledWith({
          vendor: 'kalshi',
          code: '123456',
        }),
      );
    });

    it('signs a corrected email into a new link on the same session', async () => {
      const screen = render('kalshi_email_link');
      await screen.findByText('Check your email');

      fireEvent.press(screen.getByTestId(KalshiOnboardingTestIds.SECONDARY));
      expect(
        await screen.findByText(
          'Kalshi creates your account with this email and sends you a code. It can differ from your MetaMask email.',
        ),
      ).toBeOnTheScreen();
      typeInto(screen, '  other@b.co ');
      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.resendEmailCode).toHaveBeenCalledWith({
          vendor: 'kalshi',
          email: 'other@b.co',
        }),
      );
    });

    it('asks for the phone, then its code', async () => {
      const screen = render('kalshi_phone_link');
      expect(await screen.findByText('Your phone')).toBeOnTheScreen();
      typeInto(screen, '+18888888888');

      fireEvent.press(primary(screen));

      expect(await screen.findByText('Check your phone')).toBeOnTheScreen();
      expect(flow.submitPhone).toHaveBeenCalledWith({
        vendor: 'kalshi',
        phoneNumber: '+18888888888',
      });
      typeInto(screen, '888888');
      fireEvent.press(primary(screen));
      await waitFor(() =>
        expect(flow.submitPhoneCode).toHaveBeenCalledWith({
          vendor: 'kalshi',
          code: '888888',
        }),
      );
    });

    it('goes back to the phone field to use another number', async () => {
      const screen = render('kalshi_phone_link');
      await screen.findByText('Your phone');
      typeInto(screen, '+18888888888');
      fireEvent.press(primary(screen));
      await screen.findByText('Check your phone');

      fireEvent.press(screen.getByTestId(KalshiOnboardingTestIds.SECONDARY));

      expect(await screen.findByText('Your phone')).toBeOnTheScreen();
    });

    it('records the consents, then launches SumSub', async () => {
      const screen = render('sumsub');
      await screen.findByText('Verify your identity');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.launchProviderFlow).toHaveBeenCalledWith({
          vendor: 'kalshi',
          locale: 'en',
        }),
      );
      expect(flow.acceptSessionDisclaimers).toHaveBeenCalledWith({
        vendor: 'kalshi',
        idOS: [{ key: 'idos', version: '1' }],
        kycProvider: [{ key: 'sumsub', version: '2' }],
        credentialReusabilityConsentGiven: false,
      });
      expect(
        flow.acceptSessionDisclaimers.mock.invocationCallOrder[0],
      ).toBeLessThan(flow.launchProviderFlow.mock.invocationCallOrder[0]);
    });

    it('does not record consents twice', async () => {
      flow.fetchSessionDisclaimers.mockResolvedValue({
        idOS: [{ key: 'idos', version: '1', consented: true }],
        kycProvider: [{ key: 'sumsub', version: '2', consented: true }],
        credentialReusabilityConsentGiven: false,
      });
      const screen = render('sumsub');
      await screen.findByText('Verify your identity');

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.launchProviderFlow).toHaveBeenCalled());
      expect(flow.acceptSessionDisclaimers).not.toHaveBeenCalled();
    });

    it('says so when SumSub could not finish', async () => {
      flow.launchProviderFlow.mockResolvedValue('failed');
      const screen = render('sumsub');
      await screen.findByText('Verify your identity');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText('SumSub could not finish.'),
      ).toBeOnTheScreen();
    });

    it('stays quiet when the user closes SumSub early', async () => {
      flow.launchProviderFlow.mockResolvedValue('abandoned');
      const screen = render('sumsub');
      await screen.findByText('Verify your identity');

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.launchProviderFlow).toHaveBeenCalled());
      expect(screen.queryByTestId(KalshiOnboardingTestIds.ERROR)).toBeNull();
    });

    it('opens SumSub again after a retry', () => {
      const screen = render('sumsub', 'retry');

      expect(screen.getByText('Verify your identity')).toBeOnTheScreen();
    });
  });

  describe('after an action', () => {
    it('does not ask kyc-api for the step again', async () => {
      const screen = render('terms');
      await screen.findByText('Terms');
      flow.refreshStep.mockClear();

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.acceptTerms).toHaveBeenCalled());
      expect(flow.refreshStep).not.toHaveBeenCalled();
    });
  });

  describe('waiting', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('keeps asking kyc-api while the decision is pending', async () => {
      jest.useFakeTimers();
      flow.refreshStep.mockResolvedValue('decision');
      render('decision', 'pending');
      await act(async () => undefined);
      flow.refreshStep.mockClear();

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(flow.refreshStep).toHaveBeenCalledTimes(2);
    });

    it('slows the polling down as the wait goes on', async () => {
      jest.useFakeTimers();
      flow.refreshStep.mockResolvedValue('decision');
      render('decision', 'pending');
      await act(async () => undefined);
      flow.refreshStep.mockClear();

      // The first minute: every 5 seconds.
      for (let i = 0; i < 12; i += 1) {
        await act(async () => {
          jest.advanceTimersByTime(5000);
        });
      }
      expect(flow.refreshStep).toHaveBeenCalledTimes(12);

      // Then every 15 seconds, not every 5.
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });
      expect(flow.refreshStep).toHaveBeenCalledTimes(12);
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(flow.refreshStep).toHaveBeenCalledTimes(13);
    });

    it('stops asking once the screen closes', async () => {
      jest.useFakeTimers();
      flow.refreshStep.mockResolvedValue('decision');
      const screen = render('decision', 'pending');
      await act(async () => undefined);
      screen.unmount();
      flow.refreshStep.mockClear();

      await act(async () => {
        jest.advanceTimersByTime(20000);
      });

      expect(flow.refreshStep).not.toHaveBeenCalled();
    });

    it('checks again on request', async () => {
      flow.refreshStep.mockResolvedValue('decision');
      const screen = render('decision', 'pending');
      await waitFor(() => expect(flow.refreshStep).toHaveBeenCalledTimes(1));

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.refreshStep).toHaveBeenCalledTimes(2));
    });
  });

  describe('end states', () => {
    it.each([
      ['rejected', 'Verification failed'],
      ['approved', 'Identity verified'],
    ] as const)(
      'a %s decision ends on a screen the user can close',
      async (status, title) => {
        flow.refreshStep.mockResolvedValue('decision');
        const screen = render('decision', status);
        expect(screen.getByText(title)).toBeOnTheScreen();

        fireEvent.press(primary(screen));

        expect(mockGoBack).toHaveBeenCalled();
      },
    );

    it('lets the user try again from an unknown step', async () => {
      flow.refreshStep.mockResolvedValue('error');
      const screen = render('error');
      expect(screen.getByText('Can’t finish setup')).toBeOnTheScreen();
      await waitFor(() => expect(flow.refreshStep).toHaveBeenCalledTimes(1));

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.refreshStep).toHaveBeenCalledTimes(2));
    });
  });

  describe('relay error codes', () => {
    it('keeps a wrong email code on the code screen and says so', async () => {
      flow.submitEmailCode.mockRejectedValue(
        new KycApiError(400, 'Bad code', 'invalid_or_expired_code'),
      );
      const screen = render('kalshi_email_link');
      await screen.findByText('Check your email');
      typeInto(screen, '000000');

      fireEvent.press(primary(screen));

      const error = await screen.findByTestId(KalshiOnboardingTestIds.ERROR);
      expect(error.props.children).toMatchInlineSnapshot(
        `"That code is wrong or has expired. Check it and try again, or send a new code."`,
      );
      expect(screen.getByText('Check your email')).toBeOnTheScreen();
      expect(Engine.controllerMessenger.call).not.toHaveBeenCalledWith(
        'PredictDeviceAuthService:clear',
      );
    });

    it('asks to try again when Kalshi keeps rejecting the request', async () => {
      flow.submitEmailCode.mockRejectedValue(
        new KycApiError(400, 'Rejected', 'kalshi_signed_request_rejected'),
      );
      const screen = render('kalshi_email_link');
      await screen.findByText('Check your email');
      typeInto(screen, '123456');

      fireEvent.press(primary(screen));

      const error = await screen.findByTestId(KalshiOnboardingTestIds.ERROR);
      expect(error.props.children).toMatchInlineSnapshot(
        `"Kalshi couldn’t confirm this request. Try again."`,
      );
      expect(flow.submitEmailCode).toHaveBeenCalledTimes(2);
      expect(primary(screen).props.accessibilityState?.disabled).toBe(false);
    });

    it('asks kyc-api where the user is when the session is past the email code', async () => {
      flow.submitEmailCode.mockRejectedValue(
        new KycApiError(
          412,
          'Not waiting',
          'session_not_in_email_verification',
        ),
      );
      const screen = render('kalshi_email_link');
      await screen.findByText('Check your email');
      await waitFor(() => expect(flow.refreshStep).toHaveBeenCalledTimes(1));
      typeInto(screen, '123456');

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.refreshStep).toHaveBeenCalledTimes(2));
      expect(
        screen.queryByTestId(KalshiOnboardingTestIds.ERROR),
      ).not.toBeOnTheScreen();
    });

    it('words a request kyc-api refused as a failed send', async () => {
      flow.submitEmailCode.mockRejectedValue(
        new KycApiError(400, 'x', 'kalshi_signed_request_body_invalid'),
      );
      const screen = render('kalshi_email_link');
      await screen.findByText('Check your email');
      typeInto(screen, '123456');

      fireEvent.press(primary(screen));

      const error = await screen.findByTestId(KalshiOnboardingTestIds.ERROR);
      expect(error.props.children).toMatchInlineSnapshot(
        `"MetaMask couldn’t send this request to Kalshi. Try again. (kalshi_signed_request_body_invalid)"`,
      );
    });

    it('shows the phone screen error when the user already has a Kalshi account', async () => {
      flow.submitPhone.mockRejectedValue(
        new KycApiError(400, 'exists', 'kalshi_account_exists'),
      );
      const screen = render('kalshi_phone_link');
      await screen.findByText('Your phone');
      typeInto(screen, '+18888888888');

      fireEvent.press(primary(screen));

      const error = await screen.findByTestId(KalshiOnboardingTestIds.ERROR);
      expect(error.props.children).toMatchInlineSnapshot(
        `"This phone number already has a Kalshi account. Linking an existing account isn’t supported yet."`,
      );
      expect(screen.getByText('Your phone')).toBeOnTheScreen();
    });

    it('asks for the address again when the phone no longer knows it', async () => {
      const screen = render('kalshi_email_link');
      await screen.findByText('Check your email');

      fireEvent.press(screen.getByTestId(KalshiOnboardingTestIds.RESEND));

      expect(await screen.findByText('Your email')).toBeOnTheScreen();
      expect(flow.resendEmailCode).not.toHaveBeenCalled();
    });

    it('sends a new code to the address that was last linked', async () => {
      const screen = render('kalshi_email_link');
      await screen.findByText('Check your email');
      fireEvent.press(screen.getByTestId(KalshiOnboardingTestIds.SECONDARY));
      await screen.findByText('Your email');
      typeInto(screen, 'other@b.co');
      fireEvent.press(primary(screen));
      await screen.findByText('Check your email');

      fireEvent.press(screen.getByTestId(KalshiOnboardingTestIds.RESEND));

      await waitFor(() =>
        expect(flow.resendEmailCode).toHaveBeenCalledTimes(2),
      );
      expect(flow.resendEmailCode).toHaveBeenLastCalledWith({
        vendor: 'kalshi',
        email: 'other@b.co',
      });
    });
  });

  describe('errors', () => {
    it('signs again once after Kalshi rejects the A2T', async () => {
      flow.startSession.mockRejectedValueOnce(
        new KycApiError(
          400,
          'Kalshi refused the token',
          'kalshi_signed_request_rejected',
        ),
      );
      const screen = await reachEmail();
      typeInto(screen, 'a@b.co');

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.startSession).toHaveBeenCalledTimes(2));
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'PredictDeviceAuthService:clear',
      );
      expect(screen.queryByTestId(KalshiOnboardingTestIds.ERROR)).toBeNull();
    });

    it('shows what went wrong with the status and code', async () => {
      flow.startSession.mockRejectedValue(
        Object.assign(new Error('Kalshi refused'), {
          status: 409,
          code: 'onboarding_conflict',
        }),
      );
      const screen = await reachEmail();
      typeInto(screen, 'a@b.co');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText('Kalshi refused · onboarding_conflict · 409'),
      ).toBeOnTheScreen();
    });

    it('shows a plain message for something that is not an error', async () => {
      flow.startSession.mockRejectedValue('nope');
      const screen = await reachEmail();
      typeInto(screen, 'a@b.co');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText('Something went wrong.'),
      ).toBeOnTheScreen();
    });

    it('clears the message when the user tries again', async () => {
      flow.startSession.mockRejectedValueOnce(new Error('first'));
      const screen = await reachEmail();
      typeInto(screen, 'a@b.co');
      fireEvent.press(primary(screen));
      await screen.findByText('first');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(screen.queryByTestId(KalshiOnboardingTestIds.ERROR)).toBeNull(),
      );
    });
  });

  it('goes back', () => {
    const screen = render('mfa');

    fireEvent.press(screen.getByText('Back'));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
