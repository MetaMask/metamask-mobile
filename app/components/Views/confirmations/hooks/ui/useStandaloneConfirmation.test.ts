import { TransactionType } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
  transferConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { useStandaloneConfirmation } from './useStandaloneConfirmation';

describe('useStandaloneConfirmation', () => {
  it('returns true for staking confirmation', async () => {
    const { result } = renderHookWithProvider(useStandaloneConfirmation, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current.isStandaloneConfirmation).toBe(true);
  });

  it('returns false for personal sign request', async () => {
    const { result } = renderHookWithProvider(useStandaloneConfirmation, {
      state: personalSignatureConfirmationState,
    });

    expect(result.current.isStandaloneConfirmation).toBe(false);
  });

  describe('transfer confirmations', () => {
    it('returns true if transaction origin is MMM', async () => {
      const { result } = renderHookWithProvider(useStandaloneConfirmation, {
        state: merge({}, transferConfirmationState, {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [
                  { origin: MMM_ORIGIN, type: TransactionType.simpleSend },
                ],
              },
            },
          },
        }),
      });

      expect(result.current.isStandaloneConfirmation).toBe(true);
    });

    it('returns false if transaction origin is not MMM', async () => {
      const { result } = renderHookWithProvider(useStandaloneConfirmation, {
        state: merge({}, transferConfirmationState, {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [
                  { origin: 'test', type: TransactionType.simpleSend },
                ],
              },
            },
          },
        }),
      });

      expect(result.current.isStandaloneConfirmation).toBe(false);
    });
  });
});
