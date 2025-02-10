import { merge } from 'lodash';

import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';

describe('useTransactionMetadataRequest', () => {
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
    const state = merge(personalSignatureConfirmationState, {
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
});
