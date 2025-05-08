import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { transferConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { getNavbar } from '../../UI/navbar/navbar';
import Transfer from './transfer';

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
    TransactionController: {
      updateTransaction: jest.fn(),
      getNonceLock: jest
        .fn()
        .mockResolvedValue({ nextNonce: 2, releaseLock: jest.fn() }),
    },
  },
}));

jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../UI/navbar/navbar', () => ({
  getNavbar: jest.fn(),
}));

jest.mock('../../../hooks/metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
}));

jest.mock('../../../hooks/ui/useClearConfirmationOnBackSwipe', () => ({
  __esModule: true,
  default: jest.fn(),
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

describe('Transfer', () => {
  const mockUseClearConfirmationOnBackSwipe = jest.mocked(useClearConfirmationOnBackSwipe);
  const mockTrackPageViewedEvent = jest.fn();
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
      trackPageViewedEvent: mockTrackPageViewedEvent,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
  });

  it('renders expected elements', () => {
    const mockOnReject = jest.fn();
    mockUseConfirmActions.mockImplementation(() => ({
      onConfirm: jest.fn(),
      onReject: mockOnReject,
    }));

    const { getByText } = renderWithProvider(<Transfer />, {
      state: transferConfirmationState,
    });

    expect(mockUseClearConfirmationOnBackSwipe).toHaveBeenCalled();
    expect(getByText('0xDc477...0c164')).toBeDefined();
    expect(getByText('Network Fee')).toBeDefined();
    expect(getNavbar).toHaveBeenCalled();
    expect(getNavbar).toHaveBeenCalledWith({
      title: 'Review',
      onReject: mockOnReject,
      addBackButton: true,
      theme: expect.any(Object),
    });
  });
});
