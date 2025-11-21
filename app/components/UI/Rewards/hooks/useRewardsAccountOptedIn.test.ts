import { renderHook, waitFor } from '@testing-library/react-native';
import { useRewardsAccountOptedIn } from './useRewardsAccountOptedIn';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { formatAccountToCaipAccountId } from '../../Perps/utils/rewardsUtils';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../../../selectors/multichainAccounts/accounts');
jest.mock('../../../../core/Multichain/utils');
jest.mock('../../Perps/utils/rewardsUtils');

describe('useRewardsAccountOptedIn', () => {
  const mockAccount = {
    id: 'account-1',
    address: '0x123',
    type: 'eip155:eoa',
  };
  const mockAddress = '0x123';
  const mockCaipAccount = 'eip155:1:0x123';

  beforeEach(() => {
    jest.clearAllMocks();
    (
      selectSelectedInternalAccountByScope as jest.Mock
    ).mockReturnValue(() => mockAccount);
    (
      getFormattedAddressFromInternalAccount as jest.Mock
    ).mockReturnValue(mockAddress);
    (formatAccountToCaipAccountId as jest.Mock).mockReturnValue(
      mockCaipAccount,
    );
  });

  it('returns null when rewards feature is not enabled', async () => {
    (Engine.controllerMessenger.call as jest.Mock).mockResolvedValueOnce(false);

    const { result } = renderHook(() => useRewardsAccountOptedIn());

    await waitFor(() => {
      expect(result.current.accountOptedIn).toBeNull();
    });
  });

  it('returns null when no subscription exists', async () => {
    (Engine.controllerMessenger.call as jest.Mock)
      .mockResolvedValueOnce(true) // isRewardsFeatureEnabled
      .mockResolvedValueOnce(null); // getCandidateSubscriptionId

    const { result } = renderHook(() => useRewardsAccountOptedIn());

    await waitFor(() => {
      expect(result.current.accountOptedIn).toBeNull();
    });
  });

  it('returns true when account is opted in', async () => {
    (Engine.controllerMessenger.call as jest.Mock)
      .mockResolvedValueOnce(true) // isRewardsFeatureEnabled
      .mockResolvedValueOnce('subscription-id') // getCandidateSubscriptionId
      .mockResolvedValueOnce(true); // getHasAccountOptedIn

    const { result } = renderHook(() => useRewardsAccountOptedIn());

    await waitFor(() => {
      expect(result.current.accountOptedIn).toBe(true);
    });
  });

  it('returns false when account is not opted in but opt-in is supported', async () => {
    (Engine.controllerMessenger.call as jest.Mock)
      .mockResolvedValueOnce(true) // isRewardsFeatureEnabled
      .mockResolvedValueOnce('subscription-id') // getCandidateSubscriptionId
      .mockResolvedValueOnce(false) // getHasAccountOptedIn
      .mockResolvedValueOnce(true); // isOptInSupported

    const { result } = renderHook(() => useRewardsAccountOptedIn());

    await waitFor(() => {
      expect(result.current.accountOptedIn).toBe(false);
    });
  });

  it('returns null when account is not opted in and opt-in is not supported', async () => {
    (Engine.controllerMessenger.call as jest.Mock)
      .mockResolvedValueOnce(true) // isRewardsFeatureEnabled
      .mockResolvedValueOnce('subscription-id') // getCandidateSubscriptionId
      .mockResolvedValueOnce(false) // getHasAccountOptedIn
      .mockResolvedValueOnce(false); // isOptInSupported

    const { result } = renderHook(() => useRewardsAccountOptedIn());

    await waitFor(() => {
      expect(result.current.accountOptedIn).toBeNull();
    });
  });

  it('returns null when selected account is not available', async () => {
    (
      selectSelectedInternalAccountByScope as jest.Mock
    ).mockReturnValue(() => null);

    const { result } = renderHook(() => useRewardsAccountOptedIn());

    await waitFor(() => {
      expect(result.current.accountOptedIn).toBeNull();
    });
  });

  it('returns null when CAIP account formatting fails', async () => {
    (formatAccountToCaipAccountId as jest.Mock).mockReturnValue(
      null,
    );
    (Engine.controllerMessenger.call as jest.Mock)
      .mockResolvedValueOnce(true) // isRewardsFeatureEnabled
      .mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId

    const { result } = renderHook(() => useRewardsAccountOptedIn());

    await waitFor(() => {
      expect(result.current.accountOptedIn).toBeNull();
    });
  });

  it('returns null when an error occurs', async () => {
    (Engine.controllerMessenger.call as jest.Mock).mockRejectedValueOnce(
      new Error('Test error'),
    );

    const { result } = renderHook(() => useRewardsAccountOptedIn());

    await waitFor(() => {
      expect(result.current.accountOptedIn).toBeNull();
    });
  });

  it('subscribes to account linked events', () => {
    renderHook(() => useRewardsAccountOptedIn());

    expect(Engine.controllerMessenger.subscribe).toHaveBeenCalledWith(
      'RewardsController:accountLinked',
      expect.any(Function),
    );
  });

  it('unsubscribes from account linked events on unmount', () => {
    const { unmount } = renderHook(() => useRewardsAccountOptedIn());

    unmount();

    expect(Engine.controllerMessenger.unsubscribe).toHaveBeenCalledWith(
      'RewardsController:accountLinked',
      expect.any(Function),
    );
  });
});
