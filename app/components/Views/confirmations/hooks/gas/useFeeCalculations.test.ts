import cloneDeep from 'lodash/cloneDeep';
import { TransactionParams } from '@metamask/transaction-controller';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { useFeeCalculations } from './useFeeCalculations';

// --- Modify mock setup ---
const MOCK_CHAIN_ID =
  stakingDepositConfirmationState.engine.backgroundState.TransactionController
    .transactions[0].chainId;
const MOCK_NETWORK_CLIENT_ID =
  stakingDepositConfirmationState.engine.backgroundState.TransactionController
    .transactions[0].networkClientId;

jest.mock('../../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    NetworkController: {
      // Mock getNetworkConfigurationByNetworkClientId to return a valid config
      getNetworkConfigurationByNetworkClientId: jest.fn((networkClientId) => {
        if (networkClientId === MOCK_NETWORK_CLIENT_ID) {
          return {
            chainId: MOCK_CHAIN_ID,
            // Add other required fields if necessary, using defaults or values from stakingDepositConfirmationState
            rpcUrl: 'mockRpcUrl',
            ticker: 'MOCK',
            nickname: 'Mock Network',
            id: networkClientId, // Use the provided networkClientId
          };
        }
        return undefined; // Return undefined for unexpected client IDs
      }),
    },
  },
}));

describe('useFeeCalculations', () => {
  const transactionMeta =
    stakingDepositConfirmationState.engine.backgroundState.TransactionController
      .transactions[0];

  it('returns no estimates for empty txParams', async () => {
    const clonedStateWithoutTxParams = cloneDeep(
      stakingDepositConfirmationState,
    );
    clonedStateWithoutTxParams.engine.backgroundState.TransactionController.transactions[0].txParams =
      undefined as unknown as TransactionParams;

    const transactionMetaWithoutTxParams =
      clonedStateWithoutTxParams.engine.backgroundState.TransactionController
        .transactions[0];

    const { result } = renderHookWithProvider(
      () => useFeeCalculations(transactionMetaWithoutTxParams),
      {
        state: clonedStateWithoutTxParams,
      },
    );
    expect(result.current).toMatchInlineSnapshot(`
            {
              "estimatedFeeFiat": "$0.00",
              "estimatedFeeNative": "0 ETH",
              "preciseNativeFeeInHex": "0x0",
            }
          `);
  });

  it('returns fee calculations', async () => {
    const { result } = renderHookWithProvider(
      () => useFeeCalculations(transactionMeta),
      {
        state: stakingDepositConfirmationState,
      },
    );
    expect(result.current).toMatchInlineSnapshot(`
      {
        "estimatedFeeFiat": "$0.51",
        "estimatedFeeNative": "0.0001 ETH",
        "preciseNativeFeeInHex": "0x807fa4396c19",
      }
    `);
  });

  it('returns fee calculations less than $0.01', async () => {
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
    expect(result.current).toMatchInlineSnapshot(`
      {
        "estimatedFeeFiat": "$0.01",
        "estimatedFeeNative": "0.0001 ETH",
        "preciseNativeFeeInHex": "0x807fa4396c19",
      }
    `);
  });

  it('returns null as estimatedFeeFiat if conversion rate is not available', async () => {
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
    expect(result.current).toMatchInlineSnapshot(`
      {
        "estimatedFeeFiat": null,
        "estimatedFeeNative": null,
        "preciseNativeFeeInHex": "0x807fa4396c19",
      }
    `);
  });

  it('returns fee calculations including layer1GasFee (L1 + L2)', async () => {
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

    clonedStateWithLayer1GasFee.engine.backgroundState.GasFeeController = {
      ...clonedStateWithLayer1GasFee.engine.backgroundState.GasFeeController,
      gasFeeEstimates: {
        estimatedBaseFee: '15', // Example base fee in Gwei
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { result } = renderHookWithProvider(
      () => useFeeCalculations(transactionMetaWithLayer1GasFee),
      {
        state: clonedStateWithLayer1GasFee,
      },
    );
    // The expected values are the sum of the original estimatedFee and layer1GasFee
    // The original estimatedFee is 0x5572e9c22d00, so the sum is 0x5572e9c23d00
    expect(result.current).toMatchInlineSnapshot(`
      {
        "estimatedFeeFiat": "$0.51",
        "estimatedFeeNative": "0.0001 ETH",
        "preciseNativeFeeInHex": "0x807fa4397c19",
      }
    `);
  });
});
