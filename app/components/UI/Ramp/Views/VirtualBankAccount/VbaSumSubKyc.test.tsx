import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaSumSubKyc, { VbaSumSubKycSelectorsIDs } from './VbaSumSubKyc';
import Engine from '../../../../../core/Engine';
import { hydrateAndNavigateVbaOnboarding } from './hydrateAndNavigateVbaOnboarding';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  }),
}));

jest.mock('./hydrateAndNavigateVbaOnboarding', () => ({
  hydrateAndNavigateVbaOnboarding: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      acceptTermsAndStartSession: jest.fn(),
      state: {
        email: 'a@b.co',
        providerDisclaimersAccepted: {
          sumsub: [{ key: 'sumsub-terms', version: '2' }],
        },
        idosDisclaimersAccepted: [{ key: 'idos-privacy', version: '1' }],
        credentialReusabilityConsentGiven: false,
        sumsub: { status: 'complete' },
      },
    },
  },
}));

const mockHydrateAndNavigate = jest.mocked(hydrateAndNavigateVbaOnboarding);
const mockAcceptTermsAndStartSession = Engine.context.KycController
  .acceptTermsAndStartSession as jest.Mock;

describe('VbaSumSubKyc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHydrateAndNavigate.mockResolvedValue(undefined);
    mockAcceptTermsAndStartSession.mockResolvedValue(undefined);
    Engine.context.KycController.state.sumsub.status = 'complete';
  });

  it('renders the placeholder container', () => {
    const { getByTestId } = renderWithProvider(<VbaSumSubKyc />);

    expect(getByTestId(VbaSumSubKycSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('launches SumSub on mount then rehydrates onward from the outcome', async () => {
    renderWithProvider(<VbaSumSubKyc />);

    await waitFor(() => {
      expect(mockAcceptTermsAndStartSession).toHaveBeenCalledTimes(1);
      expect(mockHydrateAndNavigate).toHaveBeenCalledTimes(1);
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('returns to the previous screen without rehydrating when the SDK is abandoned', async () => {
    Engine.context.KycController.state.sumsub.status = 'abandoned';

    renderWithProvider(<VbaSumSubKyc />);

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
    expect(mockHydrateAndNavigate).not.toHaveBeenCalled();
  });

  it('shows a retryable error (and stays) when the SumSub launch fails', async () => {
    Engine.context.KycController.state.sumsub.status = 'failed';

    const { getByTestId } = renderWithProvider(<VbaSumSubKyc />);

    await waitFor(() => {
      expect(getByTestId(VbaSumSubKycSelectorsIDs.ERROR)).toBeOnTheScreen();
    });
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockHydrateAndNavigate).not.toHaveBeenCalled();
  });

  it('re-launches SumSub when the retry button is pressed', async () => {
    Engine.context.KycController.state.sumsub.status = 'failed';

    const { getByTestId } = renderWithProvider(<VbaSumSubKyc />);

    await waitFor(() => {
      expect(getByTestId(VbaSumSubKycSelectorsIDs.RETRY_BUTTON)).toBeOnTheScreen();
    });

    // Next attempt succeeds.
    Engine.context.KycController.state.sumsub.status = 'complete';
    const callsBeforeRetry = mockAcceptTermsAndStartSession.mock.calls.length;
    fireEvent.press(getByTestId(VbaSumSubKycSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      // Retry re-runs the atomic session+launch and, on success, hydrates onward.
      expect(mockAcceptTermsAndStartSession.mock.calls.length).toBeGreaterThan(
        callsBeforeRetry,
      );
      expect(mockHydrateAndNavigate).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a retryable error when launching SumSub throws', async () => {
    mockAcceptTermsAndStartSession.mockRejectedValue(new Error('sdk down'));

    const { getByTestId } = renderWithProvider(<VbaSumSubKyc />);

    await waitFor(() => {
      expect(getByTestId(VbaSumSubKycSelectorsIDs.ERROR)).toBeOnTheScreen();
    });
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockHydrateAndNavigate).not.toHaveBeenCalled();
  });
});
