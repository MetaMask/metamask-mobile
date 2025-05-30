import { waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  stakingDepositConfirmationState,
  transferConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import { useTokenAmount } from './useTokenAmount';

jest.mock('./useNetworkInfo', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    networkNativeCurrency: 'ETH',
  })),
}));

describe('useTokenAmount', () => {
  describe('returns amount and fiat display values', () => {
    it('for a transfer type transaction', async () => {
      const { result } = renderHookWithProvider(() => useTokenAmount(), {
        state: transferConfirmationState,
      });

      await waitFor(async () => {
        expect(result.current).toEqual({
          amount: '0.0001',
          amountPrecise: '0.0001',
          fiat: '$0.36',
          usdValue: '0.359625',
        });
      });
    });

    it('for a staking deposit', async () => {
      const { result } = renderHookWithProvider(() => useTokenAmount(), {
        state: stakingDepositConfirmationState,
      });

      await waitFor(async () => {
        expect(result.current).toEqual({
          amount: '0.0001',
          amountPrecise: '0.0001',
          fiat: '$0.36',
          usdValue: '0.359625',
        });
      });
    });

    it('for a staking deposit and with amountWei defined', async () => {
      const { result } = renderHookWithProvider(() => useTokenAmount({ amountWei: '1000000000000000' }), {
        state: stakingDepositConfirmationState,
      });

      await waitFor(() => {
        expect(result.current).toEqual({
          amount: '0.001',
          amountPrecise: '0.001',
          fiat: '$3.60',
          usdValue: '3.59625',
        });
      });
    });
  });
});
