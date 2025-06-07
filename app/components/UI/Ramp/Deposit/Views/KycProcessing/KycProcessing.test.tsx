import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import KycProcessing from './KycProcessing';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockStopPolling = jest.fn();

const mockUseKycPolling = {
  kycApproved: false,
  loading: false,
  error: null as string | null,
  startPolling: jest.fn(),
  stopPolling: mockStopPolling,
};

interface MockQuote {
  id: string;
  amount: number;
  currency: string;
}

const mockQuote: MockQuote = {
  id: 'test-quote-id',
  amount: 100,
  currency: 'USD',
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
    useRoute: () => ({
      params: { quote: mockQuote },
    }),
  };
});

jest.mock('../../hooks/useKycPolling', () => ({
  __esModule: true,
  default: jest.fn(() => mockUseKycPolling),
}));

jest.mock('../../../../../UI/Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'KYC Processing',
  }),
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.KYC_PROCESSING);
}

describe('KycProcessing Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKycPolling.error = null;
    mockUseKycPolling.kycApproved = false;
    mockUseKycPolling.loading = false;
  });

  it('render matches snapshot', () => {
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when the component mounts', () => {
    render(KycProcessing);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'KYC Processing',
      }),
    );
  });

  it('renders loading state snapshot', () => {
    mockUseKycPolling.loading = true;
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders error state snapshot', () => {
    mockUseKycPolling.error = 'Network error';
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders approved state snapshot', () => {
    mockUseKycPolling.kycApproved = true;
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to browser tab on button press and stops polling', async () => {
    render(KycProcessing);
    const button = screen.getByRole('button');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER_TAB_HOME);
    });

    expect(mockStopPolling).toHaveBeenCalled();
  });
});
