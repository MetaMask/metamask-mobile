import { useTokenAmount } from './useTokenAmount';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  stakingDepositConfirmationState,
  transferConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import { waitFor } from '@testing-library/react-native';

jest.mock('../../../../core/Engine', () => ({
  context: {
    TokenListController: {
      fetchTokenList: jest.fn(),
    },
  },
}));

describe('useTokenAmount', () => {
  describe('returns amount and fiat display values', () => {
    it('for a transfer type transaction', async () => {
      const { result } = renderHookWithProvider(() => useTokenAmount(), {
        state: transferConfirmationState,
      });

      await waitFor(async () => {
        expect(result.current).toEqual({
          amountDisplay: '0.0001',
          amountPreciseDisplay: '0.0001',
          fiatDisplay: '$0.36',
        });
      });
    });

    it('for a staking deposit', async () => {
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

    it('for a staking deposit and with amountWei defined', async () => {
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
