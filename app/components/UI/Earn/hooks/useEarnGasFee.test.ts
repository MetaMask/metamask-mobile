import { CurrencyRateState } from '@metamask/assets-controllers';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { act } from '@testing-library/react-hooks';
import BN4 from 'bnjs4';
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { flushPromises } from '../../../../util/test/utils';
import { useStakeContext } from '../../Stake/hooks/useStakeContext';
import { mockEarnControllerRootState } from '../../Stake/testUtils';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails } from '../types/lending.types';
import useEarnDepositGasFee from './useEarnGasFee';

jest.mock('../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      fetchGasFeeEstimates: jest.fn(),
    },
  },
}));

jest.mock('../../Stake/hooks/useStakeContext', () => ({
  useStakeContext: jest.fn(),
}));

const MOCK_ROOT_STATE_WITH_EARN_CONTROLLER = mockEarnControllerRootState();

const mockState = {
  ...MOCK_ROOT_STATE_WITH_EARN_CONTROLLER,
  engine: {
    ...MOCK_ROOT_STATE_WITH_EARN_CONTROLLER.engine,
    backgroundState: {
      ...MOCK_ROOT_STATE_WITH_EARN_CONTROLLER.engine.backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      GasFeeController: {
        fetchGasFeeEstimates: jest.fn(),
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          USD: {
            conversionDate: 1717334400000,
            conversionRate: 1,
            usdConversionRate: 1,
          },
          ETH: {
            conversionDate: 1717334400000,
            conversionRate: 1,
            usdConversionRate: 1,
          },
        },
      } as CurrencyRateState,
    },
  },
} as unknown as RootState;

describe('useEarnDepositGasFee', () => {
  const mockStakingContract = {
    estimateDepositGas: jest.fn(),
  };

  const mockLendingContracts = {
    supply: jest.fn(),
  };

  const mockAmountTokenMinimalUnit = new BN4('1000000000000000000'); // 1 ETH
  const mockGasLimitDefault = 50000;
  const mockGasPriceDefault = '50';

  const mockGasFeeEstimatesDefault = {
    gasEstimateType: GAS_ESTIMATE_TYPES.LEGACY,
    gasFeeEstimates: {
      high: mockGasPriceDefault,
    },
  };
  const mockEarnExperience: EarnTokenDetails['experience'] = {
    type: EARN_EXPERIENCES.POOLED_STAKING,
    apr: '5%',
    estimatedAnnualRewardsFormatted: '0.05 ETH',
    estimatedAnnualRewardsFiatNumber: 100,
    estimatedAnnualRewardsTokenMinimalUnit: '50000000000000000',
    estimatedAnnualRewardsTokenFormatted: '0.05 ETH',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useStakeContext as jest.Mock).mockReturnValue({
      stakingContract: mockStakingContract,
      lendingContracts: mockLendingContracts,
    });
    (
      Engine.context.GasFeeController.fetchGasFeeEstimates as jest.Mock
    ).mockResolvedValue(mockGasFeeEstimatesDefault);
  });

  it('should initialize with default values', () => {
    const { result } = renderHookWithProvider(
      () =>
        useEarnDepositGasFee(mockAmountTokenMinimalUnit, mockEarnExperience),
      {
        state: mockState,
      },
    );

    expect(result.current.estimatedEarnGasFeeWei).toEqual(new BN4(0));
    expect(result.current.isLoadingEarnGasFee).toBe(true);
    expect(result.current.isEarnGasFeeError).toBe(false);
    expect(typeof result.current.refreshEarnGasValues).toBe('function');
    expect(typeof result.current.getEstimatedEarnGasFee).toBe('function');
  });

  it('should handle pooled staking gas estimation', async () => {
    (
      Engine.context.GasFeeController.fetchGasFeeEstimates as jest.Mock
    ).mockResolvedValue(mockGasFeeEstimatesDefault);
    mockStakingContract.estimateDepositGas.mockResolvedValue(
      mockGasLimitDefault,
    );

    const { result } = renderHookWithProvider(
      () =>
        useEarnDepositGasFee(mockAmountTokenMinimalUnit, mockEarnExperience),
      {
        state: mockState,
      },
    );

    await act(async () => {
      await result.current.getEstimatedEarnGasFee(mockAmountTokenMinimalUnit);
    });

    expect(mockStakingContract.estimateDepositGas).toHaveBeenCalledWith(
      '1.0',
      expect.any(String),
      '0x0000000000000000000000000000000000000000',
    );
    expect(result.current.estimatedEarnGasFeeWei).toBeDefined();
  });

  it('should handle stablecoin lending gas estimation', async () => {
    const mockGasPrice = '50';
    const mockGasFeeEstimates = {
      gasEstimateType: GAS_ESTIMATE_TYPES.LEGACY,
      gasFeeEstimates: {
        high: mockGasPrice,
      },
    };

    (
      Engine.context.GasFeeController.fetchGasFeeEstimates as jest.Mock
    ).mockResolvedValue(mockGasFeeEstimates);

    const stablecoinExperience: EarnTokenDetails['experience'] = {
      ...mockEarnExperience,
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    };

    const { result } = renderHookWithProvider(
      () =>
        useEarnDepositGasFee(mockAmountTokenMinimalUnit, stablecoinExperience),
      {
        state: mockState,
      },
    );

    await act(async () => {
      await result.current.getEstimatedEarnGasFee(mockAmountTokenMinimalUnit);
    });

    expect(result.current.estimatedEarnGasFeeWei).toBeDefined();
  });

  it('should handle fee market gas estimation', async () => {
    const mockGasLimit = 50000;
    const mockGasFeeEstimates = {
      gasEstimateType: GAS_ESTIMATE_TYPES.FEE_MARKET,
      gasFeeEstimates: {
        high: {
          suggestedMaxFeePerGas: '50',
        },
      },
    };

    (
      Engine.context.GasFeeController.fetchGasFeeEstimates as jest.Mock
    ).mockResolvedValue(mockGasFeeEstimates);
    mockStakingContract.estimateDepositGas.mockResolvedValue(mockGasLimit);

    const { result } = renderHookWithProvider(
      () =>
        useEarnDepositGasFee(mockAmountTokenMinimalUnit, mockEarnExperience),
      {
        state: mockState,
      },
    );

    await act(async () => {
      await result.current.getEstimatedEarnGasFee(mockAmountTokenMinimalUnit);
    });

    expect(result.current.estimatedEarnGasFeeWei).toBeDefined();
  });

  it('should handle gas estimation errors', async () => {
    (
      Engine.context.GasFeeController.fetchGasFeeEstimates as jest.Mock
    ).mockRejectedValue(new Error('Gas estimation failed'));

    const { result } = renderHookWithProvider(
      () =>
        useEarnDepositGasFee(mockAmountTokenMinimalUnit, mockEarnExperience),
      {
        state: mockState,
      },
    );

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.isEarnGasFeeError).toBe(true);
  });

  it('should handle missing staking contract for pooled staking', async () => {
    (useStakeContext as jest.Mock).mockReturnValue({
      stakingContract: null,
      lendingContracts: mockLendingContracts,
    });

    const { result } = renderHookWithProvider(
      () =>
        useEarnDepositGasFee(mockAmountTokenMinimalUnit, mockEarnExperience),
      {
        state: mockState,
      },
    );

    await act(async () => {
      await result.current.getEstimatedEarnGasFee(mockAmountTokenMinimalUnit);
    });

    expect(result.current.isEarnGasFeeError).toBe(true);
  });

  it('should handle missing lending contracts for stablecoin lending', async () => {
    (useStakeContext as jest.Mock).mockReturnValue({
      stakingContract: mockStakingContract,
      lendingContracts: null,
    });

    const stablecoinExperience: EarnTokenDetails['experience'] = {
      ...mockEarnExperience,
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    };

    const { result } = renderHookWithProvider(
      () =>
        useEarnDepositGasFee(mockAmountTokenMinimalUnit, stablecoinExperience),
      {
        state: mockState,
      },
    );

    await act(async () => {
      await result.current.getEstimatedEarnGasFee(mockAmountTokenMinimalUnit);
    });

    expect(result.current.isEarnGasFeeError).toBe(true);
  });

  it('should refresh gas values when refreshEarnGasValues is called', async () => {
    const mockGasLimit = 50000;
    const mockGasPrice = '50';
    const mockGasFeeEstimates = {
      gasEstimateType: GAS_ESTIMATE_TYPES.LEGACY,
      gasFeeEstimates: {
        high: mockGasPrice,
      },
    };

    (
      Engine.context.GasFeeController.fetchGasFeeEstimates as jest.Mock
    ).mockResolvedValue(mockGasFeeEstimates);
    mockStakingContract.estimateDepositGas.mockResolvedValue(mockGasLimit);

    const { result } = renderHookWithProvider(
      () =>
        useEarnDepositGasFee(mockAmountTokenMinimalUnit, mockEarnExperience),
      {
        state: mockState,
      },
    );

    await act(async () => {
      await result.current.refreshEarnGasValues();
    });

    expect(result.current.isLoadingEarnGasFee).toBe(false);
    expect(result.current.estimatedEarnGasFeeWei).toBeDefined();
  });
});
