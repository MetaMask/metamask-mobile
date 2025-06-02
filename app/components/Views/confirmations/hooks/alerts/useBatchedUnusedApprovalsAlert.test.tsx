import {
  batchApprovalConfirmation,
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useBatchedUnusedApprovalsAlert } from './useBatchedUnusedApprovalsAlert';

function runHook() {
  const response = renderHookWithProvider(useBatchedUnusedApprovalsAlert, {
    state: getAppStateForConfirmation(batchApprovalConfirmation),
  });

  return response.result.current;
}

describe('useBatchedUnusedApprovalsAlert', () => {
  it('returns no alerts when no confirmation exists', () => {
    const response = renderHookWithProvider(useBatchedUnusedApprovalsAlert, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(response.result.current).toEqual([]);
  });

  it('returns no alerts if confirmation does not have nested transactions', () => {
    const response = renderHookWithProvider(useBatchedUnusedApprovalsAlert, {
      state: getAppStateForConfirmation(upgradeOnlyAccountConfirmation),
    });
    expect(response.result.current).toEqual([]);
  });

  it('returns no alerts if when no approve balance changes exist', () => {
    const response = renderHookWithProvider(useBatchedUnusedApprovalsAlert, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(response.result.current).toEqual([]);
  });

  it('returns no alerts if when approvals are used', () => {
    const response = renderHookWithProvider(useBatchedUnusedApprovalsAlert, {
      state: getAppStateForConfirmation(batchApprovalConfirmation),
    });
    expect(response.result.current).toEqual([]);
  });
});
