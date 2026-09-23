import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';
import useSubscriptionPolling from '../components/hooks/useSubscriptionPolling';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('./useProSubscriptionEnabled');
jest.mock('../components/hooks/useSubscriptionPolling', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);
const mockUseSubscriptionPolling = jest.mocked(useSubscriptionPolling);

describe('useMoneyAccountPlusAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
      variantName: 'treatment',
      isActive: true,
    });
    mockUseSubscriptionPolling.mockReturnValue({
      isLoading: false,
    } as ReturnType<typeof useSubscriptionPolling>);
    mockUseSelector.mockReturnValue(false);
  });

  it('is disabled when the Pro subscription flag is off', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
      variantName: 'control',
      isActive: false,
    });
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => useMoneyAccountPlusAccess());

    expect(result.current).toBe(MoneyAccountPlusAccess.Disabled);
  });

  it('grants subscriber access even while the query is still loading', () => {
    mockUseSelector.mockReturnValue(true);
    mockUseSubscriptionPolling.mockReturnValue({
      isLoading: true,
    } as ReturnType<typeof useSubscriptionPolling>);

    const { result } = renderHook(() => useMoneyAccountPlusAccess());

    expect(result.current).toBe(MoneyAccountPlusAccess.Subscriber);
  });

  it('stays unknown while subscriptions are unresolved and empty', () => {
    mockUseSubscriptionPolling.mockReturnValue({
      isLoading: true,
    } as ReturnType<typeof useSubscriptionPolling>);

    const { result } = renderHook(() => useMoneyAccountPlusAccess());

    expect(result.current).toBe(MoneyAccountPlusAccess.Unknown);
  });

  it('treats a resolved non-subscriber as eligible', () => {
    const { result } = renderHook(() => useMoneyAccountPlusAccess());

    expect(result.current).toBe(MoneyAccountPlusAccess.Eligible);
  });
});
