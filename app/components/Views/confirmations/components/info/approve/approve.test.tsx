import React from 'react';

import { ConfirmationRowComponentIDs } from '../../../ConfirmationView.testIds';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { approveERC20TransactionStateMock } from '../../../__mocks__/approve-transaction-mock';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { flushPromises } from '../../../../../../util/test/utils';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import Approve from './approve';

jest.mock('../../../../../../core/Engine', () => {
  const { otherControllersMock } = jest.requireActual(
    '../../../__mocks__/controllers/other-controllers-mock',
  );
  return {
    getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
    context: {
      NetworkController: {
        getNetworkConfigurationByNetworkClientId: jest.fn(),
      },
      GasFeeController: {
        startPolling: jest.fn(),
        stopPollingByPollingToken: jest.fn(),
      },
      TransactionController: {
        updateTransaction: jest.fn(),
        getTransactions: jest.fn().mockReturnValue([]),
        getNonceLock: jest
          .fn()
          .mockResolvedValue({ nextNonce: 2, releaseLock: jest.fn() }),
      },
      KeyringController: {
        state: otherControllersMock.engine.backgroundState.KeyringController,
      },
      AccountsController: {
        state: otherControllersMock.engine.backgroundState.AccountsController,
      },
    },
  };
});

jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../../hooks/metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
}));

jest.mock('../../../hooks/useGetTokenStandardAndDetails', () => ({
  useGetTokenStandardAndDetails: jest.fn().mockReturnValue({
    details: { decimalsNumber: undefined, standard: undefined },
    isPending: false,
  }),
}));

jest.mock('../../../hooks/alerts/useInsufficientBalanceAlert', () => ({
  useInsufficientBalanceAlert: jest.fn().mockReturnValue([]),
}));

describe('Approve', () => {
  const mockTrackPageViewedEvent = jest.fn();
  const mockUseConfirmActions = jest.mocked(useConfirmActions);
  const mockUseConfirmationMetricEvents = jest.mocked(
    useConfirmationMetricEvents,
  );
  const mockSetConfirmationMetric = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmActions.mockReturnValue({
      onReject: jest.fn(),
      onConfirm: jest.fn(),
    });

    mockUseConfirmationMetricEvents.mockReturnValue({
      trackPageViewedEvent: mockTrackPageViewedEvent,
      setConfirmationMetric: mockSetConfirmationMetric,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
  });

  it('renders expected elements', async () => {
    const mockOnReject = jest.fn();
    mockUseConfirmActions.mockImplementation(() => ({
      onConfirm: jest.fn(),
      onReject: mockOnReject,
    }));

    const { getByTestId } = renderWithProvider(<Approve />, {
      state: approveERC20TransactionStateMock,
    });

    await flushPromises();

    expect(
      getByTestId(ConfirmationRowComponentIDs.ACCOUNT_NETWORK),
    ).toBeDefined();
    expect(getByTestId(ConfirmationRowComponentIDs.APPROVE_ROW)).toBeDefined();
    expect(
      getByTestId(ConfirmationRowComponentIDs.GAS_FEES_DETAILS),
    ).toBeDefined();
    expect(
      getByTestId(ConfirmationRowComponentIDs.ADVANCED_DETAILS),
    ).toBeDefined();
  });
});
