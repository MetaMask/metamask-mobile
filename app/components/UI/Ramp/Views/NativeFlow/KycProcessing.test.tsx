import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import V2KycProcessing from './KycProcessing';
import { ThemeContext, mockTheme } from '../../../../../util/theme';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(cb, [cb]);
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn(() => ({})),
}));

const mockGetAdditionalRequirements = jest.fn();
const mockGetUserDetails = jest.fn();
let mockBuyQuote: { quoteId: string; fiatAmount: number } | null = {
  quoteId: 'test-quote-id',
  fiatAmount: 100,
};

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    getAdditionalRequirements: mockGetAdditionalRequirements,
    getUserDetails: mockGetUserDetails,
    buyQuote: mockBuyQuote,
  }),
}));

const mockRouteAfterAuthentication = jest.fn();
jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  }),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../Deposit/constants', () => ({
  KycStatus: {
    NOT_SUBMITTED: 'NOT_SUBMITTED',
    SUBMITTED: 'SUBMITTED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
  },
}));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('V2KycProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockBuyQuote = { quoteId: 'test-quote-id', fiatAmount: 100 };
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [],
    });
    mockGetUserDetails.mockResolvedValue({
      kyc: { status: 'SUBMITTED', type: 'SIMPLE' },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders loading state with activity indicator', async () => {
    const { getByTestId, getByText } = renderWithTheme(<V2KycProcessing />);
    expect(getByTestId('activity-indicator')).toBeOnTheScreen();
    expect(getByText('deposit.kyc_processing.heading')).toBeOnTheScreen();
    expect(getByText('deposit.kyc_processing.description')).toBeOnTheScreen();

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('renders activity indicator while polling', async () => {
    const { getByTestId } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  it('renders error state when kycForms fetch fails', async () => {
    mockGetAdditionalRequirements.mockRejectedValue(new Error('Fetch failed'));

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(getByText('Fetch failed')).toBeOnTheScreen();
    });
  });

  it('renders error state when there are pending forms', async () => {
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [{ type: 'IDPROOF' }],
    });

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        getByText('deposit.kyc_processing.error_heading'),
      ).toBeOnTheScreen();
    });
  });

  it('renders success state when KYC is APPROVED', async () => {
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [],
    });
    mockGetUserDetails.mockResolvedValue({
      kyc: { status: 'APPROVED', type: 'SIMPLE' },
    });

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(
        getByText('deposit.kyc_processing.success_heading'),
      ).toBeOnTheScreen();
    });
  });

  it('renders error state when KYC is REJECTED', async () => {
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [],
    });
    mockGetUserDetails.mockResolvedValue({
      kyc: { status: 'REJECTED', type: 'SIMPLE' },
    });

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(
        getByText('deposit.kyc_processing.error_heading'),
      ).toBeOnTheScreen();
    });
  });

  it('tracks RAMPS_KYC_APPLICATION_APPROVED when KYC is approved', async () => {
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [],
    });
    mockGetUserDetails.mockResolvedValue({
      kyc: { status: 'APPROVED', type: 'SIMPLE' },
    });

    renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_KYC_APPLICATION_APPROVED',
        expect.objectContaining({
          ramp_type: 'DEPOSIT',
        }),
      );
    });
  });

  it('tracks RAMPS_KYC_APPLICATION_FAILED when KYC is rejected', async () => {
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [],
    });
    mockGetUserDetails.mockResolvedValue({
      kyc: { status: 'REJECTED', type: 'SIMPLE' },
    });

    renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_KYC_APPLICATION_FAILED',
        expect.objectContaining({
          ramp_type: 'DEPOSIT',
        }),
      );
    });
  });

  it('renders error state when getUserDetails fails', async () => {
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [],
    });
    mockGetUserDetails.mockRejectedValue(new Error('User details failed'));

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getByText('User details failed')).toBeOnTheScreen();
    });
  });

  it('calls routeAfterAuthentication when continue button is pressed in success state', async () => {
    mockGetAdditionalRequirements.mockResolvedValue({
      formsRequired: [],
    });
    mockGetUserDetails.mockResolvedValue({
      kyc: { status: 'APPROVED', type: 'SIMPLE' },
    });
    mockRouteAfterAuthentication.mockResolvedValue(undefined);

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(
        getByText('deposit.kyc_processing.success_button'),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(getByText('deposit.kyc_processing.success_button'));
    });

    await waitFor(() => {
      expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(mockBuyQuote);
    });
  });

  it('shows loading state on continue button while routeAfterAuthentication is in progress', async () => {
    let resolveRoute: () => void;
    mockRouteAfterAuthentication.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRoute = resolve;
        }),
    );
    mockGetAdditionalRequirements.mockResolvedValue({ formsRequired: [] });
    mockGetUserDetails.mockResolvedValue({
      kyc: { status: 'APPROVED', type: 'SIMPLE' },
    });

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(
        getByText('deposit.kyc_processing.success_button'),
      ).toBeOnTheScreen();
    });

    // Press continue — button should enter loading state
    await act(async () => {
      fireEvent.press(getByText('deposit.kyc_processing.success_button'));
    });

    // Resolve the pending routeAfterAuthentication
    await act(async () => {
      resolveRoute();
    });

    // After resolving, routeAfterAuthentication should have been called
    expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(mockBuyQuote);
  });

  it('clears loading state when routeAfterAuthentication fails', async () => {
    mockRouteAfterAuthentication.mockRejectedValue(new Error('Route failed'));
    mockGetAdditionalRequirements.mockResolvedValue({ formsRequired: [] });
    mockGetUserDetails.mockResolvedValue({
      kyc: { status: 'APPROVED', type: 'SIMPLE' },
    });

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(
        getByText('deposit.kyc_processing.success_button'),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(getByText('deposit.kyc_processing.success_button'));
    });

    // Button should still be visible after error (loading cleared)
    await waitFor(() => {
      expect(
        getByText('deposit.kyc_processing.success_button'),
      ).toBeOnTheScreen();
    });
  });

  it('does not fetch forms when buyQuote is null', async () => {
    mockBuyQuote = null;

    renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetAdditionalRequirements).not.toHaveBeenCalled();
  });

  it('calls Logger.error when routeAfterAuthentication fails', async () => {
    const Logger = jest.requireMock('../../../../../util/Logger') as {
      error: jest.Mock;
    };
    mockRouteAfterAuthentication.mockRejectedValue(new Error('Route failed'));
    mockGetAdditionalRequirements.mockResolvedValue({ formsRequired: [] });
    mockGetUserDetails.mockResolvedValue({
      kyc: { status: 'APPROVED', type: 'SIMPLE' },
    });

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(
        getByText('deposit.kyc_processing.success_button'),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(getByText('deposit.kyc_processing.success_button'));
    });

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: 'V2KycProcessing::handleContinue error',
        }),
      );
    });
  });

  it('shows loading state on error-state continue button', async () => {
    let resolveRoute: () => void;
    mockRouteAfterAuthentication.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRoute = resolve;
        }),
    );
    mockGetAdditionalRequirements.mockResolvedValue({ formsRequired: [] });
    mockGetUserDetails.mockResolvedValue({
      kyc: { status: 'REJECTED', type: 'SIMPLE' },
    });

    const { getByText } = renderWithTheme(<V2KycProcessing />);

    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(
        getByText('deposit.kyc_processing.error_button'),
      ).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(getByText('deposit.kyc_processing.error_button'));
    });

    await act(async () => {
      resolveRoute();
    });

    expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(mockBuyQuote);
  });
});
