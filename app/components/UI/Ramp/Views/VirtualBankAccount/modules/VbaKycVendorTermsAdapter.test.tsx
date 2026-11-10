import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useVendorDisclaimers } from '../../../../KYC/hooks/useVendorDisclaimers';
import { VendorTermsSelectorsIDs } from '../../../../KYC/Views/VendorTerms/VendorTerms.testIds';
import { VBA_KYC_VENDOR } from '../constants';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import { trackVbaEvent } from '../vbaAnalytics';
import VbaKycVendorTermsAdapter from './VbaKycVendorTermsAdapter';

const mockAdvance = jest.fn();
const mockGoBack = jest.fn();
const mockAcceptDisclaimers = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../hooks/useVbaOnboardingRouting', () => ({
  useOpenVbaOnboarding: jest.fn(() => mockAdvance),
}));

jest.mock('../../../../KYC/hooks/useVendorDisclaimers', () => ({
  useVendorDisclaimers: jest.fn(),
}));
const mockUseVendorDisclaimers = jest.mocked(useVendorDisclaimers);

jest.mock('../vbaAnalytics', () => ({
  ...jest.requireActual('../vbaAnalytics'),
  trackVbaEvent: jest.fn(),
}));

jest.mock('../../../../../../hooks/useScreenPerformance');

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      ensureLocalUserSecret: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('VbaKycVendorTermsAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAcceptDisclaimers.mockResolvedValue(true);
    mockUseVendorDisclaimers.mockReturnValue({
      disclaimers: [
        {
          id: 'd-2',
          url: 'https://iron.example/terms',
          display_name: 'Terms and Conditions',
        },
      ],
      isLoading: false,
      isAccepting: false,
      error: null,
      acceptDisclaimers: mockAcceptDisclaimers,
      retry: jest.fn(),
    });
  });

  const vendorTermsProperties = () =>
    jest
      .mocked(trackVbaEvent)
      .mock.calls.filter(
        ([event]) =>
          event.category ===
          MetaMetricsEvents.MONEY_VBA_VENDOR_TERMS_UPDATED.category,
      )
      .map(([, buildProperties]) => buildProperties());

  it('asks the KYC screen for Iron and adds the MoonPay privacy policy', () => {
    const { getByText } = renderWithProvider(<VbaKycVendorTermsAdapter />);

    expect(mockUseVendorDisclaimers).toHaveBeenCalledWith(VBA_KYC_VENDOR);
    expect(useOpenVbaOnboarding).toHaveBeenCalledWith('vendor-terms-complete');
    expect(getByText("MoonPay's Privacy Policy")).toBeOnTheScreen();
    expect(getByText('Terms and Conditions')).toBeOnTheScreen();
  });

  it('records viewed, then accepted, and advances once the terms are stored', async () => {
    const { getByTestId } = renderWithProvider(<VbaKycVendorTermsAdapter />);

    fireEvent.press(
      getByTestId(VendorTermsSelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    );

    await waitFor(() =>
      expect(
        vendorTermsProperties().map((properties) => properties.status),
      ).toStrictEqual(['viewed', 'accepted']),
    );
    expect(vendorTermsProperties().at(-1)).toMatchObject({
      vendor: VBA_KYC_VENDOR,
    });
    expect(mockAdvance).toHaveBeenCalledTimes(1);
  });

  it('records a submission failure and does not advance', async () => {
    mockAcceptDisclaimers.mockResolvedValue(false);
    const { getByTestId } = renderWithProvider(<VbaKycVendorTermsAdapter />);

    fireEvent.press(
      getByTestId(VendorTermsSelectorsIDs.AGREE_AND_CONTINUE_BUTTON),
    );

    await waitFor(() =>
      expect(
        vendorTermsProperties().map((properties) => properties.status),
      ).toStrictEqual(['viewed', 'failed']),
    );
    expect(vendorTermsProperties().at(-1)).toMatchObject({
      failure_reason: 'terms_submission_failed',
    });
    expect(mockAdvance).not.toHaveBeenCalled();
  });
});
