import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import KycProcessing from './KycProcessing';
import Routes from '../../../../../../constants/navigation/Routes';
import { KycStatus } from '../../constants';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockStopPolling = jest.fn();
const mockStartPolling = jest.fn();
const mockRouteAfterAuthentication = jest.fn();

const mockTrackEvent = jest.fn();

jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

const mockKycForms = { formsRequired: [] };
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

jest.mock('../../hooks/useUserDetailsPolling', () => {
  const mockHook = () => ({ ...mockUseUserDetailsPolling });
  mockHook.KycStatus = {
    NOT_SUBMITTED: 'NOT_SUBMITTED',
    SUBMITTED: 'SUBMITTED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
  };
  return mockHook;
});

jest.mock('../../hooks/useDepositRouting', () => ({
  useDepositRouting: jest.fn(() => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  })),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    { name: Routes.DEPOSIT.KYC_PROCESSING },
    {
      state: initialRootState,
    },
  );
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
    mockRouteAfterAuthentication.mockClear();
    mockTrackEvent.mockClear();
  });

  it('render matches snapshot', () => {
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when the component mounts', () => {
    render(KycProcessing);
    expect(mockSetNavigationOptions).toHaveBeenCalled();
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
      kyc: { status: KycStatus.APPROVED },
    };
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders rejected state snapshot', () => {
    mockUseUserDetailsPolling.userDetails = {
      kyc: { status: KycStatus.REJECTED },
    };
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders pending forms state snapshot', () => {
    mockUseDepositSdkMethod.mockReturnValueOnce([
      { data: { formsRequired: [{}] }, error: null, isFetching: false },
    ]);
    render(KycProcessing);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe('handleContinue button behavior', () => {
    beforeEach(() => {
      mockUseUserDetailsPolling.userDetails = {
        kyc: { status: KycStatus.APPROVED },
      };
    });

    it('calls routeAfterAuthentication when continue button is pressed', async () => {
      mockUseUserDetailsPolling.userDetails = {
        kyc: { status: KycStatus.APPROVED },
      };
      mockRouteAfterAuthentication.mockResolvedValueOnce(undefined);
      render(KycProcessing);

      const continueButton = screen.getByText('Complete your order');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(mockQuote);
      });
    });
  });

  describe('Analytics tracking', () => {
    it('tracks RAMPS_KYC_APPLICATION_APPROVED event when KYC status is approved', () => {
      mockUseUserDetailsPolling.userDetails = {
        kyc: { status: KycStatus.APPROVED, type: 'STANDARD' },
      };

      render(KycProcessing);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_KYC_APPLICATION_APPROVED',
        {
          ramp_type: 'DEPOSIT',
          kyc_type: 'STANDARD',
        },
      );
    });

    it('tracks RAMPS_KYC_APPLICATION_FAILED event when KYC status is rejected', () => {
      mockUseUserDetailsPolling.userDetails = {
        kyc: { status: KycStatus.REJECTED, type: 'SIMPLE' },
      };

      render(KycProcessing);

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_KYC_APPLICATION_FAILED',
        {
          ramp_type: 'DEPOSIT',
          kyc_type: 'SIMPLE',
        },
      );
    });

    it('does not track analytics event when KYC status is pending', () => {
      mockUseUserDetailsPolling.userDetails = {
        kyc: { status: KycStatus.SUBMITTED, type: 'STANDARD' },
      };

      render(KycProcessing);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not track analytics event when user details are not available', () => {
      mockUseUserDetailsPolling.userDetails = null;

      render(KycProcessing);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});
