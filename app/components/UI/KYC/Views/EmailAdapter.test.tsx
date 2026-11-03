import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { MfaFlowError } from '../../../../util/identity/mfa/engine/errors';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Engine from '../../../../core/Engine';
import { VBA_KYC_VENDOR } from '../../Ramp/Views/VirtualBankAccount/constants';
import VbaEmailAdapter, { VbaEmailAdapterSelectorsIDs } from './EmailAdapter';

const mockAdvance = jest.fn();
const mockGetState = jest.fn();
const mockGetVbaVendorTermsAcceptance = jest.fn();
const mockGoBack = jest.fn();
const mockVerifyOrEnroll = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock(
  '../../Ramp/Views/VirtualBankAccount/hooks/useVbaOnboardingRouting',
  () => ({
    useOpenVbaOnboarding: () => mockAdvance,
  }),
);

jest.mock('../../../../util/identity/mfa', () => ({
  useMfa: () => ({
    credentials: [],
    verifyOrEnroll: mockVerifyOrEnroll,
    enroll: jest.fn(),
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    KycController: {
      state: { email: null as string | null },
      getSessionStatusForVendor: jest.fn(),
      startSession: jest.fn(),
      recordVendorDisclaimers: jest.fn(),
    },
  },
}));

jest.mock('../../../../core/redux', () => ({
  store: {
    getState: () => mockGetState(),
  },
}));

jest.mock('../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: jest.fn(
    (state: { address?: string }) => state.address ?? null,
  ),
}));

jest.mock('../../Ramp/Views/VirtualBankAccount/vbaVendorTermsStorage', () => ({
  getVbaVendorTermsAcceptance: (...args: unknown[]) =>
    mockGetVbaVendorTermsAcceptance(...args),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockKycController = Engine.context.KycController as unknown as {
  state: { email: string | null };
  getSessionStatusForVendor: jest.Mock<Promise<unknown>, [unknown]>;
  startSession: jest.Mock<Promise<unknown>, [unknown]>;
  recordVendorDisclaimers: jest.Mock<Promise<unknown>, [unknown]>;
};

const verifiedEmail = (
  email = 'user@example.com',
  accessToken = 'aal2-token',
) => ({
  credentials: [
    {
      type: 'email_otp' as const,
      status: 'active' as const,
      email,
      verified: true,
    },
  ],
  token: {
    accessToken,
    expiresIn: 900,
    obtainedAt: 0,
    claims: { sub: 'profile', amr: ['email_otp' as const], exp: 0 },
  },
});

describe('VbaEmailAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyOrEnroll.mockResolvedValue(verifiedEmail());
    mockKycController.state.email = null;
    mockGetState.mockReturnValue({ address: '0xabc' });
    mockGetVbaVendorTermsAcceptance.mockResolvedValue({
      disclaimerIds: ['privacy', 'terms'],
    });
    mockKycController.getSessionStatusForVendor.mockResolvedValue(null);
    mockKycController.startSession.mockResolvedValue({
      id: 'session-1',
      finalStatus: 'new',
    });
    mockKycController.recordVendorDisclaimers.mockResolvedValue([]);
    mockAdvance.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reuses an existing session without prompting for email OTP', async () => {
    mockKycController.getSessionStatusForVendor.mockResolvedValue({
      id: 'session-1',
      finalStatus: 'pending',
    });

    renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(mockKycController.getSessionStatusForVendor).toHaveBeenCalledWith(
        VBA_KYC_VENDOR,
      );
      expect(mockKycController.startSession).toHaveBeenCalledWith({
        vendor: VBA_KYC_VENDOR,
      });
      expect(mockAdvance).toHaveBeenCalled();
    });
    expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
  });

  it('verifies email, creates the session, records vendor terms, and advances', async () => {
    renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
        methods: ['email_otp'],
        verifyWith: 'email_otp',
        reason: {
          operation: 'vba.verifyEmail',
          presentation: 'card',
        },
      });
      expect(mockKycController.startSession).toHaveBeenCalledWith({
        vendor: VBA_KYC_VENDOR,
        aal2Token: 'aal2-token',
      });
      expect(mockGetVbaVendorTermsAcceptance).toHaveBeenCalledWith('0xabc');
      expect(mockKycController.recordVendorDisclaimers).toHaveBeenCalledWith({
        disclaimerIds: ['privacy', 'terms'],
      });
      expect(mockAdvance).toHaveBeenCalled();
    });
  });

  it('shows an error when email verification returns no access token', async () => {
    mockVerifyOrEnroll.mockResolvedValue({
      credentials: [],
      token: undefined,
    });

    const screen = renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(
        screen.getByTestId(VbaEmailAdapterSelectorsIDs.ERROR_MESSAGE),
      ).toHaveTextContent(
        'Something went wrong opening email verification. Please try again.',
      );
    });
    expect(mockKycController.startSession).not.toHaveBeenCalled();
    expect(mockAdvance).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('starts the session when the credential has no address', async () => {
    mockVerifyOrEnroll.mockResolvedValue({
      credentials: [{ type: 'email_otp', status: 'active', verified: true }],
      token: verifiedEmail().token,
    });

    renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(mockKycController.startSession).toHaveBeenCalledWith({
        vendor: VBA_KYC_VENDOR,
        aal2Token: 'aal2-token',
      });
      expect(mockAdvance).toHaveBeenCalled();
    });
  });

  it('advances when vendor disclaimer recording fails', async () => {
    mockKycController.recordVendorDisclaimers.mockRejectedValue(
      new Error('disclaimer failed'),
    );

    renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(mockAdvance).toHaveBeenCalled();
    });
  });

  it('advances when local vendor terms are missing', async () => {
    mockGetVbaVendorTermsAcceptance.mockResolvedValue(null);

    renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(mockKycController.recordVendorDisclaimers).not.toHaveBeenCalled();
      expect(mockAdvance).toHaveBeenCalled();
    });
  });

  it('shows an error and does not advance when session creation fails', async () => {
    mockKycController.startSession.mockRejectedValue(
      new Error('Session creation failed.'),
    );

    const screen = renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(
        screen.getByTestId(VbaEmailAdapterSelectorsIDs.ERROR_MESSAGE),
      ).toHaveTextContent('Session creation failed.');
      expect(mockAdvance).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  it('retries verification from the error screen', async () => {
    mockKycController.startSession
      .mockRejectedValueOnce(new Error('Session creation failed.'))
      .mockResolvedValueOnce({ id: 'session-1', finalStatus: 'new' });

    const screen = renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(
        screen.getByTestId(VbaEmailAdapterSelectorsIDs.ERROR_MESSAGE),
      ).toBeOnTheScreen();
    });

    fireEvent.press(
      screen.getByTestId(VbaEmailAdapterSelectorsIDs.RETRY_BUTTON),
    );

    await waitFor(() => {
      expect(mockVerifyOrEnroll).toHaveBeenCalledTimes(2);
      expect(mockAdvance).toHaveBeenCalled();
    });
  });

  it('leaves the step when email verification is cancelled', async () => {
    mockVerifyOrEnroll.mockRejectedValue(new MfaFlowError('flow_cancelled'));

    const screen = renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
    expect(mockKycController.startSession).not.toHaveBeenCalled();
    expect(mockAdvance).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId(VbaEmailAdapterSelectorsIDs.ERROR_MESSAGE),
    ).toBeNull();
  });

  it('shows the generic error when session lookup rejects with a non-Error', async () => {
    mockKycController.getSessionStatusForVendor.mockRejectedValue('offline');

    const screen = renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(
        screen.getByTestId(VbaEmailAdapterSelectorsIDs.ERROR_MESSAGE),
      ).toHaveTextContent(
        'Something went wrong opening email verification. Please try again.',
      );
    });
    expect(mockKycController.startSession).not.toHaveBeenCalled();
  });

  it('shows the MFA message for the verification error code', async () => {
    mockVerifyOrEnroll.mockRejectedValue(new MfaFlowError('too_many_attempts'));

    const screen = renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(
        screen.getByTestId(VbaEmailAdapterSelectorsIDs.ERROR_MESSAGE),
      ).toHaveTextContent('Too many attempts. Request a new code.');
    });
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockKycController.startSession).not.toHaveBeenCalled();
  });

  it('shows a spinner without navigation on the loading screen', () => {
    mockKycController.getSessionStatusForVendor.mockReturnValue(
      new Promise(() => undefined),
    );

    const screen = renderWithProvider(<VbaEmailAdapter />);

    expect(
      screen.getByTestId(VbaEmailAdapterSelectorsIDs.SPINNER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(VbaEmailAdapterSelectorsIDs.ERROR_MESSAGE),
    ).toBeNull();
    expect(
      screen.queryByTestId(VbaEmailAdapterSelectorsIDs.BACK_BUTTON),
    ).toBeNull();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('does not open email OTP after leaving during session lookup', async () => {
    let resolveLookup: (session: null) => void = () => undefined;
    mockKycController.getSessionStatusForVendor.mockReturnValue(
      new Promise((resolve) => {
        resolveLookup = resolve;
      }),
    );
    const screen = renderWithProvider(<VbaEmailAdapter />);

    screen.unmount();
    await act(async () => {
      resolveLookup(null);
    });

    expect(mockVerifyOrEnroll).not.toHaveBeenCalled();
    expect(mockKycController.startSession).not.toHaveBeenCalled();
  });

  it('leaves the step from the error screen', async () => {
    mockKycController.startSession.mockRejectedValue(
      new Error('Session creation failed.'),
    );

    const screen = renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(
        screen.getByTestId(VbaEmailAdapterSelectorsIDs.ERROR_MESSAGE),
      ).toBeOnTheScreen();
    });

    fireEvent.press(
      screen.getByTestId(VbaEmailAdapterSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalled();
  });
});
