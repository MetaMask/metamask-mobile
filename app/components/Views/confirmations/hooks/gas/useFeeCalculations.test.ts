import { cloneDeep } from 'lodash';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { useFeeCalculations } from './useFeeCalculations';

import { isTestNet } from '../../../../../util/networks';

jest.mock('../../../../../util/networks', () => ({
  isTestNet: jest.fn().mockReturnValue(false),
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

jest.mock('../../utils/token', () => ({
  ...jest.requireActual('../../../../utils/token'),
  fetchErc20Decimals: jest.fn().mockResolvedValue(18),
}));

describe('useFeeCalculations', () => {
  const mockIsTestNet = jest.mocked(isTestNet);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const transactionMeta =
    stakingDepositConfirmationState.engine.backgroundState.TransactionController
      .transactions[0];

  it('returns fee calculations', () => {
    const { result } = renderHookWithProvider(
      () => useFeeCalculations(transactionMeta),
      {
        state: stakingDepositConfirmationState,
      },
    );

    expect(result.current.estimatedFeeFiat).toBe('$0.34');
    expect(result.current.estimatedFeeNative).toBe('0.0001 ETH');
    expect(result.current.estimatedFeeFiatPrecise).toBe('0.338');
    expect(result.current.preciseNativeFeeInHex).toBe('0x5572e9c22d00');
    expect(result.current.calculateGasEstimate).toBeDefined();
  });

  it('returns fee calculations but hides fiat on testnets when showFiatOnTestnets is false', () => {
    mockIsTestNet.mockReturnValue(true);
    const clonedStakingDepositConfirmationState = cloneDeep(
      stakingDepositConfirmationState,
    );
    clonedStakingDepositConfirmationState.settings.showFiatOnTestnets = false;

    const {
      result: {
        current: { calculateGasEstimate },
      },
    } = renderHookWithProvider(() => useFeeCalculations(transactionMeta), {
      state: clonedStakingDepositConfirmationState,
    });

    const { currentCurrencyFee } = calculateGasEstimate({
      feePerGas: '0x5572e9c22d00',
      priorityFeePerGas: '0x0',
      gas: '0x5572e9c22d00',
      shouldUseEIP1559FeeLogic: true,
      gasPrice: '0x5572e9c22d00',
    });

    expect(currentCurrencyFee).toBe(null);
  });

  it('returns fee calculations less than $0.01', () => {
    const clonedStakingDepositConfirmationState = cloneDeep(
      stakingDepositConfirmationState,
    );
    clonedStakingDepositConfirmationState.engine.backgroundState.CurrencyRateController.currencyRates.ETH =
      {
        conversionDate: 1732887955.694,
        conversionRate: 80,
        usdConversionRate: 80,
      };

    const { result } = renderHookWithProvider(
      () => useFeeCalculations(transactionMeta),
      {
        state: clonedStakingDepositConfirmationState,
      },
    );

    expect(result.current.estimatedFeeFiat).toBe('< $0.01');
    expect(result.current.estimatedFeeNative).toBe('0.0001 ETH');
    expect(result.current.estimatedFeeFiatPrecise).toBe('0.008');
    expect(result.current.preciseNativeFeeInHex).toBe('0x5572e9c22d00');
    expect(result.current.calculateGasEstimate).toBeDefined();
  });

  it('returns null as estimatedFeeFiat if conversion rate is not available', () => {
    const clonedStakingDepositConfirmationState = cloneDeep(
      stakingDepositConfirmationState,
    );

    // No type is exported for CurrencyRate, so we need to cast it to the correct type
    clonedStakingDepositConfirmationState.engine.backgroundState.CurrencyRateController.currencyRates.ETH =
      null as unknown as {
        conversionDate: number;
        conversionRate: number;
        usdConversionRate: number;
      };

    const { result } = renderHookWithProvider(
      () => useFeeCalculations(transactionMeta),
      {
        state: clonedStakingDepositConfirmationState,
      },
    );

    expect(result.current.estimatedFeeFiat).toBe(null);
    expect(result.current.estimatedFeeNative).toBe(null);
    expect(result.current.estimatedFeeFiatPrecise).toBe(null);
    expect(result.current.preciseNativeFeeInHex).toBe(null);
    expect(result.current.calculateGasEstimate).toBeDefined();
  });

  it('returns fee calculations including layer1GasFee (L1 + L2)', () => {
    const clonedStateWithLayer1GasFee = cloneDeep(
      stakingDepositConfirmationState,
    );
    // Add a layer1GasFee to the transactionMeta
    const layer1GasFee = '0x1000'; // 4096 in hex, small value for test
    clonedStateWithLayer1GasFee.engine.backgroundState.TransactionController.transactions[0].layer1GasFee =
      layer1GasFee;

    const transactionMetaWithLayer1GasFee =
      clonedStateWithLayer1GasFee.engine.backgroundState.TransactionController
        .transactions[0];

    const { result } = renderHookWithProvider(
      () => useFeeCalculations(transactionMetaWithLayer1GasFee),
      {
        state: clonedStateWithLayer1GasFee,
      },
    );

    // The expected values are the sum of the original estimatedFee and layer1GasFee
    // The original estimatedFee is 0x5572e9c22d00, so the sum is 0x5572e9c23d00
    expect(result.current.estimatedFeeFiat).toBe('$0.34');
    expect(result.current.estimatedFeeNative).toBe('0.0001 ETH');
    expect(result.current.estimatedFeeFiatPrecise).toBe('0.338');
    expect(result.current.preciseNativeFeeInHex).toBe('0x5572e9c23d00');
    expect(result.current.calculateGasEstimate).toBeDefined();
  });
});
