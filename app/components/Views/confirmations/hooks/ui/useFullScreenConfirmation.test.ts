import { TransactionType } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import {
  personalSignatureConfirmationState,
  stakingDepositConfirmationState,
  transferConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useParams } from '../../../../../util/navigation/navUtils';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { useFullScreenConfirmation } from './useFullScreenConfirmation';

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn().mockReturnValue({
    forceBottomSheet: false,
  }),
}));

describe('useFullScreenConfirmation', () => {
  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({ forceBottomSheet: false });
  });

  it('returns true for staking confirmation', async () => {
    const { result } = renderHookWithProvider(useFullScreenConfirmation, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current.isFullScreenConfirmation).toBe(true);
  });

  it('returns false for personal sign request', async () => {
    const { result } = renderHookWithProvider(useFullScreenConfirmation, {
      state: personalSignatureConfirmationState,
    });

    expect(result.current.isFullScreenConfirmation).toBe(false);
  });

  it('returns false when forceBottomSheet is true', async () => {
    (useParams as jest.Mock).mockReturnValue({ forceBottomSheet: true });

    const { result } = renderHookWithProvider(useFullScreenConfirmation, {
      state: stakingDepositConfirmationState,
    });

    expect(result.current.isFullScreenConfirmation).toBe(false);
  });

  describe('transfer confirmations', () => {
    it('returns true if transaction origin is MMM', async () => {
      const { result } = renderHookWithProvider(useFullScreenConfirmation, {
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

      expect(result.current.isFullScreenConfirmation).toBe(true);
    });

    it('returns false if transaction origin is not MMM', async () => {
      const { result } = renderHookWithProvider(useFullScreenConfirmation, {
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

      expect(result.current.isFullScreenConfirmation).toBe(false);
    });
  });
});
