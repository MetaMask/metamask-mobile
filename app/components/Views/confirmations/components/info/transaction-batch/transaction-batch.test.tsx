import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { generateStablecoinLendingDepositConfirmationState } from '../../../__mocks__/controllers/transaction-batch-mock';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { getNavbar } from '../../UI/navbar/navbar';
import TransactionBatch from './transaction-batch';

jest.mock('../../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    TokenListController: {
      fetchTokenList: jest.fn(),
    },
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {},
        },
      },
    },
  },
}));

jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../../components/UI/navbar/navbar', () => ({
  getNavbar: jest.fn(),
}));

jest.mock('../../../hooks/metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
}));

jest.mock('../../../hooks/gas/useGasFeeToken');
jest.mock('../../../hooks/tokens/useTokenWithBalance');

jest.mock('../../../hooks/gas/useIsGaslessSupported', () => ({
  useIsGaslessSupported: jest.fn().mockReturnValue({
    isSupported: false,
    isSmartTransaction: false,
  }),
}));
jest.mock('../../../hooks/alerts/useInsufficientBalanceAlert', () => ({
  useInsufficientBalanceAlert: jest.fn().mockReturnValue([]),
}));

const noop = () => undefined;
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn().mockReturnValue(noop),
    }),
  };
});

describe('BatchTransaction', () => {
  const mockTrackPageViewedEvent = jest.fn();
  const mockTrackAdvancedDetailsToggledEvent = jest.fn();
  const mockSetConfirmationMetric = jest.fn();
  const mockGetNavbar = jest.mocked(getNavbar);
  const mockUseConfirmActions = jest.mocked(useConfirmActions);
  const mockUseConfirmationMetricEvents = jest.mocked(
    useConfirmationMetricEvents,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmActions.mockReturnValue({
      onReject: jest.fn(),
      onConfirm: jest.fn(),
    });

    mockUseConfirmationMetricEvents.mockReturnValue({
      trackAdvancedDetailsToggledEvent: mockTrackAdvancedDetailsToggledEvent,
      trackPageViewedEvent: mockTrackPageViewedEvent,
      setConfirmationMetric: mockSetConfirmationMetric,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
  });

  it('renders correctly', () => {
    const mockOnReject = jest.fn();
    mockUseConfirmActions.mockImplementation(() => ({
      onConfirm: jest.fn(),
      onReject: mockOnReject,
    }));

    renderWithProvider(<TransactionBatch />, {
      state: generateStablecoinLendingDepositConfirmationState,
    });

    expect(mockGetNavbar).toHaveBeenCalled();
    expect(mockGetNavbar).toHaveBeenCalledWith({
      title: 'Transaction',
      onReject: mockOnReject,
      addBackButton: true,
      theme: expect.any(Object),
    });
  });

  it('tracks metrics events', () => {
    renderWithProvider(<TransactionBatch />, {
      state: generateStablecoinLendingDepositConfirmationState,
    });

    expect(mockTrackPageViewedEvent).toHaveBeenCalledTimes(1);
  });
});
