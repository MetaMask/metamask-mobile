import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useAccountGroupBalanceFetchState } from '../../../../UI/Assets/components/Balance/useAccountGroupBalanceFetchState';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import { useTokensSlice } from './useTokensSlice';

const mockBalanceSelector = jest.fn();
const mockBalanceChangeSelector = jest.fn();
const mockEmptyStateSelector = jest.fn();

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../selectors/assets/balances', () => ({
  selectBalanceBySelectedAccountGroup: jest.fn(() => mockBalanceSelector),
  selectBalanceChangeBySelectedAccountGroup: jest.fn(
    () => mockBalanceChangeSelector,
  ),
  selectAccountGroupBalanceForEmptyState: mockEmptyStateSelector,
}));
jest.mock(
  '../../../../UI/Assets/components/Balance/useAccountGroupBalanceFetchState',
);
jest.mock('../../../../hooks/useNetworkEnablement/useNetworkEnablement');

const mockUseSelector = jest.mocked(useSelector);
const mockUseAccountGroupBalanceFetchState = jest.mocked(
  useAccountGroupBalanceFetchState,
);
const mockUseNetworkEnablement = jest.mocked(useNetworkEnablement);

describe('useTokensSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetworkEnablement.mockReturnValue({
      popularNetworks: ['eip155:1'],
    } as unknown as ReturnType<typeof useNetworkEnablement>);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockBalanceSelector) {
        return {
          totalBalanceInUserCurrency: 125,
          userCurrency: 'USD',
        };
      }
      if (selector === mockBalanceChangeSelector) {
        return {
          amountChangeInUserCurrency: 5,
          percentChange: 4,
          userCurrency: 'USD',
        };
      }
      if (selector === mockEmptyStateSelector) return 125;
      return undefined;
    });
    mockUseAccountGroupBalanceFetchState.mockReturnValue(true);
  });

  it('uses the account-group balance and normalized one-day change', () => {
    const { result } = renderHook(() => useTokensSlice());

    expect(result.current).toMatchObject({
      status: 'ready',
      valueFiat: 125,
      delta: { amount: 5, percent: 0.04 },
    });
  });

  it('stays loading until the account-group balance is fetched', () => {
    mockUseAccountGroupBalanceFetchState.mockReturnValue(false);

    const { result } = renderHook(() => useTokensSlice());

    expect(result.current.status).toBe('loading');
    expect(result.current.valueFiat).toBe(0);
    expect(result.current.delta).toBeUndefined();
  });
});
