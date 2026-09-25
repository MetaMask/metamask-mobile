import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Engine from '../../../../../../core/Engine';
import { VBA_KYC_VENDOR } from '../constants';
import { EmailOtpStubSelectorsIDs } from './EmailOtpStub';
import VbaEmailAdapter from './VbaEmailAdapter';

const mockAdvance = jest.fn();
const mockGetState = jest.fn();
const mockGetVbaVendorTermsAcceptance = jest.fn();

jest.mock('../hooks/useVbaOnboardingRouting', () => ({
  useOpenVbaOnboarding: () => mockAdvance,
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      startSession: jest.fn(),
      recordVendorDisclaimers: jest.fn(),
      hasCompletedVendorDisclaimers: jest.fn(),
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
  startSession: jest.Mock<Promise<unknown>, [unknown]>;
  recordVendorDisclaimers: jest.Mock<Promise<unknown>, [unknown]>;
  hasCompletedVendorDisclaimers: jest.Mock<Promise<boolean>, []>;
};

const submitEmail = (email = 'user@example.com') => {
  const screen = renderWithProvider(<VbaEmailAdapter />);

  fireEvent.changeText(
    screen.getByTestId(EmailOtpStubSelectorsIDs.EMAIL_INPUT),
    email,
  );
  fireEvent.press(screen.getByTestId(EmailOtpStubSelectorsIDs.CONTINUE_BUTTON));

  return screen;
};

describe('VbaEmailAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({ address: '0xabc' });
    mockGetVbaVendorTermsAcceptance.mockResolvedValue({
      disclaimerIds: ['privacy', 'terms'],
    });
    mockKycController.startSession.mockResolvedValue({
      id: 'session-1',
      finalStatus: 'new',
    });
    mockKycController.recordVendorDisclaimers.mockResolvedValue([]);
    mockKycController.hasCompletedVendorDisclaimers.mockResolvedValue(false);
    mockAdvance.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates the session, records vendor terms, and advances', async () => {
    submitEmail('  user@example.com  ');

    await waitFor(() => {
      expect(mockKycController.startSession).toHaveBeenCalledWith({
        vendor: VBA_KYC_VENDOR,
        email: 'user@example.com',
      });
      expect(mockGetVbaVendorTermsAcceptance).toHaveBeenCalledWith('0xabc');
      expect(mockKycController.recordVendorDisclaimers).toHaveBeenCalledWith({
        disclaimerIds: ['privacy', 'terms'],
      });
      expect(mockAdvance).toHaveBeenCalled();
    });
  });

  it('advances when vendor terms were already recorded remotely', async () => {
    mockGetVbaVendorTermsAcceptance.mockResolvedValue(null);
    mockKycController.hasCompletedVendorDisclaimers.mockResolvedValue(true);

    submitEmail();

    await waitFor(() => {
      expect(mockKycController.recordVendorDisclaimers).not.toHaveBeenCalled();
      expect(mockAdvance).toHaveBeenCalled();
    });
  });

  it('shows an error and does not advance without accepted vendor terms', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockGetVbaVendorTermsAcceptance.mockResolvedValue(null);

    submitEmail();

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Identity verification',
        'Terms are not loaded yet. Go back to Activate your Virtual Bank Account and try again.',
      );
      expect(mockAdvance).not.toHaveBeenCalled();
    });
  });

  it('shows an error and does not advance when session creation fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
    mockKycController.startSession.mockRejectedValue(
      new Error('Session creation failed.'),
    );

    submitEmail();

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Identity verification',
        'Session creation failed.',
      );
      expect(mockAdvance).not.toHaveBeenCalled();
    });
  });
});
