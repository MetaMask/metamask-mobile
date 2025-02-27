import { useTokenValues } from './useTokenValues';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';

describe('useTokenValues', () => {
  describe('staking deposit', () => {
    it('returns token and fiat values', () => {
      const { result } = renderHookWithProvider(useTokenValues, {
        state: stakingDepositConfirmationState,
      });

      expect(result.current).toEqual({
        tokenAmountValue: '0.0001',
        tokenAmountDisplayValue: '0.0001',
        fiatDisplayValue: '$0.36',
      });
    });
  });
});
