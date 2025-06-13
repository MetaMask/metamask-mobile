import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { useAccountTypeUpgrade } from './useAccountTypeUpgrade';

describe('useAccountTypeUpgrade', () => {
  it('returns alert for upgrade+batched account request', () => {
    const { result } = renderHookWithProvider(() => useAccountTypeUpgrade(), {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    const currentAlert = result.current[0];
    delete currentAlert.content;

    expect(currentAlert).toEqual({
      field: 'accountTypeUpgrade',
      key: 'accountTypeUpgrade',
      severity: 'info',
      title: 'Updating your account',
    });
  });
});
