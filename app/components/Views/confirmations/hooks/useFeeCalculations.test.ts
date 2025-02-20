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
              "estimatedFeeFiat": "< $0.01",
              "estimatedFeeFiatWith18SignificantDigits": "0",
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
          "estimatedFeeFiatWith18SignificantDigits": null,
          "estimatedFeeNative": "0.0001 ETH",
          "preciseNativeFeeInHex": "0x5572e9c22d00",
        }
      `);
  });
});
