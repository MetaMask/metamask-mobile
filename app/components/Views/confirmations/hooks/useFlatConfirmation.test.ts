import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import { useFlatConfirmation } from './useFlatConfirmation';

describe('useFlatConfirmation', () => {
  it('returns true for staking confirmation', async () => {
    const { result } = renderHookWithProvider(useFlatConfirmation, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current.isFlatConfirmation).toBe(true);
  });

  it('returns false for personal sign request', async () => {
    const { result } = renderHookWithProvider(useFlatConfirmation, {
      state: personalSignatureConfirmationState,
    });

    expect(result.current.isFlatConfirmation).toBe(false);
  });
});
