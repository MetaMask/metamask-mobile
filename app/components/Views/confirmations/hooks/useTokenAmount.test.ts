import { useTokenAmount } from './useTokenAmount';
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

describe('useTokenAmount', () => {
  describe('staking deposit', () => {
    it('returns token and fiat values if from transaction metadata', async () => {
      const { result } = renderHookWithProvider(() => useTokenAmount(), {
        state: stakingDepositConfirmationState,
      });

      await waitFor(async () => {
        expect(result.current).toEqual({
          amountDisplay: '0.0001',
          amountPreciseDisplay: '0.0001',
          fiatDisplay: '$0.36',
        });
      });
    });

    it('returns token and fiat values if amountWei is defined', async () => {
      const { result } = renderHookWithProvider(() => useTokenAmount({ amountWei: '1000000000000000' }), {
        state: stakingDepositConfirmationState,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          amountDisplay: '0.001',
          amountPreciseDisplay: '0.001',
          fiatDisplay: '$3.60',
        });
      });
    });
  });
});
