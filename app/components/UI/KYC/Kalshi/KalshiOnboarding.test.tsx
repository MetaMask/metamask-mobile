import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { KYC_CURRENT_STEPS, type KycStep } from '@metamask/kyc-controller';
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

jest.mock('../../../../core/Engine', () => ({
  context: {
    VendorOnboardingController: {
      state: { vendors: {} },
      refreshStep: jest.fn(),
      acceptTerms: jest.fn(),
      startAccountLink: jest.fn(),
      verifyAccountLink: jest.fn(),
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
      getSessionStatusForVendor: jest.fn(),
    },
  },
}));

const flow = Engine.context.VendorOnboardingController as unknown as Record<
  string,
  jest.Mock
>;
// The controller state the screen reads after an action. Tests set the step the
// action ended on.
const flowState = Engine.context.VendorOnboardingController as unknown as {
  state: { vendors: Record<string, { step: string }> };
};
const endActionOn = (step?: string): void => {
  flowState.state = { vendors: step ? { kalshi: { step } } : {} };
};

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

const render = (step?: KycStep) =>
  renderWithProvider(<KalshiOnboarding />, {
    state: {
      engine: {
        backgroundState: {
          VendorOnboardingController: {
            vendors: step ? { kalshi: { step, sessionId: 'sid-1' } } : {},
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

describe('KalshiOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    endActionOn();
    flow.refreshStep.mockResolvedValue('vendor_terms');
    for (const name of [
      'acceptTerms',
      'startAccountLink',
      'startSession',
      'acceptSessionDisclaimers',
      'submitPhone',
      'submitPhoneCode',
      'submitEmailCode',
      'resendEmailCode',
    ]) {
      flow[name].mockResolvedValue('identity_verification');
    }
    flow.verifyAccountLink.mockResolvedValue({ step: 'account_link_code' });
    flow.launchProviderFlow.mockResolvedValue('submitted');
    flow.fetchSessionDisclaimers.mockResolvedValue({
      idOS: [{ key: 'idos', version: '1', consented: false }],
      kycProvider: [{ key: 'sumsub', version: '2', consented: false }],
      credentialReusabilityConsentGiven: false,
    });
    service.getGeoCountry.mockResolvedValue('USA');
    service.fetchVendorDisclaimers.mockResolvedValue(TERMS);
    service.getSessionStatusForVendor.mockResolvedValue(null);
    mockVerifyOrEnroll.mockResolvedValue({ token: { accessToken: 'aal2' } });
  });

  it('asks kyc-api for the step when it opens, and shows nothing to do yet', async () => {
    flow.refreshStep.mockResolvedValue('vendor_terms');
    const screen = render();

    await waitFor(() =>
      expect(flow.refreshStep).toHaveBeenCalledWith({ vendor: 'kalshi' }),
    );
    expect(screen.queryByTestId(KalshiOnboardingTestIds.PRIMARY)).toBeNull();
  });

  it('keeps going when kyc-api cannot be reached', async () => {
    flow.refreshStep.mockRejectedValue(new Error('offline'));
    const screen = render('account_link');

    await waitFor(() => expect(flow.refreshStep).toHaveBeenCalled());
    expect(screen.getByText('Your email')).toBeOnTheScreen();
  });

  describe('terms', () => {
    it('loads the Kalshi terms for the user’s country and links to them', async () => {
      const screen = render('vendor_terms');

      expect(await screen.findByText('Terms')).toBeOnTheScreen();
      expect(service.fetchVendorDisclaimers).toHaveBeenCalledWith({
        vendor: 'kalshi',
        country: 'USA',
      });
      fireEvent.press(screen.getByText('Privacy'));
      expect(Linking.openURL).toHaveBeenCalledWith('https://kalshi.example/p');
    });

    it('records the acceptance with kyc-api', async () => {
      const screen = render('vendor_terms');
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

  describe('account link', () => {
    it('sends the trimmed email', async () => {
      const screen = render('account_link');
      typeInto(screen, '  a@b.co ');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.startAccountLink).toHaveBeenCalledWith({
          vendor: 'kalshi',
          email: 'a@b.co',
        }),
      );
    });

    it('does not send an empty email', () => {
      const screen = render('account_link');

      expect(primary(screen).props.accessibilityState?.disabled).toBe(true);
      expect(flow.startAccountLink).not.toHaveBeenCalled();
    });

    it('verifies the code', async () => {
      const screen = render('account_link_code');
      typeInto(screen, ' 888888 ');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.verifyAccountLink).toHaveBeenCalledWith({
          vendor: 'kalshi',
          code: '888888',
        }),
      );
    });

    it('asks for the second code when Kalshi wants one', async () => {
      flow.verifyAccountLink.mockResolvedValue({
        step: 'account_link_code',
        mfaMethod: 'sms',
      });
      const screen = render('account_link_code');
      typeInto(screen, '888888');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText(
          'Kalshi texted you a second code. Enter it here.',
        ),
      ).toBeOnTheScreen();
      // The field is empty again, so there is nothing to send yet.
      expect(primary(screen).props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('confirm with MetaMask', () => {
    it('opens the session with the MFA token', async () => {
      const screen = render('confirm_identity');

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.startSession).toHaveBeenCalledWith({
          vendor: 'kalshi',
          aal2Token: 'aal2',
        }),
      );
      expect(mockVerifyOrEnroll).toHaveBeenCalledWith(
        expect.objectContaining({ methods: ['email_otp'] }),
      );
    });

    it('leaves the email out when the screen was opened after the link', async () => {
      // The email only lives while the link screens are open, and kyc-api
      // already holds the Kalshi user, so a reopened screen sends none.
      const screen = render('confirm_identity');

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.startSession).toHaveBeenCalled());
      expect(flow.startSession.mock.calls[0][0]).not.toHaveProperty('email');
    });

    it('says so when MetaMask returns no token', async () => {
      mockVerifyOrEnroll.mockResolvedValue({});
      const screen = render('confirm_identity');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText(/MetaMask could not confirm your email/u),
      ).toBeOnTheScreen();
      expect(flow.startSession).not.toHaveBeenCalled();
    });

    it('stays quiet when the user cancels MFA', async () => {
      mockVerifyOrEnroll.mockRejectedValue(new MfaFlowError('flow_cancelled'));
      const screen = render('confirm_identity');

      fireEvent.press(primary(screen));

      await waitFor(() => expect(mockVerifyOrEnroll).toHaveBeenCalled());
      expect(screen.queryByTestId(KalshiOnboardingTestIds.ERROR)).toBeNull();
      expect(flow.startSession).not.toHaveBeenCalled();
    });
  });

  describe('identity verification', () => {
    const owes = (currentStep: string) =>
      service.getSessionStatusForVendor.mockResolvedValue({ currentStep });

    beforeEach(() => {
      flow.refreshStep.mockResolvedValue('identity_verification');
      endActionOn('identity_verification');
    });

    it('asks for the email code idOS is waiting for', async () => {
      owes(KYC_CURRENT_STEPS.emailOtpCollection);
      const screen = render('identity_verification');
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

    it('sends a new email code on request', async () => {
      owes(KYC_CURRENT_STEPS.emailOtpCollection);
      const screen = render('identity_verification');
      await screen.findByText('Check your email');

      fireEvent.press(screen.getByTestId(KalshiOnboardingTestIds.SECONDARY));

      await waitFor(() =>
        expect(flow.resendEmailCode).toHaveBeenCalledWith({ vendor: 'kalshi' }),
      );
    });

    it('asks for the phone, then its code', async () => {
      owes(KYC_CURRENT_STEPS.phoneOtpCollection);
      const screen = render('identity_verification');
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
      owes(KYC_CURRENT_STEPS.phoneOtpCollection);
      const screen = render('identity_verification');
      await screen.findByText('Your phone');
      typeInto(screen, '+18888888888');
      fireEvent.press(primary(screen));
      await screen.findByText('Check your phone');

      fireEvent.press(screen.getByTestId(KalshiOnboardingTestIds.SECONDARY));

      expect(await screen.findByText('Your phone')).toBeOnTheScreen();
    });

    it('records the consents, then launches SumSub', async () => {
      owes(KYC_CURRENT_STEPS.kyc);
      const screen = render('identity_verification');
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
      owes(KYC_CURRENT_STEPS.kyc);
      flow.fetchSessionDisclaimers.mockResolvedValue({
        idOS: [{ key: 'idos', version: '1', consented: true }],
        kycProvider: [{ key: 'sumsub', version: '2', consented: true }],
        credentialReusabilityConsentGiven: false,
      });
      const screen = render('identity_verification');
      await screen.findByText('Verify your identity');

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.launchProviderFlow).toHaveBeenCalled());
      expect(flow.acceptSessionDisclaimers).not.toHaveBeenCalled();
    });

    it('says so when SumSub could not finish', async () => {
      owes(KYC_CURRENT_STEPS.kyc);
      flow.launchProviderFlow.mockResolvedValue('failed');
      const screen = render('identity_verification');
      await screen.findByText('Verify your identity');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText('SumSub could not finish.'),
      ).toBeOnTheScreen();
    });

    it('stays quiet when the user closes SumSub early', async () => {
      owes(KYC_CURRENT_STEPS.kyc);
      flow.launchProviderFlow.mockResolvedValue('abandoned');
      const screen = render('identity_verification');
      await screen.findByText('Verify your identity');

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.launchProviderFlow).toHaveBeenCalled());
      expect(screen.queryByTestId(KalshiOnboardingTestIds.ERROR)).toBeNull();
    });

    it('opens SumSub again after a retry', () => {
      const screen = render('kyc_retry');

      expect(screen.getByText('Verify your identity')).toBeOnTheScreen();
    });
  });

  describe('after an action', () => {
    it('does not ask kyc-api for the step again', async () => {
      endActionOn('account_link');
      const screen = render('vendor_terms');
      await screen.findByText('Terms');
      flow.refreshStep.mockClear();

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.acceptTerms).toHaveBeenCalled());
      expect(flow.refreshStep).not.toHaveBeenCalled();
    });

    it('does not read idOS’s step when the action ended somewhere else', async () => {
      endActionOn('account_link_code');
      const screen = render('account_link');
      typeInto(screen, 'a@b.co');
      service.getSessionStatusForVendor.mockClear();

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.startAccountLink).toHaveBeenCalled());
      expect(service.getSessionStatusForVendor).not.toHaveBeenCalled();
    });

    it('reads idOS’s step when the action ended in identity verification', async () => {
      flow.refreshStep.mockResolvedValue('identity_verification');
      service.getSessionStatusForVendor.mockResolvedValue({
        currentStep: KYC_CURRENT_STEPS.emailOtpCollection,
      });
      endActionOn('identity_verification');
      const screen = render('confirm_identity');
      await waitFor(() => expect(flow.refreshStep).toHaveBeenCalled());
      service.getSessionStatusForVendor.mockClear();
      service.getSessionStatusForVendor.mockResolvedValue({
        currentStep: KYC_CURRENT_STEPS.phoneOtpCollection,
      });

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.startSession).toHaveBeenCalled());
      await waitFor(() =>
        expect(service.getSessionStatusForVendor).toHaveBeenCalledTimes(1),
      );
    });

    it('keeps going when idOS’s step cannot be read', async () => {
      endActionOn('identity_verification');
      service.getSessionStatusForVendor.mockRejectedValue(new Error('down'));
      flow.refreshStep.mockResolvedValue('identity_verification');
      const screen = render('identity_verification');
      await waitFor(() =>
        expect(service.getSessionStatusForVendor).toHaveBeenCalled(),
      );

      fireEvent.press(primary(screen));

      await waitFor(() =>
        expect(flow.fetchSessionDisclaimers).toHaveBeenCalled(),
      );
      expect(screen.queryByTestId(KalshiOnboardingTestIds.ERROR)).toBeNull();
    });
  });

  describe('waiting', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('keeps asking kyc-api while the decision is pending', async () => {
      jest.useFakeTimers();
      flow.refreshStep.mockResolvedValue('kyc_pending');
      render('kyc_pending');
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

    it('stops asking once the screen closes', async () => {
      jest.useFakeTimers();
      flow.refreshStep.mockResolvedValue('kyc_pending');
      const screen = render('kyc_pending');
      await act(async () => undefined);
      screen.unmount();
      flow.refreshStep.mockClear();

      await act(async () => {
        jest.advanceTimersByTime(20000);
      });

      expect(flow.refreshStep).not.toHaveBeenCalled();
    });

    it('checks again on request', async () => {
      flow.refreshStep.mockResolvedValue('kyc_pending');
      const screen = render('kyc_pending');
      await waitFor(() => expect(flow.refreshStep).toHaveBeenCalledTimes(1));

      fireEvent.press(primary(screen));

      await waitFor(() => expect(flow.refreshStep).toHaveBeenCalledTimes(2));
    });
  });

  describe('end states', () => {
    it.each([
      ['kyc_rejected', 'Verification failed'],
      ['approved', 'Identity verified'],
    ] as const)(
      '%s ends on a screen the user can close',
      async (step, title) => {
        flow.refreshStep.mockResolvedValue(step);
        const screen = render(step);
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

  describe('errors', () => {
    it('shows what went wrong with the status and code', async () => {
      flow.startAccountLink.mockRejectedValue(
        Object.assign(new Error('Kalshi refused'), {
          status: 409,
          code: 'onboarding_conflict',
        }),
      );
      const screen = render('account_link');
      typeInto(screen, 'a@b.co');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText('Kalshi refused · onboarding_conflict · 409'),
      ).toBeOnTheScreen();
    });

    it('shows a plain message for something that is not an error', async () => {
      flow.startAccountLink.mockRejectedValue('nope');
      const screen = render('account_link');
      typeInto(screen, 'a@b.co');

      fireEvent.press(primary(screen));

      expect(
        await screen.findByText('Something went wrong.'),
      ).toBeOnTheScreen();
    });

    it('clears the message when the user tries again', async () => {
      flow.startAccountLink.mockRejectedValueOnce(new Error('first'));
      const screen = render('account_link');
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
    const screen = render('account_link');

    fireEvent.press(screen.getByText('Back'));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
