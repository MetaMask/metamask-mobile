import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
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
});
