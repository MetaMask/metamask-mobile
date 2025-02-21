import cloneDeep from 'lodash/cloneDeep';
import { TransactionParams } from '@metamask/transaction-controller';

import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';
import { useFeeCalculations } from './useFeeCalculations';

jest.mock('../../../../core/Engine', () => ({
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
          "estimatedFeeFiat": "$0.34",
          "estimatedFeeNative": "0.0001 ETH",
          "preciseNativeFeeInHex": "0x5572e9c22d00",
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
          "estimatedFeeFiat": "< $0.01",
          "estimatedFeeNative": "0.0001 ETH",
          "preciseNativeFeeInHex": "0x5572e9c22d00",
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
          "estimatedFeeNative": "0.0001 ETH",
          "preciseNativeFeeInHex": "0x5572e9c22d00",
        }
      `);
  });
});
