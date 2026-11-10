import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Logger from '../../../../../util/Logger';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_CONTENT_STATE,
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';
import { useVendorDisclaimers } from '../../hooks/useVendorDisclaimers';
import VendorTerms from './VendorTerms';
import { VendorTermsSelectorsIDs } from './VendorTerms.testIds';

const mockOnAccepted = jest.fn();
const mockOnBack = jest.fn();
const mockOnEvent = jest.fn();
const mockEnsureLocalUserSecret = jest.fn();
const mockRetry = jest.fn();
const mockAcceptDisclaimers = jest.fn();

jest.mock('../../hooks/useVendorDisclaimers', () => ({
  useVendorDisclaimers: jest.fn(),
}));
const mockUseVendorDisclaimers = jest.mocked(useVendorDisclaimers);

jest.mock('../../../../../hooks/useScreenPerformance');
const mockUseScreenPerformance = jest.mocked(useScreenPerformance);

jest.mock('../../../../../core/Engine', () => ({
  context: {
    KycController: {
      ensureLocalUserSecret: (...args: unknown[]) =>
        mockEnsureLocalUserSecret(...args),
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const vendor = 'iron' as const;
const termsDisclaimer = {
  id: 'd-2',
  url: 'https://iron.example/terms',
  display_name: 'Terms and Conditions',
};
const privacyPolicy = {
  id: 'moonpay-privacy-policy',
  label: "MoonPay's Privacy Policy",
  url: 'https://www.moonpay.com/legal/privacy_policy',
};

const loadedDisclaimers = {
  disclaimers: [termsDisclaimer],
  isLoading: false,
  isAccepting: false,
  error: null,
  acceptDisclaimers: mockAcceptDisclaimers,
  retry: mockRetry,
};

describe('VendorTerms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVendorDisclaimers.mockReturnValue(loadedDisclaimers);
    mockAcceptDisclaimers.mockResolvedValue(true);
    mockEnsureLocalUserSecret.mockResolvedValue(undefined);
  });

  it('lists the caller documents and the catalog display names', () => {
    const { getByText } = renderWithProvider(
      <VendorTerms
        vendor={vendor}
        additionalDocuments={[privacyPolicy]}
        onAccepted={mockOnAccepted}
        onBack={mockOnBack}
        onEvent={mockOnEvent}
      />,
    );

    expect(getByText('Review the terms')).toBeOnTheScreen();
    expect(getByText("MoonPay's Privacy Policy")).toBeOnTheScreen();
    expect(getByText('Terms and Conditions')).toBeOnTheScreen();
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: KYC_SCREEN_PERFORMANCE_CONFIG,
      screenId: KYC_SCREEN_ID.VENDOR_TERMS,
      contentReady: true,
      contentState: KYC_SCREEN_CONTENT_STATE.POPULATED,
    });
  });

  it('opens a document URL when its row is pressed', () => {
    const spy = jest.spyOn(Linking, 'openURL');
    const { getByText } = renderWithProvider(
      <VendorTerms
        vendor={vendor}
        additionalDocuments={[privacyPolicy]}
        onAccepted={mockOnAccepted}
        onBack={mockOnBack}
      />,
    );

    fireEvent.press(getByText('Terms and Conditions'));

    expect(spy).toHaveBeenCalledWith('https://iron.example/terms');
  });

  it('stores the acceptance and reports it before advancing', async () => {
    const { getByTestId } = renderWithProvider(
      <VendorTerms
        vendor={vendor}
        onAccepted={mockOnAccepted}
        onBack={mockOnBack}
        onEvent={mockOnEvent}
      />,
    );
    const button = getByTestId(
      VendorTermsSelectorsIDs.AGREE_AND_CONTINUE_BUTTON,
    );

    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => expect(mockOnAccepted).toHaveBeenCalledTimes(1));
    expect(mockAcceptDisclaimers).toHaveBeenCalledTimes(1);
    expect(mockOnEvent).toHaveBeenCalledWith({ status: 'viewed' });
    expect(mockOnEvent).toHaveBeenCalledWith({ status: 'accepted' });
    const acceptedOrder = mockOnEvent.mock.invocationCallOrder.at(-1) as number;
    expect(acceptedOrder).toBeLessThan(
      mockOnAccepted.mock.invocationCallOrder[0],
    );
    expect(button).toBeDisabled();
  });

  it('reports a submission failure and stays put when acceptance is not stored', async () => {
    mockAcceptDisclaimers.mockResolvedValue(false);
    const { getByTestId } = renderWithProvider(
      <VendorTerms
        vendor={vendor}
        onAccepted={mockOnAccepted}
        onBack={mockOnBack}
        onEvent={mockOnEvent}
      />,
    );

    fireEvent.press(
      getByTestId(VendorTermsSelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    );

    await waitFor(() =>
      expect(mockOnEvent).toHaveBeenCalledWith({
        status: 'failed',
        reason: 'terms_submission_failed',
      }),
    );
    expect(mockOnAccepted).not.toHaveBeenCalled();
  });

  it('disables the CTA and hides documents while the catalog is loading', () => {
    mockUseVendorDisclaimers.mockReturnValue({
      ...loadedDisclaimers,
      disclaimers: null,
      isLoading: true,
    });
    const { getByTestId, queryByText } = renderWithProvider(
      <VendorTerms
        vendor={vendor}
        additionalDocuments={[privacyPolicy]}
        onAccepted={mockOnAccepted}
        onBack={mockOnBack}
      />,
    );

    expect(
      getByTestId(VendorTermsSelectorsIDs.DISCLAIMERS_LOADING),
    ).toBeOnTheScreen();
    expect(queryByText("MoonPay's Privacy Policy")).toBeNull();
    expect(
      getByTestId(VendorTermsSelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    ).toBeDisabled();
    expect(mockUseScreenPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ contentReady: false }),
    );
  });

  it('shows an error with a retry and reports the terms as unavailable', () => {
    mockUseVendorDisclaimers.mockReturnValue({
      ...loadedDisclaimers,
      disclaimers: null,
      error: 'Request timed out',
    });
    const { getByTestId, getByText } = renderWithProvider(
      <VendorTerms
        vendor={vendor}
        onAccepted={mockOnAccepted}
        onBack={mockOnBack}
        onEvent={mockOnEvent}
      />,
    );

    expect(
      getByTestId(VendorTermsSelectorsIDs.DISCLAIMERS_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VendorTermsSelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    ).toBeDisabled();
    expect(mockOnEvent).toHaveBeenCalledWith({
      status: 'failed',
      reason: 'terms_unavailable',
    });
    expect(mockUseScreenPerformance).toHaveBeenCalledWith(
      expect.objectContaining({
        contentReady: true,
        contentState: KYC_SCREEN_CONTENT_STATE.ERROR,
      }),
    );

    fireEvent.press(getByText('Try again'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('goes back when the header back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <VendorTerms
        vendor={vendor}
        onAccepted={mockOnAccepted}
        onBack={mockOnBack}
      />,
    );

    fireEvent.press(getByTestId(VendorTermsSelectorsIDs.BACK_BUTTON));

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  describe('ensureLocalUserSecret', () => {
    const renderTerms = () =>
      renderWithProvider(
        <VendorTerms
          vendor={vendor}
          onAccepted={mockOnAccepted}
          onBack={mockOnBack}
        />,
      );

    it('calls KycController.ensureLocalUserSecret once the catalog request has settled', async () => {
      renderTerms();

      await waitFor(() =>
        expect(mockEnsureLocalUserSecret).toHaveBeenCalledTimes(1),
      );
    });

    it('does not call ensureLocalUserSecret while the catalog request is still loading', () => {
      mockUseVendorDisclaimers.mockReturnValue({
        ...loadedDisclaimers,
        disclaimers: null,
        isLoading: true,
      });

      renderTerms();

      expect(mockEnsureLocalUserSecret).not.toHaveBeenCalled();
    });

    it('still calls ensureLocalUserSecret when the catalog request fails', async () => {
      mockUseVendorDisclaimers.mockReturnValue({
        ...loadedDisclaimers,
        disclaimers: null,
        error: 'Request timed out',
      });

      renderTerms();

      await waitFor(() =>
        expect(mockEnsureLocalUserSecret).toHaveBeenCalledTimes(1),
      );
    });

    it('logs and swallows a rejection instead of blocking the screen', async () => {
      const secretError = new Error('user storage unavailable');
      mockEnsureLocalUserSecret.mockRejectedValue(secretError);
      const { getByTestId } = renderTerms();

      await waitFor(() =>
        expect(Logger.error).toHaveBeenCalledWith(secretError, {
          tags: { feature: 'kyc', provider: vendor },
          context: {
            name: 'VendorTerms',
            data: { step: 'ensureLocalUserSecret' },
          },
        }),
      );
      expect(
        getByTestId(VendorTermsSelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
      ).toBeEnabled();
    });
  });
});
