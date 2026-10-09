import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import AccountListBalanceProviders from './AccountListBalanceProviders';
import { useABTest } from '../../hooks/useABTest';
import { useAccountListNonTokenBalance } from './useNonTokenBalance';

jest.mock('../../hooks/useABTest', () => ({
  useABTest: jest.fn(),
}));

jest.mock('./useNonTokenBalance', () => ({
  useAccountListNonTokenBalance: jest.fn(),
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
const mockUseAccountListNonTokenBalance = jest.mocked(
  useAccountListNonTokenBalance,
);

describe('AccountListBalanceProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAccountListNonTokenBalance.mockReturnValue(() => 123);
  });

  it('does not provide account-list balance aggregation outside the treatment', () => {
    mockUseABTest.mockReturnValue({
      variant: { showBalanceBreakdown: false },
      variantName: 'control',
      isActive: false,
    });

    const { getByText } = render(
      <AccountListBalanceProviders>
        {(getNonTokenBalance) => (
          <Text>
            {getNonTokenBalance ? getNonTokenBalance('group') : 'disabled'}
          </Text>
        )}
      </AccountListBalanceProviders>,
    );

    expect(getByText('disabled')).toBeOnTheScreen();
    expect(mockUseAccountListNonTokenBalance).not.toHaveBeenCalled();
  });

  it('provides account-list balance aggregation for the active treatment', () => {
    mockUseABTest.mockReturnValue({
      variant: { showBalanceBreakdown: true },
      variantName: 'treatment',
      isActive: true,
    });

    const { getByText } = render(
      <AccountListBalanceProviders>
        {(getNonTokenBalance) => <Text>{getNonTokenBalance?.('group')}</Text>}
      </AccountListBalanceProviders>,
    );

    expect(getByText('123')).toBeOnTheScreen();
    expect(mockUseAccountListNonTokenBalance).toHaveBeenCalledTimes(1);
  });
});
