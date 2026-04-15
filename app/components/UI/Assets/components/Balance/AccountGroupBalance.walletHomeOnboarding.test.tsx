import React from 'react';
import { act } from '@testing-library/react-native';
import AccountGroupBalance from './AccountGroupBalance';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { initialOnboardingState } from '../../../../../reducers/onboarding';
import {
  SUPPRESS_WALLET_HOME_ONBOARDING_STEPS,
  setWalletHomeOnboardingStepsStep,
} from '../../../../../actions/onboarding';

jest.mock('../../../BalanceEmptyState', () => {
  const { View: V } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) => <V testID={testID} />;
});

jest.mock('../../../WalletHomeOnboardingSteps', () => {
  const { View: V } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) => <V testID={testID} />;
});

jest.mock('../../../../../selectors/assets/balances', () => ({
  selectBalanceBySelectedAccountGroup: jest.fn(() => () => null),
  selectBalanceChangeBySelectedAccountGroup: jest.fn(() => () => null),
  selectAccountGroupBalanceForEmptyState: jest.fn(() => null),
}));

jest.mock('../../../../../selectors/featureFlagController/homepage', () => ({
  selectHomepageSectionsV1Enabled: jest.fn(() => true),
  selectWalletHomeOnboardingStepsEnabled: jest.fn(() => true),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  selectEvmChainId: jest.fn(() => '0x1'),
  selectChainId: jest.fn(() => '0x1'),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('../../../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({ record: jest.fn() })),
  }),
}));

jest.mock(
  '../../../../hooks/useNetworkEnablement/useNetworkEnablement',
  () => ({
    useNetworkEnablement: () => ({
      listPopularNetworks: () => [],
    }),
  }),
);

const onboardingEligibleEmptyBalance = {
  ...initialOnboardingState,
  completedOnboarding: true,
  walletHomeOnboardingStepsEligible: true,
  walletHomeOnboardingSteps: {
    suppressedReason: null,
    stepIndex: 0,
  },
};

const testState = {
  onboarding: onboardingEligibleEmptyBalance,
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

describe('AccountGroupBalance / wallet home onboarding account_funded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('does not suppress when stale positive aggregate corrects to zero before account_funded can apply', () => {
    const {
      selectBalanceBySelectedAccountGroup,
      selectAccountGroupBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');

    let groupBalanceSnapshot = {
      walletId: 'wallet-1',
      groupId: 'wallet-1/group-1',
      totalBalanceInUserCurrency: 42,
      userCurrency: 'usd',
    };
    let emptyAggSnapshot = {
      totalBalanceInUserCurrency: 42,
      userCurrency: 'usd',
    };

    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => () => groupBalanceSnapshot,
    );
    (selectAccountGroupBalanceForEmptyState as jest.Mock).mockImplementation(
      () => emptyAggSnapshot,
    );

    const { store } = renderWithProvider(<AccountGroupBalance />, {
      state: testState,
    });
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    groupBalanceSnapshot = {
      walletId: 'wallet-1',
      groupId: 'wallet-1/group-1',
      totalBalanceInUserCurrency: 0,
      userCurrency: 'usd',
    };
    emptyAggSnapshot = {
      totalBalanceInUserCurrency: 0,
      userCurrency: 'usd',
    };
    act(() => {
      store.dispatch(setWalletHomeOnboardingStepsStep(0));
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    const suppressCalls = dispatchSpy.mock.calls.filter(
      (call) => call[0]?.type === SUPPRESS_WALLET_HOME_ONBOARDING_STEPS,
    );
    expect(suppressCalls).toHaveLength(0);
  });

  it('dispatches account_funded after balance settled when aggregate is positive', () => {
    const {
      selectBalanceBySelectedAccountGroup,
      selectAccountGroupBalanceForEmptyState,
    } = jest.requireMock('../../../../../selectors/assets/balances');

    let groupBalanceSnapshot = {
      walletId: 'wallet-1',
      groupId: 'wallet-1/group-1',
      totalBalanceInUserCurrency: 0,
      userCurrency: 'usd',
    };
    let emptyAggSnapshot = {
      totalBalanceInUserCurrency: 0,
      userCurrency: 'usd',
    };

    (selectBalanceBySelectedAccountGroup as jest.Mock).mockImplementation(
      () => () => groupBalanceSnapshot,
    );
    (selectAccountGroupBalanceForEmptyState as jest.Mock).mockImplementation(
      () => emptyAggSnapshot,
    );

    const { store } = renderWithProvider(<AccountGroupBalance />, {
      state: testState,
    });
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    groupBalanceSnapshot = {
      walletId: 'wallet-1',
      groupId: 'wallet-1/group-1',
      totalBalanceInUserCurrency: 200,
      userCurrency: 'usd',
    };
    emptyAggSnapshot = {
      totalBalanceInUserCurrency: 200,
      userCurrency: 'usd',
    };
    act(() => {
      store.dispatch(setWalletHomeOnboardingStepsStep(0));
    });

    const suppressCalls = dispatchSpy.mock.calls.filter(
      (call) => call[0]?.type === SUPPRESS_WALLET_HOME_ONBOARDING_STEPS,
    );
    expect(suppressCalls).toHaveLength(1);
    expect(suppressCalls[0][0]).toMatchObject({
      type: SUPPRESS_WALLET_HOME_ONBOARDING_STEPS,
      reason: 'account_funded',
    });
  });
});
