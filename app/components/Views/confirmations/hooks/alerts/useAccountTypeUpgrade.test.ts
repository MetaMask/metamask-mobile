import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { useAccountTypeUpgrade } from './useAccountTypeUpgrade';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    TokenListController: {
      fetchTokenList: jest.fn(),
    },
  },
}));

describe('useAccountTypeUpgrade', () => {
  it('returns alert for upgrade+batched account request', () => {
    const { result } = renderHookWithProvider(() => useAccountTypeUpgrade(), {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    const alert = result.current[0];
    delete alert.content;

    expect(alert).toEqual({
      field: 'accountTypeUpgrade',
      key: 'accountTypeUpgrade',
      severity: 'info',
      title: 'Updating your account',
    });
  });
});
