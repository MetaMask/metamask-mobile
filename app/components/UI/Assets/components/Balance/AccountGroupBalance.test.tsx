import React from 'react';
import AccountGroupBalance from './AccountGroupBalance';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import renderWithProvider, {
  renderScreen,
} from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('../../../../../selectors/assets/balances', () => ({
  // This selector is used directly with useSelector, so it must accept (state) and return a value
  selectBalanceBySelectedAccountGroup: jest.fn(() => null),
  // This one is a factory: selectBalanceChangeBySelectedAccountGroup(period) -> (state) => value
  selectBalanceChangeBySelectedAccountGroup: jest.fn(() => () => null),
}));

jest.mock('../../../../../selectors/featureFlagController/homepage', () => ({
  selectHomepageRedesignV1Enabled: jest.fn(() => false),
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

    const { getByTestId, queryByTestId } = renderWithProvider(
      <AccountGroupBalance />,
      {
        state: testState,
      },
    );

    // Should render balance text, not empty state
    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeDefined();
    expect(queryByTestId('account-group-balance-empty-state')).toBeNull();
  });

  it('renders balance empty state when balance is zero and feature flag is enabled', () => {
    const { selectBalanceBySelectedAccountGroup } = jest.requireMock(
      '../../../../../selectors/assets/balances',
    );
    const { selectHomepageRedesignV1Enabled } = jest.requireMock(
      '../../../../../selectors/featureFlagController/homepage',
    );

    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0, // Zero balance
        userCurrency: 'usd',
      }),
    );

    // Enable the feature flag for this test
    (selectHomepageRedesignV1Enabled as jest.Mock).mockReturnValue(true);

    const { getByTestId, queryByTestId } = renderScreen(
      () => <AccountGroupBalance />,
      { name: 'AccountGroupBalance' },
      { state: testState },
    );

    // Should render BalanceEmptyState instead of balance text
    expect(getByTestId('account-group-balance-empty-state')).toBeDefined();
    expect(queryByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeNull();
  });

  it('does not render balance empty state when balance is zero but feature flag is disabled', () => {
    const { selectBalanceBySelectedAccountGroup } = jest.requireMock(
      '../../../../../selectors/assets/balances',
    );
    const { selectHomepageRedesignV1Enabled } = jest.requireMock(
      '../../../../../selectors/featureFlagController/homepage',
    );

    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0, // Zero balance
        userCurrency: 'usd',
      }),
    );

    // Ensure the feature flag is disabled for this test
    (selectHomepageRedesignV1Enabled as jest.Mock).mockReturnValue(false);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <AccountGroupBalance />,
      { state: testState },
    );

    // Should render balance text, not empty state
    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeDefined();
    expect(queryByTestId('account-group-balance-empty-state')).toBeNull();
  });
});
