import React from 'react';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import KycWebviewModal from './KycWebviewModal';
import Routes from '../../../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import useIdProofPolling from '../../../hooks/useIdProofPolling';
import { endTrace } from '../../../../../../../util/trace';

const mockNavigate = jest.fn();
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
    kycWorkflowRunId: 'test-workflow-run-id',
  })),
}));

const mockUseIdProofPolling = jest.fn();

jest.mock(
  '../../../hooks/useIdProofPolling',
  () =>
    (...args: Parameters<typeof useIdProofPolling>) =>
      mockUseIdProofPolling(...args),
);

jest.mock('../../../hooks/useDepositRouting', () => ({
  useDepositRouting: jest.fn(() => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  })),
}));

jest.mock('./WebviewModal', () => () => 'WebviewModal');

jest.mock('../../../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../../../util/trace'),
  endTrace: jest.fn(),
}));

describe('KycWebviewModal', () => {
  function render(Component: React.ComponentType) {
    return renderScreen(
      Component,
      {
        name: Routes.DEPOSIT.MODALS.KYC_WEBVIEW,
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIdProofPolling.mockReturnValue({
      idProofStatus: null,
    });
    mockRouteAfterAuthentication.mockClear();
  });

  it('render matches snapshot', () => {
    const { toJSON } = render(KycWebviewModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls the hook when component mounts', () => {
    render(KycWebviewModal);

    expect(mockUseIdProofPolling).toHaveBeenCalledWith(
      'test-workflow-run-id',
      1000,
      true,
      0,
    );
  });

  it('calls routeAfterAuthentication when status changes to submitted', () => {
    mockUseIdProofPolling.mockReturnValue({
      idProofStatus: 'SUBMITTED',
    });

    render(KycWebviewModal);

    expect(mockRouteAfterAuthentication).toHaveBeenCalledWith({
      id: 'test-quote',
    });
  });

  it('does not call routeAfterAuthentication when quote is missing', () => {
    const mockUseParams = jest.requireMock(
      '../../../../../../../util/navigation/navUtils',
    ).useParams;
    mockUseParams.mockReturnValue({ quote: null });

    mockUseIdProofPolling.mockReturnValue({
      idProofStatus: 'SUBMITTED',
    });
    render(KycWebviewModal);

    expect(mockRouteAfterAuthentication).not.toHaveBeenCalled();
  });

  it('should call endTrace twice when component mounts', () => {
    const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;
    mockEndTrace.mockClear();

    render(KycWebviewModal);

    expect(mockEndTrace).toHaveBeenCalledTimes(2);
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Deposit Continue Flow',
      data: {
        destination: 'DepositKycWebviewModal',
      },
    });
    expect(mockEndTrace).toHaveBeenCalledWith({
      name: 'Deposit Input OTP',
      data: {
        destination: 'DepositKycWebviewModal',
      },
    });
  });
});
