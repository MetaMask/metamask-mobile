import {
  ManageAccountsViewedSource,
  buildManageAccountsViewedProperties,
} from '.';

describe('accounts event properties', () => {
  it('maps the account tree totals onto the schema property names', () => {
    expect(
      buildManageAccountsViewedProperties(
        ManageAccountsViewedSource.AccountList,
        { totalAccounts: 5, totalWallets: 3, hiddenCount: 2 },
      ),
    ).toEqual({
      source: 'account_list',
      total_accounts: 5,
      total_wallets: 3,
      hidden_count: 2,
    });
  });

  it('keeps zero counts rather than dropping them, since all four are required', () => {
    expect(
      buildManageAccountsViewedProperties(
        ManageAccountsViewedSource.AccountMenu,
        { totalAccounts: 0, totalWallets: 0, hiddenCount: 0 },
      ),
    ).toEqual({
      source: 'account_menu',
      total_accounts: 0,
      total_wallets: 0,
      hidden_count: 0,
    });
  });
});
