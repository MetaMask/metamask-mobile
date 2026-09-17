import { merge } from 'lodash';

import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import { useGasFeeModalTransaction } from '../../context/gas-fee-modal-transaction';

jest.mock('../../context/gas-fee-modal-transaction');

describe('useTransactionMetadataRequest', () => {
  beforeEach(() => {
    jest.mocked(useGasFeeModalTransaction).mockReturnValue({
      transactionId: null,
    });
  });

  it('returns transaction metadata', () => {
    const { result } = renderHookWithProvider(useTransactionMetadataRequest, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current).toEqual(
      stakingDepositConfirmationState.engine.backgroundState
        .TransactionController.transactions[0],
    );
  });

  it('returns undefined when approval type is not Transaction', () => {
    const { result } = renderHookWithProvider(useTransactionMetadataRequest, {
      state: personalSignatureConfirmationState,
    });

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when transaction metadata is not found', () => {
    const state = merge({}, personalSignatureConfirmationState, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [],
          },
        },
      },
    });

    const { result } = renderHookWithProvider(useTransactionMetadataRequest, {
      state,
    });

    expect(result.current).toBeUndefined();
  });

  it('reads the gas modal transaction instead of the pending approval', () => {
    const transaction = {
      ...stakingDepositConfirmationState.engine.backgroundState
        .TransactionController.transactions[0],
      id: 'gas-modal-transaction',
    };
    const state = merge({}, stakingDepositConfirmationState);
    state.engine.backgroundState.TransactionController.transactions.push(
      transaction,
    );
    jest.mocked(useGasFeeModalTransaction).mockReturnValue({
      transactionId: transaction.id,
    });

    const { result } = renderHookWithProvider(useTransactionMetadataRequest, {
      state,
    });

    expect(result.current).toEqual(transaction);
  });
});
