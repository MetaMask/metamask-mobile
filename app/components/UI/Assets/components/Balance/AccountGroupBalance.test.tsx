import React from 'react';
import AccountGroupBalance from './AccountGroupBalance';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('../../../../../selectors/assets/balances', () => ({
  // This selector is used directly with useSelector, so it must accept (state) and return a value
  selectBalanceBySelectedAccountGroup: jest.fn(() => null),
  // This one is a factory: selectBalanceChangeBySelectedAccountGroup(period) -> (state) => value
  selectBalanceChangeBySelectedAccountGroup: jest.fn(() => () => null),
}));

const testState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        privacyMode: false,
      },
    },
  },
};

describe('AccountGroupBalance', () => {
  it('renders loader when balance is not ready', () => {
    const { queryByTestId } = renderWithProvider(<AccountGroupBalance />, {
      state: testState,
    });

    expect(queryByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeNull();
  });

  it('renders formatted balance when selector returns data', () => {
    const { selectBalanceBySelectedAccountGroup } = jest.requireMock(
      '../../../../../selectors/assets/balances',
    );
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 123.45,
        userCurrency: 'usd',
      }),
    );

    const { getByTestId } = renderWithProvider(<AccountGroupBalance />, {
      state: testState,
    });

    const el = getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT);
    expect(el).toBeTruthy();
  });
});
