import React from 'react';
import { screen } from '@testing-library/react-native';
import KycProcessing from './KycProcessing';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';
import { KycStatus } from '../../hooks/useUserDetailsPolling';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockStopPolling = jest.fn();
const mockStartPolling = jest.fn();

const mockKycForms = { forms: [] };
const mockQuote = {
  id: 'test-quote-id',
  amount: 100,
  currency: 'USD',
};

const mockUseDepositSdkMethod = jest.fn();
const mockUseUserDetailsPolling: {
  userDetails: unknown;
  loading: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
} = {
  userDetails: null,
  loading: false,
  error: null,
  startPolling: mockStartPolling,
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
    useRoute: () => ({
      params: { quote: mockQuote },
    }),
  };
});

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: (...args: unknown[]) => mockUseDepositSdkMethod(...args),
}));

jest.mock('../../hooks/useUserDetailsPolling', () => ({
  __esModule: true,
  default: () => mockUseUserDetailsPolling,
  KycStatus: {
    NOT_SUBMITTED: 'NOT_SUBMITTED',
    SUBMITTED: 'SUBMITTED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
  },
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
    mockUseDepositSdkMethod.mockReturnValue([
      { data: mockKycForms, error: null, isFetching: false },
    ]);
    mockUseUserDetailsPolling.userDetails = null;
    mockUseUserDetailsPolling.loading = false;
    mockUseUserDetailsPolling.error = null;
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
    mockUseUserDetailsPolling.loading = true;
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders error state snapshot', () => {
    mockUseUserDetailsPolling.error = 'Network error';
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders approved state snapshot', () => {
    mockUseUserDetailsPolling.userDetails = {
      kyc: { l1: { status: KycStatus.APPROVED } },
    };
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders rejected state snapshot', () => {
    mockUseUserDetailsPolling.userDetails = {
      kyc: { l1: { status: KycStatus.REJECTED } },
    };
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders pending forms state snapshot', () => {
    mockUseDepositSdkMethod.mockReturnValueOnce([
      { data: { forms: [{}] }, error: null, isFetching: false },
    ]);
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
