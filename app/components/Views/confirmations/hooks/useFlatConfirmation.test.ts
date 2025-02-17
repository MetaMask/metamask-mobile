import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import { useFlatConfirmation } from './useFlatConfirmation';

describe('useFlatConfirmation', () => {
  // TODO: Add unit test for once we have any existing flat confirmations

  it('returns false for personal sign request', async () => {
    const { result } = renderHookWithProvider(useFlatConfirmation, {
      state: personalSignatureConfirmationState,
    });

    expect(result.current.isFlatConfirmation).toBe(false);
  });
});
