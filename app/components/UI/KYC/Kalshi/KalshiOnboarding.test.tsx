import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  KycApiError,
  type KycStep,
  type KycStepStatus,
} from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { MfaFlowError } from '../../../../util/identity/mfa/engine/errors';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { trackKycEvent } from '../utils/trackKycEvent';
import KalshiOnboarding, { KalshiOnboardingTestIds } from './KalshiOnboarding';
import { KalshiTermsSelectorsIDs } from './KalshiTerms.testIds';
import {
  KycPartnerTermsSelectorsIDs,
  KycVerifyIdentitySelectorsIDs,
} from '../Views/SumSub/VerifyIdentity.testIds';

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

jest.mock('../utils/trackKycEvent', () => ({
  trackKycEvent: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => {
  const engine = {
    controllerMessenger: { call: jest.fn() },
    context: {
      VendorOnboardingController: {
        refreshStep: jest.fn(),
        recordMfaCompleted: jest.fn(),
        submitTerms: jest.fn(),
        startSession: jest.fn(),
        getPartnerEmail: jest.fn(),
        fetchSessionDisclaimers: jest.fn(),
        launchProviderFlow: jest.fn(),
        sendPhoneOtp: jest.fn(),
        verifyPhoneOtp: jest.fn(),
        verifyEmailOtp: jest.fn(),
        sendEmailOtp: jest.fn(),
      },
      KycService: {
        getGeoCountry: jest.fn(),
        fetchVendorDisclaimers: jest.fn(),
      },
      KycController: {
        state: { geoCountry: 'USA' },
        fetchSessionDisclaimers: jest.fn(),
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
const kycController = Engine.context.KycController as unknown as {
  state: { geoCountry?: string };
  fetchSessionDisclaimers: jest.Mock;
};

const KALSHI_TERMS = [
  { id: 'tos-v1', url: 'https://kalshi.example/tos', display_name: 'Terms' },
  {
    id: 'privacy-v1',
    url: 'https://kalshi.example/p',
    display_name: 'Privacy',
  },
];

const render = (
  step?: KycStep,
  status: KycStepStatus = 'none',
  mfaCompleted = false,
) =>
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
                    mfaCompleted,
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

/**
 * Accepts the shared MetaMask consent page. The document pages come after it.
 *
 * @param screen - The rendered Kalshi flow, on the terms step.
 */
async function agreeToMetaMaskTerms(screen: ReturnType<typeof render>) {
  expect(await screen.findByText('Verify your identity')).toBeOnTheScreen();
  const button = await screen.findByTestId(
    KycVerifyIdentitySelectorsIDs.CONTINUE_BUTTON,
  );
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.press(button);
}

/**
 * Accepts the shared partner-terms page. The Kalshi page comes after it.
 *
 * @param screen - The rendered Kalshi flow, on the partner-terms page.
 */
async function agreeToPartnerTerms(screen: ReturnType<typeof render>) {
  expect(
    await screen.findByText('Our verification partners'),
  ).toBeOnTheScreen();
  fireEvent(
    screen.getByTestId(KycPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX),
    'change',
    true,
  );
  fireEvent.press(screen.getByTestId(KycPartnerTermsSelectorsIDs.AGREE_BUTTON));
}

const typeInto = (screen: ReturnType<typeof render>, value: string) =>
  fireEvent.changeText(
    screen.getByTestId(KalshiOnboardingTestIds.INPUT),
    value,
  );

/**
 * Confirms with MetaMask on `mfa`.
 *
 * @returns The rendered screen, still on the confirm step.
 */
async function confirmWithMetaMask() {
  const screen = render('mfa');
  fireEvent.press(primary(screen));
  await waitFor(() => expect(flow.recordMfaCompleted).toHaveBeenCalled());
  return screen;
}

/**
 * The Kalshi email step, before the code was sent from this screen.
 *
 * @returns The rendered screen, showing the email field.
 */
async function reachEmailEntry() {
  const screen = render('kalshi_email_link');
  await screen.findByText('Your email');
  return screen;
}

/**
 * Sends the email from the email step, which opens the session and sends the
 * code.
 *
 * @returns The rendered screen, showing the code field.
 */
async function reachEmailCode() {
  const screen = await reachEmailEntry();
  typeInto(screen, 'kalshi@b.co');
  fireEvent.press(primary(screen));
  await screen.findByText('Check your email');
  return screen;
}

describe('KalshiOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    flow.refreshStep.mockResolvedValue('terms');
    flow.getPartnerEmail.mockResolvedValue(undefined);
    for (const name of [
      'recordMfaCompleted',
      'submitTerms',
      'startSession',
      'sendPhoneOtp',
      'verifyPhoneOtp',
      'verifyEmailOtp',
      'sendEmailOtp',
    ]) {
      flow[name].mockResolvedValue('sumsub');
    }
    flow.launchProviderFlow.mockResolvedValue('submitted');
    kycController.state = { geoCountry: 'USA' };
    service.getGeoCountry.mockResolvedValue('USA');
    service.fetchVendorDisclaimers.mockResolvedValue(KALSHI_TERMS);
    kycController.fetchSessionDisclaimers.mockResolvedValue({
      idOS: [
        {
          key: 'idos',
          version: '1',
          title: 'idOS Terms of Use',
          url: 'https://idos.example/t',
        },
      ],
      kycProvider: [
        {
          key: 'sumsub',
          version: '2',
          title: 'SumSub Terms of Use',
          url: 'https://sumsub.example/t',
        },
      ],
    });
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
        'MetaMask confirms it’s you. Then you choose the email for Kalshi.',
      ),
    ).toBeOnTheScreen();
  });

  describe('terms', () => {
    const acceptAllPages = async (screen: ReturnType<typeof render>) => {
      await agreeToMetaMaskTerms(screen);
      await agreeToPartnerTerms(screen);
      await screen.findByText('Kalshi terms');
      fireEvent(
        screen.getByTestId(KalshiTermsSelectorsIDs.SOCURE_CONSENT_CHECKBOX),
        'change',
        true,
      );
      fireEvent.press(screen.getByTestId(KalshiTermsSelectorsIDs.AGREE_BUTTON));
    };

    it('does not show the confirm page again while terms are still loading', async () => {
      let resolveMfa: (step: string) => void = () => undefined;
      flow.recordMfaCompleted.mockReturnValue(
        new Promise((resolve) => {
          resolveMfa = resolve;
        }),
      );
      const screen = render('mfa');

      fireEvent.press(primary(screen));
      expect(
        await screen.findByTestId(KalshiOnboardingTestIds.LOADER),
      ).toBeOnTheScreen();

      await act(async () => {
        resolveMfa('terms');
      });

      expect(
        screen.getByTestId(KalshiOnboardingTestIds.LOADER),
      ).toBeOnTheScreen();
      expect(screen.queryByText('Confirm with MetaMask')).toBeNull();
    });

    it('shows the MetaMask consent page while the later terms are still loading', async () => {
      let resolveTerms: (value: unknown) => void = () => undefined;
      service.fetchVendorDisclaimers.mockReturnValue(
        new Promise((resolve) => {
          resolveTerms = resolve;
        }),
      );
      const screen = render('terms');

      expect(await screen.findByText('Verify your identity')).toBeOnTheScreen();
      expect(
        screen.getByText(/transferring my information to idOS and Kalshi/u),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId(KalshiOnboardingTestIds.LOADER)).toBeNull();
      expect(screen.queryByText('Kalshi terms')).toBeNull();

      await agreeToMetaMaskTerms(screen);
      expect(
        await screen.findByText('Our verification partners'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Step 2 of 3')).toBeOnTheScreen();

      await agreeToPartnerTerms(screen);

      expect(
        await screen.findByTestId(KalshiOnboardingTestIds.LOADER),
      ).toBeOnTheScreen();

      await act(async () => {
        resolveTerms(KALSHI_TERMS);
      });

      expect(await screen.findByText('Kalshi terms')).toBeOnTheScreen();
      expect(screen.getByText('Step 3 of 3')).toBeOnTheScreen();
      expect(screen.queryByTestId(KalshiOnboardingTestIds.LOADER)).toBeNull();
    });

    it('shows MetaMask, partner, and Kalshi terms as three pages', async () => {
      const screen = render('terms');

      expect(await screen.findByText('Step 1 of 3')).toBeOnTheScreen();
      await agreeToMetaMaskTerms(screen);
      expect(await screen.findByText('Step 2 of 3')).toBeOnTheScreen();
      await agreeToPartnerTerms(screen);
      expect(await screen.findByText('Kalshi terms')).toBeOnTheScreen();
      expect(screen.getByText('Step 3 of 3')).toBeOnTheScreen();
      expect(service.fetchVendorDisclaimers).toHaveBeenCalledWith({
        vendor: 'kalshi',
        country: 'USA',
      });
    });

    it('loads the Kalshi terms for the country stored on the KYC controller', async () => {
      kycController.state = { geoCountry: 'CAN' };
      service.getGeoCountry.mockResolvedValue('USA');

      const screen = render('terms');
      await agreeToMetaMaskTerms(screen);
      await agreeToPartnerTerms(screen);

      expect(await screen.findByText('Kalshi terms')).toBeOnTheScreen();
      expect(service.fetchVendorDisclaimers).toHaveBeenCalledWith({
        vendor: 'kalshi',
        country: 'CAN',
      });
      expect(kycController.fetchSessionDisclaimers).toHaveBeenCalledWith({
        country: 'CAN',
      });
    });

    it('falls back to the detected country when none is stored', async () => {
      kycController.state = {};
      service.getGeoCountry.mockResolvedValue('FRA');

      const screen = render('terms');
      await agreeToMetaMaskTerms(screen);
      await agreeToPartnerTerms(screen);

      expect(await screen.findByText('Kalshi terms')).toBeOnTheScreen();
      expect(service.fetchVendorDisclaimers).toHaveBeenCalledWith({
        vendor: 'kalshi',
        country: 'FRA',
      });
    });

    it('links to the Kalshi documents on the last page', async () => {
      const screen = render('terms');
      await agreeToMetaMaskTerms(screen);
      await agreeToPartnerTerms(screen);
      await screen.findByText('Kalshi terms');

      fireEvent.press(screen.getByText('Terms'));
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://kalshi.example/tos',
      );
    });

    it('keeps the VBA identity-terms event off the Kalshi consent pages', async () => {
      const screen = render('terms');
      await acceptAllPages(screen);

      await waitFor(() => expect(flow.submitTerms).toHaveBeenCalledTimes(1));
      expect(trackKycEvent).not.toHaveBeenCalled();
    });

    it('shows a failed submission on the Kalshi page and lets the user retry', async () => {
      flow.submitTerms.mockRejectedValueOnce(new Error('Kalshi is down'));
      const screen = render('terms');

      await acceptAllPages(screen);

      expect(
        await screen.findByTestId(KalshiTermsSelectorsIDs.ERROR),
      ).toHaveTextContent(/Kalshi is down/u);
      expect(screen.getByText('Kalshi terms')).toBeOnTheScreen();
      await waitFor(() =>
        expect(
          screen.getByTestId(KalshiTermsSelectorsIDs.AGREE_BUTTON),
        ).toBeEnabled(),
      );

      fireEvent.press(screen.getByTestId(KalshiTermsSelectorsIDs.AGREE_BUTTON));

      await waitFor(() => expect(flow.submitTerms).toHaveBeenCalledTimes(2));
    });

    it('goes back a page without sending anything', async () => {
      const screen = render('terms');
      await agreeToMetaMaskTerms(screen);
      await screen.findByText('Our verification partners');

      fireEvent.press(
        screen.getByTestId(KycPartnerTermsSelectorsIDs.BACK_BUTTON),
      );

      expect(await screen.findByText('Verify your identity')).toBeOnTheScreen();
      await agreeToMetaMaskTerms(screen);
      await agreeToPartnerTerms(screen);
      await screen.findByText('Kalshi terms');

      fireEvent.press(screen.getByTestId(KalshiTermsSelectorsIDs.BACK_BUTTON));

      expect(
        await screen.findByText('Our verification partners'),
      ).toBeOnTheScreen();
      expect(flow.submitTerms).not.toHaveBeenCalled();
    });

    it('leaves the flow from the MetaMask page with the header back button', async () => {
      const screen = render('terms');
      await screen.findByText('Verify your identity');

      fireEvent.press(
        screen.getByTestId(KycVerifyIdentitySelectorsIDs.BACK_BUTTON),
      );

      expect(mockGoBack).toHaveBeenCalled();
      expect(flow.submitTerms).not.toHaveBeenCalled();
    });

    it('sends every acceptance in one call after the last page', async () => {
      const screen = render('terms');

      await acceptAllPages(screen);

      await waitFor(() => expect(flow.submitTerms).toHaveBeenCalledTimes(1));
      expect(flow.submitTerms.mock.calls[0][0]).toMatchInlineSnapshot(`
        {
          "credentialReusabilityConsentGiven": false,
          "disclaimerIds": [
            "tos-v1",
            "privacy-v1",
          ],
          "idOS": [
            {
              "key": "idos",
              "version": "1",
            },
          ],
          "kycProvider": [
            {
              "key": "sumsub",
              "version": "2",
            },
          ],
          "vendor": "kalshi",
        }
      `);
    });
  });

  describe('confirm with MetaMask', () => {
    it('says MFA is done and retries the step without asking again', async () => {
      flow.recordMfaCompleted.mockResolvedValue('mfa');
      flow.startSession.mockResolvedValue('mfa');
      const screen = render('mfa', 'none', true);

      expect(
        screen.getByText('MetaMask confirmed you. Continue to the terms.'),
      ).toBeOnTheScreen();
      fireEvent.press(primary(screen));

      expect(
        await screen.findByText(/setup didn’t move on/u),
      ).toBeOnTheScreen();
      expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
      expect(flow.recordMfaCompleted).toHaveBeenCalledTimes(1);
      expect(flow.startSession).toHaveBeenCalledTimes(1);
    });

    it('does not ask MetaMask again after a confirm that stayed on MFA', async () => {
      flow.recordMfaCompleted.mockResolvedValue('mfa');
      flow.startSession.mockResolvedValue('mfa');
      const screen = render('mfa');

      fireEvent.press(primary(screen));
      expect(
        await screen.findByText(/setup didn’t move on/u),
      ).toBeOnTheScreen();

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.recordMfaCompleted).toHaveBeenCalledTimes(2),
      );
      expect(mockVerifyOrEnroll).toHaveBeenCalledTimes(1);
    });

    it('records that MFA is done without opening a session', async () => {
      const screen = await confirmWithMetaMask();

      expect(flow.recordMfaCompleted).toHaveBeenCalledWith({
        vendor: 'kalshi',
      });
      expect(flow.startSession).not.toHaveBeenCalled();
      expect(screen.queryByText('Your email')).toBeNull();
    });

    it('resumes the open session when kyc-api still asks for MFA', async () => {
      flow.recordMfaCompleted.mockResolvedValue('mfa');
      flow.startSession.mockResolvedValue('kalshi_phone_link');
      const screen = render('mfa', 'none', true);

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.startSession).toHaveBeenCalledWith({ vendor: 'kalshi' }),
      );
      expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
      expect(screen.queryByTestId(KalshiOnboardingTestIds.ERROR)).toBeNull();
    });

    it('opens the session with the MFA token and the typed email', async () => {
      const screen = await reachEmailEntry();
      typeInto(screen, '  kalshi@b.co ');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.startSession).toHaveBeenCalledWith({
          vendor: 'kalshi',
          aal2Token: 'aal2',
          email: 'kalshi@b.co',
        }),
      );
      expect(flow.sendEmailOtp).not.toHaveBeenCalled();
    });

    it('starts the field with the verified MetaMask email and opens the session with it', async () => {
      flow.getPartnerEmail.mockResolvedValue('ann+kalshi@example.com');
      const screen = await reachEmailEntry();

      await waitFor(() =>
        expect(primary(screen).props.accessibilityState?.disabled).toBeFalsy(),
      );
      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.startSession).toHaveBeenCalledWith({
          vendor: 'kalshi',
          aal2Token: 'aal2',
          email: 'ann+kalshi@example.com',
        }),
      );
      expect(flow.getPartnerEmail).toHaveBeenCalledWith({ vendor: 'kalshi' });
    });

    it('leaves the field empty when the verified email cannot be read', async () => {
      flow.getPartnerEmail.mockRejectedValue(new Error('offline'));
      const screen = await reachEmailEntry();

      await waitFor(() => expect(flow.getPartnerEmail).toHaveBeenCalled());

      expect(primary(screen).props.accessibilityState?.disabled).toBe(true);
    });

    it('does not send an empty email', async () => {
      const screen = await reachEmailEntry();

      expect(primary(screen).props.accessibilityState?.disabled).toBe(true);
      expect(flow.startSession).not.toHaveBeenCalled();
    });

    it('asks MetaMask to confirm again when the email step opens a session without a token', async () => {
      const screen = await reachEmailEntry();
      typeInto(screen, 'kalshi@b.co');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.startSession).toHaveBeenCalledWith({
          vendor: 'kalshi',
          aal2Token: 'aal2',
          email: 'kalshi@b.co',
        }),
      );
      expect(mockVerifyOrEnroll).toHaveBeenCalledTimes(1);
    });

    it('stops holding the confirm screen once the controller step reaches terms', async () => {
      const screen = render('mfa');
      flow.recordMfaCompleted.mockImplementationOnce(async () => {
        const engine = Engine as unknown as { state?: unknown };
        engine.state = {
          VendorOnboardingController: {
            vendors: {
              kalshi: { step: 'terms', status: 'none', mfaCompleted: true },
            },
          },
        };
        act(() => {
          screen.store.dispatch(
            updateBgState({ key: 'VendorOnboardingController' }),
          );
        });
        return 'terms';
      });

      fireEvent.press(primary(screen));

      expect(await screen.findByText('Verify your identity')).toBeOnTheScreen();
      expect(screen.queryByTestId(KalshiOnboardingTestIds.LOADER)).toBeNull();
    });

    it('shows the error and the confirm button again when recording MFA fails', async () => {
      flow.recordMfaCompleted.mockRejectedValueOnce(
        new Error('kyc-api is unavailable'),
      );
      const screen = render('mfa');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText('kyc-api is unavailable'),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId(KalshiOnboardingTestIds.LOADER)).toBeNull();
      expect(primary(screen)).toBeOnTheScreen();
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

    it('signs again once after Kalshi rejects the A2T', async () => {
      flow.startSession.mockRejectedValueOnce(
        new KycApiError(
          400,
          'Kalshi refused the token',
          'kalshi_signed_request_rejected',
        ),
      );
      const screen = await reachEmailEntry();
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
      const screen = await reachEmailEntry();
      typeInto(screen, 'a@b.co');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText('Kalshi refused · onboarding_conflict · 409'),
      ).toBeOnTheScreen();
    });

    it('shows a plain message for something that is not an error', async () => {
      flow.startSession.mockRejectedValue('nope');
      const screen = await reachEmailEntry();
      typeInto(screen, 'a@b.co');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText('Something went wrong.'),
      ).toBeOnTheScreen();
    });

    it('clears the message when the user tries again', async () => {
      flow.startSession.mockRejectedValueOnce(new Error('first'));
      const screen = await reachEmailEntry();
      typeInto(screen, 'a@b.co');
      fireEvent.press(primary(screen));
      await screen.findByText('first');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(screen.queryByTestId(KalshiOnboardingTestIds.ERROR)).toBeNull(),
      );
    });
  });

  describe('identity verification', () => {
    it('asks for the code the new session sent', async () => {
      const screen = await reachEmailCode();

      expect(
        screen.getByTestId(KalshiOnboardingTestIds.INPUT),
      ).toBeOnTheScreen();
      expect(flow.startSession).toHaveBeenCalledTimes(1);
      expect(flow.sendEmailOtp).not.toHaveBeenCalled();
    });

    it('verifies the email code idOS is waiting for', async () => {
      const screen = await reachEmailCode();
      typeInto(screen, ' 123456 ');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.verifyEmailOtp).toHaveBeenCalledWith({
          vendor: 'kalshi',
          code: '123456',
        }),
      );
    });

    it('signs a corrected email into a new link on the same session', async () => {
      const screen = await reachEmailCode();

      fireEvent.press(screen.getByTestId(KalshiOnboardingTestIds.SECONDARY));
      await screen.findByText('Your email');
      typeInto(screen, '  other@b.co ');
      fireEvent.press(primary(screen));

      expect(await screen.findByText('Check your email')).toBeOnTheScreen();
      expect(flow.sendEmailOtp).toHaveBeenCalledWith({
        vendor: 'kalshi',
        email: 'other@b.co',
      });
      expect(flow.startSession).toHaveBeenCalledTimes(1);
    });

    it('sends a new code to the address that was last sent', async () => {
      const screen = await reachEmailCode();

      fireEvent.press(screen.getByTestId(KalshiOnboardingTestIds.RESEND));

      await waitFor(() =>
        expect(flow.sendEmailOtp).toHaveBeenCalledWith({
          vendor: 'kalshi',
          email: 'kalshi@b.co',
        }),
      );
      expect(flow.startSession).toHaveBeenCalledTimes(1);
    });

    it('asks for the phone, then its code', async () => {
      const screen = render('kalshi_phone_link');
      expect(await screen.findByText('Your phone')).toBeOnTheScreen();
      typeInto(screen, '+18888888888');

      fireEvent.press(primary(screen));

      expect(await screen.findByText('Check your phone')).toBeOnTheScreen();
      expect(flow.sendPhoneOtp).toHaveBeenCalledWith({
        vendor: 'kalshi',
        phoneNumber: '+18888888888',
      });
      typeInto(screen, '888888');
      fireEvent.press(primary(screen));
      await waitFor(() =>
        expect(flow.verifyPhoneOtp).toHaveBeenCalledWith({
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

    it('launches SumSub', async () => {
      const screen = render('sumsub');
      await screen.findByText('Verify your identity');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.launchProviderFlow).toHaveBeenCalledWith({
          vendor: 'kalshi',
          locale: 'en',
        }),
      );
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
      const screen = render('sumsub');
      await screen.findByText('Verify your identity');
      flow.refreshStep.mockClear();

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.launchProviderFlow).toHaveBeenCalled());
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
      flow.verifyEmailOtp.mockRejectedValue(
        new KycApiError(400, 'Bad code', 'invalid_or_expired_code'),
      );
      const screen = await reachEmailCode();
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
      flow.verifyEmailOtp.mockRejectedValue(
        new KycApiError(400, 'Rejected', 'kalshi_signed_request_rejected'),
      );
      const screen = await reachEmailCode();
      typeInto(screen, '123456');

      fireEvent.press(primary(screen));

      const error = await screen.findByTestId(KalshiOnboardingTestIds.ERROR);
      expect(error.props.children).toMatchInlineSnapshot(
        `"Kalshi couldn’t confirm this request. Try again."`,
      );
      expect(flow.verifyEmailOtp).toHaveBeenCalledTimes(2);
      expect(primary(screen).props.accessibilityState?.disabled).toBe(false);
    });

    it('asks kyc-api where the user is when the session is past the email code', async () => {
      flow.verifyEmailOtp.mockRejectedValue(
        new KycApiError(
          412,
          'Not waiting',
          'session_not_in_email_verification',
        ),
      );
      const screen = await reachEmailCode();
      await waitFor(() => expect(flow.refreshStep).toHaveBeenCalledTimes(1));
      typeInto(screen, '123456');

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.refreshStep).toHaveBeenCalledTimes(2));
      expect(
        screen.queryByTestId(KalshiOnboardingTestIds.ERROR),
      ).not.toBeOnTheScreen();
    });

    it('words a request kyc-api refused as a failed send', async () => {
      flow.verifyEmailOtp.mockRejectedValue(
        new KycApiError(400, 'x', 'kalshi_signed_request_body_invalid'),
      );
      const screen = await reachEmailCode();
      typeInto(screen, '123456');

      fireEvent.press(primary(screen));

      const error = await screen.findByTestId(KalshiOnboardingTestIds.ERROR);
      expect(error.props.children).toMatchInlineSnapshot(
        `"MetaMask couldn’t send this request to Kalshi. Try again. (kalshi_signed_request_body_invalid)"`,
      );
    });

    it('shows the phone screen error when the user already has a Kalshi account', async () => {
      flow.sendPhoneOtp.mockRejectedValue(
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
  });

  it('goes back', () => {
    const screen = render('mfa');

    fireEvent.press(screen.getByText('Back'));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
