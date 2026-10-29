import React, { useContext } from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import AccountListBalanceProviders from './AccountListBalanceProviders';
import { AccountListBalanceContext } from './AccountListBalanceContext';
import { useABTest } from '../../hooks/useABTest';
import { useAccountListBalance } from './useNonTokenBalance';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => true),
}));

jest.mock('../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

jest.mock('./useNonTokenBalance', () => ({
  useAccountListBalance: jest.fn(),
}));

jest.mock('../UI/Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

const mockUseABTest = jest.mocked(useABTest);
const mockUseAccountListBalance = jest.mocked(useAccountListBalance);

const BalanceConsumer = () => {
  const getAccountListBalance = useContext(AccountListBalanceContext);
  const balance = getAccountListBalance?.('group');

  return <Text>{balance ?? 'disabled'}</Text>;
};

describe('AccountListBalanceProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountListBalance.mockReturnValue(() => 123);
  });

  it('does not provide account-list balance aggregation without an active assignment', () => {
    mockUseABTest.mockReturnValue({
      variant: { showBalanceBreakdown: false },
      variantName: 'control',
      isActive: false,
    });

    const { getByText } = render(
      <AccountListBalanceProviders>
        <BalanceConsumer />
      </AccountListBalanceProviders>,
    );

    expect(getByText('disabled')).toBeOnTheScreen();
    expect(mockUseAccountListBalance).not.toHaveBeenCalled();
  });

  it('provides account-list balance aggregation for the active treatment', () => {
    mockUseABTest.mockReturnValue({
      variant: { showBalanceBreakdown: true },
      variantName: 'treatment',
      isActive: true,
    });

    const { getByText } = render(
      <AccountListBalanceProviders>
        <BalanceConsumer />
      </AccountListBalanceProviders>,
    );

    expect(getByText('123')).toBeOnTheScreen();
    expect(mockUseAccountListBalance).toHaveBeenCalledTimes(1);
  });

  it('updates mounted consumers when the aggregate balance changes', () => {
    mockUseABTest.mockReturnValue({
      variant: { showBalanceBreakdown: true },
      variantName: 'treatment',
      isActive: true,
    });
    const view = render(
      <AccountListBalanceProviders>
        <BalanceConsumer />
      </AccountListBalanceProviders>,
    );

    mockUseAccountListBalance.mockReturnValue(() => 456);
    view.rerender(
      <AccountListBalanceProviders>
        <BalanceConsumer />
      </AccountListBalanceProviders>,
    );

    expect(view.getByText('456')).toBeOnTheScreen();
  });
});
