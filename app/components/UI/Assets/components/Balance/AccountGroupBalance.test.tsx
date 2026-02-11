import React from 'react';
import { act } from '@testing-library/react-native';
import AccountGroupBalance from './AccountGroupBalance';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
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
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations to default (null) before each test
    const {
      selectBalanceBySelectedAccountGroup,
      selectAccountGroupBalanceForEmptyState,
      selectBalanceChangeBySelectedAccountGroup,
    } = jest.requireMock('../../../../../selectors/assets/balances');
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => null,
    );
    (selectAccountGroupBalanceForEmptyState as jest.Mock).mockImplementation(
      () => null,
    );
    (selectBalanceChangeBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => () => null,
    );
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders without crashing when balance is not ready', () => {
    const { getByTestId } = renderWithProvider(<AccountGroupBalance />, {
      state: testState,
    });

    // Component should render the balance container even when loading
    expect(getByTestId('balance-container')).toBeOnTheScreen();
  });

  it('renders formatted balance when selector returns data and timeout expires', () => {
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

    // After timeout expires (3 seconds), balance should display
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    const el = getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT);
    expect(el).toBeOnTheScreen();
  });

  it('renders empty state when account group balance is zero after timeout', () => {
    const {
      selectAccountGroupBalanceForEmptyState,
      selectBalanceBySelectedAccountGroup,
    } = jest.requireMock('../../../../../selectors/assets/balances');

    // Mock the regular balance selector to return zero balance data
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0, // Zero on current network
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

    const { getByTestId, queryByTestId } = renderWithProvider(
      <AccountGroupBalance />,
      {
        state: testState,
      },
    );

    // Initially shows loader because hasBalanceFetched is false
    expect(
      queryByTestId(WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER),
    ).toBeNull();

    // After timeout expires (3 seconds), empty state should display
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    const el = getByTestId(
      WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER,
    );
    expect(el).toBeOnTheScreen();
  });

  it('renders balance immediately when balance changes from 0 to non-zero before timeout', () => {
    const {
      selectBalanceBySelectedAccountGroup,
      selectAccountGroupBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');

    // Start with zero balance
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0,
        userCurrency: 'usd',
      }),
    );

    (selectAccountGroupBalanceForEmptyState as jest.Mock).mockImplementation(
      () => ({
        totalBalanceInUserCurrency: 0,
        userCurrency: 'usd',
      }),
    );

    const { getByTestId, rerender } = renderWithProvider(
      <AccountGroupBalance />,
      {
        state: testState,
      },
    );

    // Update mocks to return non-zero balance (simulating balance fetch completing)
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 123.45,
        userCurrency: 'usd',
      }),
    );

    (selectAccountGroupBalanceForEmptyState as jest.Mock).mockImplementation(
      () => ({
        totalBalanceInUserCurrency: 123.45,
        userCurrency: 'usd',
      }),
    );

    // Trigger re-render with new balance
    rerender(<AccountGroupBalance />);

    // Balance should display immediately without waiting for timeout
    const el = getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT);
    expect(el).toBeOnTheScreen();
  });

  it('renders balance after updating when initially zero', () => {
    const {
      selectBalanceBySelectedAccountGroup,
      selectAccountGroupBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');

    // Start with zero balance (simulates account with no funds or just switched)
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0,
        userCurrency: 'usd',
      }),
    );

    (selectAccountGroupBalanceForEmptyState as jest.Mock).mockImplementation(
      () => ({
        totalBalanceInUserCurrency: 0,
        userCurrency: 'usd',
      }),
    );

    const { getByTestId, rerender } = renderWithProvider(
      <AccountGroupBalance />,
      {
        state: testState,
      },
    );

    // Advance time less than timeout
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Update mocks to show balance has loaded with funds
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 150,
        userCurrency: 'usd',
      }),
    );

    (selectAccountGroupBalanceForEmptyState as jest.Mock).mockImplementation(
      () => ({
        totalBalanceInUserCurrency: 150,
        userCurrency: 'usd',
      }),
    );

    // Trigger re-render
    rerender(<AccountGroupBalance />);

    // Should show balance immediately after update (hasChanged condition)
    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeOnTheScreen();
  });
});
