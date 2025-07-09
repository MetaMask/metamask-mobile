import React from 'react';
import { render } from '@testing-library/react-native';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import KycWebviewModal from './KycWebviewModal';
import { KycStatus } from '../../../constants';

const mockNavigate = jest.fn();
const mockStartPolling = jest.fn();
const mockStopPolling = jest.fn();

jest.mock('@react-navigation/native', () => ({
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

jest.mock('../../KycProcessing/KycProcessing', () => ({
  createKycProcessingNavDetails: jest.fn(() => [
    'KycProcessing',
    { quote: { id: 'test-quote' } },
  ]),
}));

const mockUseUserDetailsPolling = jest.fn();

jest.mock(
  '../../../hooks/useUserDetailsPolling',
  () => () => mockUseUserDetailsPolling(),
);

jest.mock('./WebviewModal', () => () => 'WebviewModal');

describe('KycWebviewModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserDetailsPolling.mockReturnValue({
      userDetails: null,
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
    });
  });

  it('render matches snapshot', () => {
    const { toJSON } = render(<KycWebviewModal />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('starts polling when component mounts', () => {
    render(<KycWebviewModal />);

    expect(mockStartPolling).toHaveBeenCalled();
  });

  it('stops polling when component unmounts', () => {
    const { unmount } = render(<KycWebviewModal />);

    unmount();

    expect(mockStopPolling).toHaveBeenCalled();
  });

  it('navigates to KYC processing when status changes to approved', () => {
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

    render(<KycWebviewModal />);

    expect(mockStopPolling).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('KycProcessing', {
      quote: { id: 'test-quote' },
    });
  });

  it('navigates to KYC processing when status changes to rejected', () => {
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

    render(<KycWebviewModal />);

    expect(mockStopPolling).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('KycProcessing', {
      quote: { id: 'test-quote' },
    });
  });

  it('does not navigate when KYC status is not submitted', () => {
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

    render(<KycWebviewModal />);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when quote is missing', () => {
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

    render(<KycWebviewModal />);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
