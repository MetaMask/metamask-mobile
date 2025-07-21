import React from 'react';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import KycWebviewModal from './KycWebviewModal';
import { KycStatus } from '../../../constants';
import Routes from '../../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../../utils/renderDepositTestComponent';

const mockNavigate = jest.fn();
const mockStartPolling = jest.fn();
const mockStopPolling = jest.fn();
const mockRouteAfterAuthentication = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => ({
    quote: { id: 'test-quote' } as unknown as BuyQuote,
  })),
}));

const mockUseUserDetailsPolling = jest.fn();

jest.mock(
  '../../../hooks/useUserDetailsPolling',
  () => () => mockUseUserDetailsPolling(),
);

jest.mock('../../../hooks/useDepositRouting', () => ({
  useDepositRouting: jest.fn(() => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  })),
}));

jest.mock('./WebviewModal', () => () => 'WebviewModal');

describe('KycWebviewModal', () => {
  function render(Component: React.ComponentType) {
    return renderDepositTestComponent(
      Component,
      Routes.DEPOSIT.MODALS.KYC_WEBVIEW,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserDetailsPolling.mockReturnValue({
      userDetails: null,
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
    });
    mockRouteAfterAuthentication.mockClear();
  });

  it('render matches snapshot', () => {
    const { toJSON } = render(KycWebviewModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('starts polling when component mounts', () => {
    render(KycWebviewModal);

    expect(mockStartPolling).toHaveBeenCalled();
  });

  it('stops polling when component unmounts', () => {
    const { unmount } = render(KycWebviewModal);

    unmount();

    expect(mockStopPolling).toHaveBeenCalled();
  });

  it('calls routeAfterAuthentication when status changes to approved', () => {
    mockUseUserDetailsPolling.mockReturnValue({
      userDetails: {
        kyc: {
          l1: {
            status: KycStatus.APPROVED,
            type: 'STANDARD',
          },
        },
      },
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
    });

    render(KycWebviewModal);

    expect(mockStopPolling).toHaveBeenCalled();
    expect(mockRouteAfterAuthentication).toHaveBeenCalledWith({
      id: 'test-quote',
    });
  });

  it('calls routeAfterAuthentication when status changes to rejected', () => {
    mockUseUserDetailsPolling.mockReturnValue({
      userDetails: {
        kyc: {
          l1: {
            status: KycStatus.REJECTED,
            type: 'STANDARD',
          },
        },
      },
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
    });

    render(KycWebviewModal);

    expect(mockStopPolling).toHaveBeenCalled();
    expect(mockRouteAfterAuthentication).toHaveBeenCalledWith({
      id: 'test-quote',
    });
  });

  it('does not call routeAfterAuthentication when KYC status is not submitted', () => {
    mockUseUserDetailsPolling.mockReturnValue({
      userDetails: {
        kyc: {
          l1: {
            status: KycStatus.NOT_SUBMITTED,
            type: 'SIMPLE',
          },
        },
      },
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
    });

    render(KycWebviewModal);

    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('does not call routeAfterAuthentication when quote is missing', () => {
    const mockUseParams = jest.requireMock(
      '../../../../../../../util/navigation/navUtils',
    ).useParams;
    mockUseParams.mockReturnValue({ quote: null });

    mockUseUserDetailsPolling.mockReturnValue({
      userDetails: {
        kyc: {
          l1: {
            status: KycStatus.APPROVED,
            type: 'STANDARD',
          },
        },
      },
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
    });

    render(KycWebviewModal);

    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });
});
