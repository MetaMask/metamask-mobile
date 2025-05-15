import { useTokenValuesByType } from './useTokenValuesByType';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';
import { waitFor } from '@testing-library/react-native';

jest.mock('../../../../core/Engine', () => ({
  context: {
    TokenListController: {
      fetchTokenList: jest.fn(),
    },
  },
}));

describe('useTokenValuesByType', () => {
  describe('staking deposit', () => {
    it('returns token and fiat values if from transaction metadata', async () => {
      const { result } = renderHookWithProvider(() => useTokenValuesByType({ amountWei: undefined }), {
        state: stakingDepositConfirmationState,
      });

      await waitFor(async () => {
        expect(result.current).toEqual({
          tokenAmountValue: '0.0001',
          tokenAmountDisplayValue: '0.0001',
          fiatDisplayValue: '$0.36',
        });
      });
    });

    it('returns token and fiat values if amountWei is defined', async () => {
      const { result } = renderHookWithProvider(() => useTokenValuesByType({ amountWei: '1000000000000000' }), {
        state: stakingDepositConfirmationState,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          tokenAmountValue: '0.001',
          tokenAmountDisplayValue: '0.001',
          fiatDisplayValue: '$3.60',
        });
      });
    });
  });
});
