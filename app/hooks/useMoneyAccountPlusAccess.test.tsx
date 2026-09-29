import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';
import useSubscriptions from '../components/hooks/useSubscriptions';
import {
  selectHasAnyMoneyAccountPlusEntitlement,
  selectIsMoneyAccountPlusSubscriber,
} from '../selectors/subscriptionController';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from './useMoneyAccountPlusAccess';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('./useProSubscriptionEnabled');
jest.mock('../components/hooks/useSubscriptions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);
const mockUseSubscriptions = jest.mocked(useSubscriptions);

const mockSubscriptionState = ({
  isSubscriber = false,
  hasEntitlement = false,
}: {
  isSubscriber?: boolean;
  hasEntitlement?: boolean;
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsMoneyAccountPlusSubscriber) {
      return isSubscriber;
    }
    if (selector === selectHasAnyMoneyAccountPlusEntitlement) {
      return hasEntitlement;
    }
    throw new Error('Unexpected selector');
  });
};

describe('useMoneyAccountPlusAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
      variantName: 'treatment',
      isActive: true,
    });
    mockUseSubscriptions.mockReturnValue({
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useSubscriptions>);
    mockSubscriptionState();
  });

  it('is disabled when the Pro subscription flag is off', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
      variantName: 'control',
      isActive: false,
    });
    mockSubscriptionState({ isSubscriber: true, hasEntitlement: true });

    const { result } = renderHook(() => useMoneyAccountPlusAccess());

    expect(result.current).toBe(MoneyAccountPlusAccess.Disabled);
    expect(mockUseSubscriptions).toHaveBeenCalledWith({ enabled: false });
  });

  it('keeps subscriber access when entitlements outlive an active status', () => {
    mockSubscriptionState({ isSubscriber: false, hasEntitlement: true });

    const { result } = renderHook(() => useMoneyAccountPlusAccess());

    expect(result.current).toBe(MoneyAccountPlusAccess.Subscriber);
  });

  it('grants subscriber access even while the query is still loading', () => {
    mockSubscriptionState({ isSubscriber: true });
    mockUseSubscriptions.mockReturnValue({
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useSubscriptions>);

    const { result } = renderHook(() => useMoneyAccountPlusAccess());

    expect(result.current).toBe(MoneyAccountPlusAccess.Subscriber);
  });

  it('stays unknown while subscriptions are unresolved and empty', () => {
    mockUseSubscriptions.mockReturnValue({
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useSubscriptions>);

    const { result } = renderHook(() => useMoneyAccountPlusAccess());

    expect(result.current).toBe(MoneyAccountPlusAccess.Unknown);
  });

  it('stays unknown when the subscriptions fetch fails', () => {
    mockUseSubscriptions.mockReturnValue({
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useSubscriptions>);

    const { result } = renderHook(() => useMoneyAccountPlusAccess());

    expect(result.current).toBe(MoneyAccountPlusAccess.Unknown);
  });

  it('treats a resolved non-subscriber as eligible', () => {
    const { result } = renderHook(() => useMoneyAccountPlusAccess());

    expect(result.current).toBe(MoneyAccountPlusAccess.Eligible);
    expect(mockUseSubscriptions).toHaveBeenCalledWith({ enabled: true });
  });
});
