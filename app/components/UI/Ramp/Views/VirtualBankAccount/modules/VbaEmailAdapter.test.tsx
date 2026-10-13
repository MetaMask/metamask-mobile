import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { MfaFlowError } from '../../../../../../util/identity/mfa/engine/errors';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Engine from '../../../../../../core/Engine';
import { VBA_KYC_VENDOR } from '../constants';
import VbaEmailAdapter, {
  VbaEmailAdapterSelectorsIDs,
} from './VbaEmailAdapter';

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

jest.mock('../hooks/useVbaOnboardingRouting', () => ({
  useOpenVbaOnboarding: () => mockAdvance,
}));

jest.mock('../../../../../../util/identity/mfa', () => ({
  useMfa: () => ({
    credentials: [],
    verifyOrEnroll: mockVerifyOrEnroll,
    enroll: jest.fn(),
  }),
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      state: { email: null as string | null },
      startSession: jest.fn(),
      recordVendorDisclaimers: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../core/redux', () => ({
  store: {
    getState: () => mockGetState(),
  },
}));

jest.mock('../../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: jest.fn(
    (state: { address?: string }) => state.address ?? null,
  ),
}));

jest.mock('../vbaVendorTermsStorage', () => ({
  getVbaVendorTermsAcceptance: (...args: unknown[]) =>
    mockGetVbaVendorTermsAcceptance(...args),
}));

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockKycController = Engine.context.KycController as unknown as {
  state: { email: string | null };
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

  it('verifies email, creates the session, records vendor terms, and advances', async () => {
    renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(mockVerifyOrEnroll).toHaveBeenCalledWith({
        methods: ['email_otp'],
        verifyWith: 'email_otp',
        reason: {
          operation: 'vba.verifyEmail',
          enrollDescription: 'placeholder for enroll description',
          verifyDescription: 'placeholder for verify description',
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

  it('shows the MFA message for the verification error code', async () => {
    mockVerifyOrEnroll.mockRejectedValue(
      new MfaFlowError('too_many_attempts'),
    );

    const screen = renderWithProvider(<VbaEmailAdapter />);

    await waitFor(() => {
      expect(
        screen.getByTestId(VbaEmailAdapterSelectorsIDs.ERROR_MESSAGE),
      ).toHaveTextContent('Too many attempts. Request a new code.');
    });
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockKycController.startSession).not.toHaveBeenCalled();
  });
});
