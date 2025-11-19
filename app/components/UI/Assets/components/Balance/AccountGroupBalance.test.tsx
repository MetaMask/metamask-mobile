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
  // This selector is used to display the BalanceEmptyState
  selectAccountGroupBalanceForEmptyState: jest.fn(() => null),
}));

// Mock homepage redesign feature flag for BalanceEmptyState
jest.mock('../../../../../selectors/featureFlagController/homepage', () => ({
  selectHomepageRedesignV1Enabled: jest.fn(() => true),
}));

// This selector is used to determine if the current network is a testnet for BalanceEmptyState display logic
jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  selectEvmChainId: jest.fn(() => '0x1'), // Ethereum mainnet (not a testnet)
  selectChainId: jest.fn(() => '0x1'), // BalanceEmptyState also needs this
}));

// Mock navigation hooks used by BalanceEmptyState
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
}));

// Mock metrics hook used by BalanceEmptyState
jest.mock('../../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({ record: jest.fn() })),
  }),
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

  it('renders empty state when account group balance is zero', () => {
    const {
      selectAccountGroupBalanceForEmptyState,
      selectBalanceBySelectedAccountGroup,
    } = jest.requireMock('../../../../../selectors/assets/balances');

    // Mock the regular balance selector to return data (prevents skeleton loader)
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        totalBalanceInUserCurrency: 100, // Some non-zero amount for current network
        userCurrency: 'usd',
      }),
    );

    // Mock the empty state selector to return zero balance across all mainnet networks
    (selectAccountGroupBalanceForEmptyState as jest.Mock).mockImplementation(
      () => ({
        totalBalanceInUserCurrency: 0, // Zero across all mainnet networks
        userCurrency: 'usd',
      }),
    );

    const { getByTestId } = renderWithProvider(<AccountGroupBalance />, {
      state: testState,
    });

    const el = getByTestId(
      WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER,
    );
    expect(el).toBeOnTheScreen();
  });
});
