import { cloneDeep } from 'lodash';
import { NetworkConfiguration } from '@metamask/network-controller';
import { mergeGasFeeEstimates } from '@metamask/transaction-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import usePolling from '../../../../../components/hooks/usePolling';
import Engine from '../../../../../core/Engine';
import { useGasFeeEstimates } from './useGasFeeEstimates';

jest.mock('@metamask/transaction-controller', () => ({
  ...jest.requireActual('@metamask/transaction-controller'),
  mergeGasFeeEstimates: jest.fn(),
}));

jest.mock('../../../../../components/hooks/usePolling', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
  },
}));

describe('useGasFeeEstimates', () => {
  const mockNetworkClientId = '1';
  const startPollingMock = jest.fn();
  const stopPollingByPollingTokenMock = jest.fn();
  const usePollingMock = jest.mocked(usePolling);
  const EngineMock = jest.mocked(Engine);

  beforeEach(() => {
    jest.clearAllMocks();

    EngineMock.context.GasFeeController.startPolling.mockImplementation(
      startPollingMock,
    );
    EngineMock.context.GasFeeController.stopPollingByPollingToken.mockImplementation(
      stopPollingByPollingTokenMock,
    );
    EngineMock.context.NetworkController.getNetworkConfigurationByNetworkClientId.mockImplementation(
      () =>
        ({
          chainId: '0x1',
        } as unknown as NetworkConfiguration),
    );
  });

  it('polls with given network client id', async () => {
    renderHookWithProvider(() => useGasFeeEstimates('mockNetworkClientId2'), {
      state: stakingDepositConfirmationState,
    });

    expect(usePollingMock).toHaveBeenCalledWith({
      startPolling: expect.any(Function),
      stopPollingByPollingToken: expect.any(Function),
      input: [{ networkClientId: 'mockNetworkClientId2' }],
    });
  });

  it('returns gas fee estimates from gas fee controller if transaction does not have gas fee estimates', () => {
    const transactionWithoutGasFeeEstimates = cloneDeep(
      stakingDepositConfirmationState,
    );
    transactionWithoutGasFeeEstimates.engine.backgroundState.TransactionController.transactions[0].gasFeeEstimates =
      undefined;

    const { result } = renderHookWithProvider(
      () => useGasFeeEstimates(mockNetworkClientId),
      {
        state: transactionWithoutGasFeeEstimates,
      },
    );

    expect(result.current.gasFeeEstimates).toEqual(
      stakingDepositConfirmationState.engine.backgroundState.GasFeeController
        .gasFeeEstimatesByChainId?.['0x1'].gasFeeEstimates,
    );
  });

  it('merges gas fee estimates from transaction and gas fee controller', () => {
    renderHookWithProvider(() => useGasFeeEstimates(mockNetworkClientId), {
      state: stakingDepositConfirmationState,
    });

    expect(mergeGasFeeEstimates).toHaveBeenCalledWith({
      gasFeeControllerEstimates:
        stakingDepositConfirmationState.engine.backgroundState.GasFeeController
          .gasFeeEstimatesByChainId?.['0x1'].gasFeeEstimates,
      transactionGasFeeEstimates:
        stakingDepositConfirmationState.engine.backgroundState
          .TransactionController.transactions[0].gasFeeEstimates,
    });
  });
});
