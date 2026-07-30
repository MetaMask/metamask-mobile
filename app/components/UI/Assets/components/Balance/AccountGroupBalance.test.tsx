import React from 'react';

import AccountGroupBalance from './AccountGroupBalance';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useAccountGroupBalanceFetchState } from './useAccountGroupBalanceFetchState';

jest.mock('../../../BalanceEmptyState', () => {
  const { View: V } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) => <V testID={testID} />;
});

jest.mock('../../../WalletHomeOnboardingSteps', () => {
  const { View: V } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) => <V testID={testID} />;
});

jest.mock('../../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({ goToBuy: jest.fn() }),
}));

jest.mock('../../../../Views/Wallet/hooks/useBalanceRefresh', () => ({
  useBalanceRefresh: jest.fn(() => ({ refreshBalance: jest.fn() })),
}));

jest.mock('./useAccountGroupBalanceFetchState', () => ({
  useAccountGroupBalanceFetchState: jest.fn(() => false),
}));

jest.mock('./useWalletHomeOnboardingBalanceRefreshEffect', () => ({
  useWalletHomeOnboardingBalanceRefreshEffect: jest.fn(),
}));

jest.mock('../../../../../selectors/assets/balances', () => ({
  // Factory: selectBalanceBySelectedAccountGroup(popularChainIds?) -> (state) => value
  selectBalanceBySelectedAccountGroup: jest.fn(() => () => null),
  // Factory: selectBalanceChangeBySelectedAccountGroup(period, popularChainIds?) -> (state) => value
  selectBalanceChangeBySelectedAccountGroup: jest.fn(() => () => null),
  // This selector is used to display the BalanceEmptyState
  selectAccountGroupBalanceForEmptyState: jest.fn(() => null),
}));

// Mock onboarding selectors (BalanceEmptyState and AccountGroupBalance use these)
jest.mock('../../../../../selectors/onboarding', () => ({
  selectShouldShowWalletHomeOnboardingSteps: jest.fn(() => false),
  selectWalletHomeOnboardingStepsEligible: jest.fn(() => false),
  selectWalletHomeOnboardingSkipInitialBalanceWait: jest.fn(() => false),
  selectWalletHomeOnboardingSteps: jest.fn(() => ({
    suppressedReason: null,
    stepIndex: 0,
  })),
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
jest.mock('../../../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({ record: jest.fn() })),
  }),
}));

// AccountGroupBalance uses `popularNetworks` from useNetworkEnablement (arrays, not controller methods)
jest.mock(
  '../../../../hooks/useNetworkEnablement/useNetworkEnablement',
  () => ({
    useNetworkEnablement: () => ({
      popularNetworks: [],
      popularEvmNetworks: [],
      popularMultichainNetworks: [],
    }),
  }),
);

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
      () => () => null,
    );
    (selectAccountGroupBalanceForEmptyState as jest.Mock).mockImplementation(
      () => null,
    );
    (selectBalanceChangeBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => () => null,
    );
    jest.mocked(useAccountGroupBalanceFetchState).mockReturnValue(false);
  });

  it('renders without crashing when balance is not ready', () => {
    const { getByTestId } = renderWithProvider(<AccountGroupBalance />, {
      state: testState,
    });

    // Component should render the balance container even when loading
    expect(getByTestId('balance-container')).toBeOnTheScreen();
  });

  it('renders formatted balance when balance data is fetched', () => {
    const { selectBalanceBySelectedAccountGroup } = jest.requireMock(
      '../../../../../selectors/assets/balances',
    );
    jest.mocked(useAccountGroupBalanceFetchState).mockReturnValue(true);
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => () => ({
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
    expect(el).toBeOnTheScreen();
  });

  it('renders empty state when fetched account group balance is zero', () => {
    const {
      selectAccountGroupBalanceForEmptyState,
      selectBalanceBySelectedAccountGroup,
    } = jest.requireMock('../../../../../selectors/assets/balances');
    jest.mocked(useAccountGroupBalanceFetchState).mockReturnValue(true);

    // Mock the regular balance selector to return zero balance data
    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => () => ({
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

    const { getByTestId } = renderWithProvider(<AccountGroupBalance />, {
      state: testState,
    });

    const el = getByTestId(
      WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER,
    );
    expect(el).toBeOnTheScreen();
  });
});
