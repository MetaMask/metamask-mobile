import { useTokenValues } from './useTokenValues';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';

describe('useTokenValues', () => {
  describe('staking deposit', () => {
    it('returns token and fiat values if from transaction metadata', () => {
      const { result } = renderHookWithProvider(() => useTokenValues({ amountWei: undefined }), {
        state: stakingDepositConfirmationState,
      });

      expect(result.current).toEqual({
        tokenAmountValue: '0.0001',
        tokenAmountDisplayValue: '0.0001',
        fiatDisplayValue: '$0.36',
      });
    });

    it('returns token and fiat values if amountWei is defined', () => {
      const { result } = renderHookWithProvider(() => useTokenValues({ amountWei: '1000000000000000' }), {
        state: stakingDepositConfirmationState,
      });

      expect(result.current).toEqual({
        tokenAmountValue: '0.001',
        tokenAmountDisplayValue: '0.001',
        fiatDisplayValue: '$3.60',
      });
    });
  });
});
