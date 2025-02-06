import { TransactionType } from '@metamask/transaction-controller';
import { merge } from 'lodash';

import { useTransactionMetadata } from './useTransactionMetadata';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';

describe('useTransactionMetadata', () => {
  it('returns transaction metadata when approval type is Transaction', () => {
    const { result } = renderHookWithProvider(useTransactionMetadata, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current).toEqual(
      stakingDepositConfirmationState.engine.backgroundState
        .TransactionController.transactions[0],
    );
  });

  it('returns undefined when approval type is not Transaction', () => {
    const { result } = renderHookWithProvider(useTransactionMetadata, {
      state: personalSignatureConfirmationState,
    });

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when transaction metadata is not found', () => {
    const state = merge(personalSignatureConfirmationState, {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: [],
          },
        },
      },
    });

    const { result } = renderHookWithProvider(useTransactionMetadata, {
      state,
    });

    expect(result.current).toBeUndefined();
  });
});
