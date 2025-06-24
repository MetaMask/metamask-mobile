import { Hex } from '@metamask/utils';
import { TransactionStatus } from '@metamask/transaction-controller';

import {
  getAppStateForConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';

import { useBatchAuthorizationRequests } from './useBatchAuthorizationRequests';

function runHook(from?: Hex) {
  const { result, rerender } = renderHookWithProvider(
    () =>
      useBatchAuthorizationRequests(
        from ?? '0x8a0bbcd42cf79e7cee834e7808eb2fef1cebdb87',
        '0xaa36a7',
      ),
    {
      state: getAppStateForConfirmation({
        ...upgradeOnlyAccountConfirmation,
        status: TransactionStatus.submitted,
      }),
    },
  );
  return { result: result.current, rerender };
}

describe('useBatchAuthorizationRequests', () => {
  it('returns true if there are pending confirmation for authorisation', () => {
    const { result } = runHook();
    expect(result.hasPendingRequests).toBe(true);
  });

  it('returns false if there are no pending confirmation for authorisation', () => {
    const { result } = runHook('0x0');
    expect(result.hasPendingRequests).toBe(false);
  });
});
