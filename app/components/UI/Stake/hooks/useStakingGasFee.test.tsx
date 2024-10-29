import { act, waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useStakingGasFee from './useStakingGasFee';
import Engine from '../../../../core/Engine';
import BN4 from 'bnjs4';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../../util/test/accountsControllerTestUtils';

// Mock address and account controller state
const MOCK_ADDRESS_1 = '0x0';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);
const MOCK_STAKE_DEPOSIT_GAS_LIMIT = 54809;
const mockEstimateDepositGas = jest
  .fn()
  .mockResolvedValue(MOCK_STAKE_DEPOSIT_GAS_LIMIT);

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

// Mock Engine context for GasFeeController
jest.mock('../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      fetchGasFeeEstimates: jest.fn(() =>
        Promise.resolve({
          gasEstimateType: 'fee-market',
          gasFeeEstimates: {
            baseFeeTrend: 'up',
            estimatedBaseFee: '53.465906896',
            high: {
              maxWaitTimeEstimate: 60000,
              minWaitTimeEstimate: 15000,
              suggestedMaxFeePerGas: '71.505678965',
              suggestedMaxPriorityFeePerGas: '2',
            },
            historicalBaseFeeRange: ['34.414135263', '97.938829873'],
            historicalPriorityFeeRange: ['0.1', '100'],
            latestPriorityFeeRange: ['1.5', '19.288193104'],
            low: {
              maxWaitTimeEstimate: 30000,
              minWaitTimeEstimate: 15000,
              suggestedMaxFeePerGas: '54.875906896',
              suggestedMaxPriorityFeePerGas: '1.41',
            },
            medium: {
              maxWaitTimeEstimate: 45000,
              minWaitTimeEstimate: 15000,
              suggestedMaxFeePerGas: '68.33238362',
              suggestedMaxPriorityFeePerGas: '1.5',
            },
            networkCongestion: 0.4515,
            priorityFeeTrend: 'down',
          },
        }),
      ),
    },
  },
}));

const mockPooledStakingContractService = {
  estimateDepositGas: mockEstimateDepositGas,
};

const mockSdkContext = {
  stakingContract: mockPooledStakingContractService,
};

jest.mock('./useStakeContext', () => ({
  useStakeContext: () => mockSdkContext,
}));

describe('useStakingGasFee', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', async () => {
    const { result } = renderHookWithProvider(
      () => useStakingGasFee('1000000000000000000'),
      {
        state: mockInitialState,
      },
    );

    expect(result.current.isLoadingStakingGasFee).toBe(true);
    expect(result.current.isStakingGasFeeError).toBe(false);
    expect(result.current.estimatedGasFeeWei).toEqual(new BN4(0));
  });

  it('should fetch gas limit and calculate gas fee correctly', async () => {
    const { result } = renderHookWithProvider(
      () => useStakingGasFee('1000000000000000000'),
      {
        state: mockInitialState,
      },
    );

    await waitFor(() => {
      expect(
        mockPooledStakingContractService.estimateDepositGas,
      ).toHaveBeenCalledWith(
        '1.0',
        MOCK_ADDRESS_1,
        '0x0000000000000000000000000000000000000000',
      );
      expect(result.current.estimatedGasFeeWei).toEqual(
        new BN4('5094922637614180'),
      );
    });
  });

  it('should handle error when fetching gas fee', async () => {
    mockPooledStakingContractService.estimateDepositGas.mockRejectedValue(
      new Error('SDK Error'),
    );

    const { result } = renderHookWithProvider(
      () => useStakingGasFee('1000000000000000000'),
      {
        state: mockInitialState,
      },
    );

    await waitFor(() => {
      expect(result.current.isStakingGasFeeError).toBe(true);
      expect(result.current.estimatedGasFeeWei).toEqual(new BN4(0));
    });
  });

  it('should refresh gas fee values', async () => {
    const { result } = renderHookWithProvider(
      () => useStakingGasFee('1000000000000000000'),
      {
        state: mockInitialState,
      },
    );

    await waitFor(() => {
      expect(result.current.isLoadingStakingGasFee).toBe(false);
    });

    // Trigger refresh
    act(() => {
      result.current.refreshGasValues();
    });

    await waitFor(() => {
      expect(
        Engine.context.GasFeeController.fetchGasFeeEstimates,
      ).toHaveBeenCalledTimes(2);
    });
  });
});
