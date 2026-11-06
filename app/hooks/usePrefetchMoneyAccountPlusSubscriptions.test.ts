import { renderHook } from '@testing-library/react-native';

import useSubscriptions from '../components/hooks/useSubscriptions';
import { usePrefetchMoneyAccountPlusSubscriptions } from './usePrefetchMoneyAccountPlusSubscriptions';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

jest.mock('./useProSubscriptionEnabled', () => ({
  useProSubscriptionEnabled: jest.fn(() => ({
    isProSubscriptionEnabled: false,
  })),
}));

jest.mock('../components/hooks/useSubscriptions', () => jest.fn());

const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);
const mockUseSubscriptions = jest.mocked(useSubscriptions);

describe('usePrefetchMoneyAccountPlusSubscriptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
    });
  });

  it('leaves the subscriptions query off while the Orange flag is off', () => {
    renderHook(() => usePrefetchMoneyAccountPlusSubscriptions());

    expect(mockUseSubscriptions).toHaveBeenCalledWith({ enabled: false });
  });

  it('starts the subscriptions query when the Orange flag is on', () => {
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });

    renderHook(() => usePrefetchMoneyAccountPlusSubscriptions());

    expect(mockUseSubscriptions).toHaveBeenCalledWith({ enabled: true });
  });
});
