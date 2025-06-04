import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import KycProcessing from './KycProcessing';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockStopPolling = jest.fn();

const mockUseKycPolling = {
  kycResponse: null,
  loading: false,
  error: null as string | null,
  startPolling: jest.fn(),
  stopPolling: mockStopPolling,
};

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

jest.mock('../../hooks/useKycPolling', () => ({
  __esModule: true,
  default: jest.fn(() => mockUseKycPolling),
}));

jest.mock('../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'KYC Processing',
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: { [key: string]: string } = {
      'deposit.kyc_processing.title': 'KYC Processing',
      'deposit.kyc_processing.heading': "We're processing your information",
      'deposit.kyc_processing.description':
        "This may take a few moments. We'll notify you once it's complete.",
      'deposit.kyc_processing.button': 'Browse tokens',
      'deposit.kyc_processing.status_approved':
        'Your identity has been approved',
      'deposit.kyc_processing.status_rejected':
        'Your identity verification was rejected',
      'deposit.kyc_processing.status_submitted':
        'Your identity is being reviewed',
      'deposit.kyc_processing.status_not_submitted':
        'Identity verification required',
      generic_error_try_again: 'Something went wrong. Please try again.',
    };
    return mockStrings[key] || key;
  }),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.KYC_PROCESSING,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('KycProcessing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKycPolling.error = null;
    mockUseKycPolling.kycResponse = null;
  });

  it('renders correctly', () => {
    render(KycProcessing);
    expect(screen.getByText("We're processing your information")).toBeTruthy();
    expect(
      screen.getByText(
        "This may take a few moments. We'll notify you once it's complete.",
      ),
    ).toBeTruthy();
  });

  it('calls setOptions when the component mounts', () => {
    render(KycProcessing);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'KYC Processing',
      }),
    );
  });

  it('shows error state when there is an error', () => {
    mockUseKycPolling.error = 'Network error';

    render(KycProcessing);
    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeTruthy();
  });

  it('navigates to browser tab on button press and stops polling', async () => {
    render(KycProcessing);
    fireEvent.press(screen.getByRole('button', { name: 'Browse tokens' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER_TAB_HOME);
    });

    expect(mockStopPolling).toHaveBeenCalled();
  });
});
