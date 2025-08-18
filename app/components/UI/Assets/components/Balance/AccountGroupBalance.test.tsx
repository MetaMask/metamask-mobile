import React from 'react';
import AccountGroupBalance from './AccountGroupBalance';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

jest.mock('../../../../../selectors/assets/balances', () => ({
  selectBalanceBySelectedAccountGroup: jest.fn(() => () => null),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(() => () => false),
}));

describe('AccountGroupBalance', () => {
  it('renders loader when balance is not ready', () => {
    const { queryByTestId } = renderWithProvider(<AccountGroupBalance />, {
      state: {},
    });

    expect(queryByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeNull();
  });

  it('renders formatted balance when selector returns data', () => {
    const { selectBalanceBySelectedAccountGroup } = jest.requireMock(
      '../../../../../selectors/assets/balances',
    );
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 123.45,
        userCurrency: 'usd',
      }),
    );

    const { getByTestId } = renderWithProvider(<AccountGroupBalance />, {
      state: {},
    });

    const el = getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT);
    expect(el).toBeTruthy();
  });
});
