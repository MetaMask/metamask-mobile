import { NetworkConfiguration } from '@metamask/network-controller';
import { useGasFeeEstimates } from './useGasFeeEstimates';
import usePolling from './usePolling';
import Engine from '../../core/Engine';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';
import initialRootState from '../../util/test/initial-root-state';

jest.mock('./usePolling', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../core/Engine', () => ({
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

  const mockGasFeeEstimates = {
    low: { suggestedMaxPriorityFeePerGas: '1', suggestedMaxFeePerGas: '20' },
    medium: { suggestedMaxPriorityFeePerGas: '2', suggestedMaxFeePerGas: '25' },
    high: { suggestedMaxPriorityFeePerGas: '3', suggestedMaxFeePerGas: '30' },
  };

  const mockState = {
    ...initialRootState,
    engine: {
      ...initialRootState.engine,
      backgroundState: {
        ...initialRootState.engine.backgroundState,
        GasFeeController: {
          ...initialRootState.engine.backgroundState.GasFeeController,
          gasFeeEstimatesByChainId: {
            '0x1': {
              gasFeeEstimates: mockGasFeeEstimates,
            },
          },
        },
      },
    },
  };

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

  it('polls with given network client id', () => {
    renderHookWithProvider(() => useGasFeeEstimates('mockNetworkClientId2'), {
      state: mockState,
    });

    expect(usePollingMock).toHaveBeenCalledWith({
      startPolling: expect.any(Function),
      stopPollingByPollingToken: expect.any(Function),
      input: [{ networkClientId: 'mockNetworkClientId2' }],
    });
  });

  it('returns gas fee estimates from gas fee controller', () => {
    const { result } = renderHookWithProvider(
      () => useGasFeeEstimates(mockNetworkClientId),
      {
        state: mockState,
      },
    );

    expect(result.current.gasFeeEstimates).toEqual(mockGasFeeEstimates);
  });
});
