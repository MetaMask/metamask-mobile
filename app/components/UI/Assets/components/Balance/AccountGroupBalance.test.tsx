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
  // New selector for wallet-level balance (for empty state logic)
  selectWalletBalanceForEmptyState: jest.fn(() => null),
  // This one is a factory: selectBalanceChangeBySelectedAccountGroup(period) -> (state) => value
  selectBalanceChangeBySelectedAccountGroup: jest.fn(() => () => null),
}));

jest.mock('../../../../../selectors/featureFlagController/homepage', () => ({
  selectHomepageRedesignV1Enabled: jest.fn(() => false),
}));

jest.mock('../../../../../selectors/networkEnablementController', () => ({
  selectEnabledNetworksByNamespace: jest.fn(() => ({
    eip155: { '0x1': true },
  })),
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupId: jest.fn(() => 'wallet-1/group-1'),
  }),
);

jest.mock('../../../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(() => '0x1'), // Default to Ethereum mainnet
}));

jest.mock('../../../../../constants/network', () => ({
  TEST_NETWORK_IDS: [
    '0x5', // Goerli
    '0xaa36a7', // Sepolia
    '0xe704', // Linea Goerli
    '0xe705', // Linea Sepolia
  ],
  NETWORKS_CHAIN_ID: {
    MAINNET: '0x1',
    GOERLI: '0x5',
    SEPOLIA: '0xaa36a7',
    LINEA_GOERLI: '0xe704',
    LINEA_SEPOLIA: '0xe705',
    BSC: '0x38',
    BASE: '0x2105',
    OPTIMISM: '0xa',
  },
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
    const {
      selectBalanceBySelectedAccountGroup,
      selectWalletBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 123.45,
        userCurrency: 'usd',
      }),
    );
    (selectWalletBalanceForEmptyState as jest.Mock).mockImplementation(() => ({
      walletId: 'wallet-1',
      totalBalanceInUserCurrency: 123.45,
      userCurrency: 'usd',
    }));

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

  it('renders balance empty state when WALLET balance is zero and feature flag is enabled', () => {
    const {
      selectBalanceBySelectedAccountGroup,
      selectWalletBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');
    const { selectHomepageRedesignV1Enabled } = jest.requireMock(
      '../../../../../selectors/featureFlagController/homepage',
    );

    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0, // Group balance is zero
        userCurrency: 'usd',
      }),
    );

    (selectWalletBalanceForEmptyState as jest.Mock).mockImplementation(() => ({
      walletId: 'wallet-1',
      totalBalanceInUserCurrency: 0, // Wallet balance is also zero - this triggers empty state
      userCurrency: 'usd',
    }));

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
    const {
      selectBalanceBySelectedAccountGroup,
      selectWalletBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');
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

    (selectWalletBalanceForEmptyState as jest.Mock).mockImplementation(() => ({
      walletId: 'wallet-1',
      totalBalanceInUserCurrency: 0, // Zero wallet balance
      userCurrency: 'usd',
    }));

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

  // NEW TEST CASES: Testing the specific scenarios mentioned in requirements
  it('does NOT render empty state when current network has $0 but wallet has funds on other networks', () => {
    // Scenario: User viewing zkSync Era (with $0) but has funds on Ethereum → No empty state
    const {
      selectBalanceBySelectedAccountGroup,
      selectWalletBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');
    const { selectHomepageRedesignV1Enabled } = jest.requireMock(
      '../../../../../selectors/featureFlagController/homepage',
    );

    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0, // Current network (zkSync Era) has $0
        userCurrency: 'usd',
      }),
    );

    (selectWalletBalanceForEmptyState as jest.Mock).mockImplementation(() => ({
      walletId: 'wallet-1',
      totalBalanceInUserCurrency: 100, // But wallet has $100 on other enabled networks (Ethereum)
      userCurrency: 'usd',
    }));

    (selectHomepageRedesignV1Enabled as jest.Mock).mockReturnValue(true);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <AccountGroupBalance />,
      { state: testState },
    );

    // Should render balance text (showing $0 for current network), NOT empty state
    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeDefined();
    expect(queryByTestId('account-group-balance-empty-state')).toBeNull();
  });

  it('renders empty state when user has $0 across ALL enabled networks', () => {
    // Scenario: User has $0 across ALL networks → See empty state everywhere
    const {
      selectBalanceBySelectedAccountGroup,
      selectWalletBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');
    const { selectHomepageRedesignV1Enabled } = jest.requireMock(
      '../../../../../selectors/featureFlagController/homepage',
    );

    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0, // Current network has $0
        userCurrency: 'usd',
      }),
    );

    (selectWalletBalanceForEmptyState as jest.Mock).mockImplementation(() => ({
      walletId: 'wallet-1',
      totalBalanceInUserCurrency: 0, // Wallet has $0 across ALL enabled networks
      userCurrency: 'usd',
    }));

    (selectHomepageRedesignV1Enabled as jest.Mock).mockReturnValue(true);

    const { getByTestId, queryByTestId } = renderScreen(
      () => <AccountGroupBalance />,
      { name: 'AccountGroupBalance' },
      { state: testState },
    );

    // Should render empty state
    expect(getByTestId('account-group-balance-empty-state')).toBeDefined();
    expect(queryByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeNull();
  });

  it('never renders empty state when user has funds across multiple networks', () => {
    // Scenario: User has $11 across multiple networks → Never see empty state anywhere
    const {
      selectBalanceBySelectedAccountGroup,
      selectWalletBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');
    const { selectHomepageRedesignV1Enabled } = jest.requireMock(
      '../../../../../selectors/featureFlagController/homepage',
    );

    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 5, // Current network has $5
        userCurrency: 'usd',
      }),
    );

    (selectWalletBalanceForEmptyState as jest.Mock).mockImplementation(() => ({
      walletId: 'wallet-1',
      totalBalanceInUserCurrency: 11, // Wallet has $11 total across all enabled networks
      userCurrency: 'usd',
    }));

    (selectHomepageRedesignV1Enabled as jest.Mock).mockReturnValue(true);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <AccountGroupBalance />,
      { state: testState },
    );

    // Should render balance text, never empty state
    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeDefined();
    expect(queryByTestId('account-group-balance-empty-state')).toBeNull();
  });

  // NEW TESTNET BEHAVIOR TESTS
  it('does NOT render empty state on testnets even with zero balance across all networks', () => {
    const {
      selectBalanceBySelectedAccountGroup,
      selectWalletBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');
    const { selectHomepageRedesignV1Enabled } = jest.requireMock(
      '../../../../../selectors/featureFlagController/homepage',
    );
    const { selectEvmChainId } = jest.requireMock(
      '../../../../../selectors/networkController',
    );

    // Set up Sepolia testnet
    (selectEvmChainId as jest.Mock).mockReturnValue('0xaa36a7'); // Sepolia

    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0, // Zero balance on current network
        userCurrency: 'usd',
      }),
    );

    (selectWalletBalanceForEmptyState as jest.Mock).mockImplementation(() => ({
      walletId: 'wallet-1',
      totalBalanceInUserCurrency: 0, // Zero balance across all mainnet networks
      userCurrency: 'usd',
    }));

    // Enable the feature flag
    (selectHomepageRedesignV1Enabled as jest.Mock).mockReturnValue(true);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <AccountGroupBalance />,
      { state: testState },
    );

    // Should render balance text showing $0.00, NOT empty state (because we're on a testnet)
    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeDefined();
    expect(queryByTestId('account-group-balance-empty-state')).toBeNull();
  });

  it('renders balance text on testnets with funds', () => {
    const {
      selectBalanceBySelectedAccountGroup,
      selectWalletBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');
    const { selectHomepageRedesignV1Enabled } = jest.requireMock(
      '../../../../../selectors/featureFlagController/homepage',
    );
    const { selectEvmChainId } = jest.requireMock(
      '../../../../../selectors/networkController',
    );

    // Set up Goerli testnet
    (selectEvmChainId as jest.Mock).mockReturnValue('0x5'); // Goerli

    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 5.0, // Has funds on testnet
        userCurrency: 'usd',
      }),
    );

    (selectWalletBalanceForEmptyState as jest.Mock).mockImplementation(() => ({
      walletId: 'wallet-1',
      totalBalanceInUserCurrency: 10.0, // Has funds across mainnet networks
      userCurrency: 'usd',
    }));

    // Enable the feature flag
    (selectHomepageRedesignV1Enabled as jest.Mock).mockReturnValue(true);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <AccountGroupBalance />,
      { state: testState },
    );

    // Should render balance text, never empty state on testnets
    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeDefined();
    expect(queryByTestId('account-group-balance-empty-state')).toBeNull();
  });

  it('still renders empty state on mainnet with zero balance (existing behavior unchanged)', () => {
    const {
      selectBalanceBySelectedAccountGroup,
      selectWalletBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');
    const { selectHomepageRedesignV1Enabled } = jest.requireMock(
      '../../../../../selectors/featureFlagController/homepage',
    );
    const { selectEvmChainId } = jest.requireMock(
      '../../../../../selectors/networkController',
    );

    // Set up Ethereum mainnet
    (selectEvmChainId as jest.Mock).mockReturnValue('0x1'); // Ethereum mainnet

    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => ({
        walletId: 'wallet-1',
        groupId: 'wallet-1/group-1',
        totalBalanceInUserCurrency: 0, // Zero balance on current network
        userCurrency: 'usd',
      }),
    );

    (selectWalletBalanceForEmptyState as jest.Mock).mockImplementation(() => ({
      walletId: 'wallet-1',
      totalBalanceInUserCurrency: 0, // Zero balance across all mainnet networks
      userCurrency: 'usd',
    }));

    // Enable the feature flag
    (selectHomepageRedesignV1Enabled as jest.Mock).mockReturnValue(true);

    const { getByTestId, queryByTestId } = renderScreen(
      () => <AccountGroupBalance />,
      { name: 'AccountGroupBalance' },
      { state: testState },
    );

    // Should render empty state on mainnet with zero balance
    expect(getByTestId('account-group-balance-empty-state')).toBeDefined();
    expect(queryByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeNull();
  });
});
