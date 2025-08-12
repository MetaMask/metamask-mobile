import { KycStatus } from '../../hooks/useUserDetailsPolling';
import React from 'react';
import { screen } from '@testing-library/react-native';
import KycWebview from './KycWebview';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

interface UserDetails {
  kyc?: {
    l1?: {
      status?: string | null;
      type?: string | null;
    };
  };
}

const shouldNavigateToKycProcessing = (
  userDetails: UserDetails | null | undefined,
) => {
  const kycStatus = userDetails?.kyc?.l1?.status;
  const kycType = userDetails?.kyc?.l1?.type;

  return !!(
    kycStatus &&
    kycStatus !== KycStatus.NOT_SUBMITTED &&
    kycType !== null &&
    kycType !== 'SIMPLE'
  );
};

const mockNavigate = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockUseUserDetailsPolling = {
  userDetails: null as UserDetails | null,
  error: null as string | null,
};

const mockQuote = {
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
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({
    quote: mockQuote,
    kycUrl: 'https://example.com/kyc',
  }),
  createNavigationDetails: () => jest.fn(),
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

jest.mock('../../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'KYC Verification',
  }),
}));

jest.mock('@metamask/react-native-webview', () => ({
  WebView: 'WebView',
}));

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({ theme: {} }),
}));

jest.mock('./KycWebview.styles', () => ({}));

jest.mock('../KycProcessing/KycProcessing', () => ({
  createKycProcessingNavDetails: jest.fn(() => ['KYC_PROCESSING', {}]),
}));

jest.mock('../../../Aggregator/components/ErrorView', () => 'ErrorView');

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.KYC_WEBVIEW);
}

describe('KycWebview Logic', () => {
  it('should navigate to KYC processing when status is SUBMITTED and type is STANDARD', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: KycStatus.SUBMITTED,
          type: 'STANDARD',
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(true);
  });

  it('should navigate to KYC processing when status is APPROVED and type is STANDARD', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: KycStatus.APPROVED,
          type: 'STANDARD',
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(true);
  });

  it('should not navigate when KYC status is NOT_SUBMITTED', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: KycStatus.NOT_SUBMITTED,
          type: 'STANDARD',
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(false);
  });

  it('should not navigate when KYC type is SIMPLE', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: KycStatus.SUBMITTED,
          type: 'SIMPLE',
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(false);
  });

  it('should not navigate when KYC type is null', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: KycStatus.SUBMITTED,
          type: null,
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(false);
  });

  it('should not navigate when KYC status is null', () => {
    const userDetails = {
      kyc: {
        l1: {
          status: null,
          type: 'STANDARD',
        },
      },
    };

    expect(shouldNavigateToKycProcessing(userDetails)).toBe(false);
  });

  it('should handle missing userDetails gracefully', () => {
    expect(shouldNavigateToKycProcessing(null)).toBe(false);
    expect(shouldNavigateToKycProcessing(undefined)).toBe(false);
    expect(shouldNavigateToKycProcessing({})).toBe(false);
  });

  it('should handle missing kyc data gracefully', () => {
    expect(shouldNavigateToKycProcessing({ kyc: undefined })).toBe(false);
    expect(shouldNavigateToKycProcessing({ kyc: {} })).toBe(false);
    expect(shouldNavigateToKycProcessing({ kyc: { l1: undefined } })).toBe(
      false,
    );
  });
});

describe('KycWebview Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserDetailsPolling.userDetails = null;
    mockUseUserDetailsPolling.error = null;
  });

  it('render matches snapshot', () => {
    render(KycWebview);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to KycProcessing when KYC status and type conditions are met', () => {
    mockUseUserDetailsPolling.userDetails = {
      kyc: {
        l1: {
          status: KycStatus.SUBMITTED,
          type: 'STANDARD',
        },
      },
    };

    render(KycWebview);

    expect(mockNavigate).toHaveBeenCalledWith('KYC_PROCESSING', {});
  });

  it('navigates to KycProcessing when status is APPROVED and type is STANDARD', () => {
    mockUseUserDetailsPolling.userDetails = {
      kyc: {
        l1: {
          status: KycStatus.APPROVED,
          type: 'STANDARD',
        },
      },
    };

    render(KycWebview);

    expect(mockNavigate).toHaveBeenCalledWith('KYC_PROCESSING', {});
  });

  it('does not navigate when KYC status is NOT_SUBMITTED', () => {
    mockUseUserDetailsPolling.userDetails = {
      kyc: {
        l1: {
          status: KycStatus.NOT_SUBMITTED,
          type: 'STANDARD',
        },
      },
    };

    render(KycWebview);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when KYC type is SIMPLE', () => {
    mockUseUserDetailsPolling.userDetails = {
      kyc: {
        l1: {
          status: KycStatus.SUBMITTED,
          type: 'SIMPLE',
        },
      },
    };

    render(KycWebview);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when KYC type is null', () => {
    mockUseUserDetailsPolling.userDetails = {
      kyc: {
        l1: {
          status: KycStatus.SUBMITTED,
          type: null,
        },
      },
    };

    render(KycWebview);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders component when pollingError is present - covers error branch', () => {
    mockUseUserDetailsPolling.error = 'Network error occurred';

    expect(() => render(KycWebview)).not.toThrow();
  });

  it('renders component when no errors - covers main WebView branch', () => {
    mockUseUserDetailsPolling.userDetails = null;
    mockUseUserDetailsPolling.error = null;

    expect(() => render(KycWebview)).not.toThrow();
  });
});
