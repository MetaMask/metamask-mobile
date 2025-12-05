import { renderHook, waitFor } from '@testing-library/react-native';
import { useRewardsAccountOptedIn } from './useRewardsAccountOptedIn';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { formatAccountToCaipAccountId } from '../utils/rewardsUtils';

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
jest.mock('../utils/rewardsUtils');

describe('useRewardsAccountOptedIn', () => {
  const mockAccount = {
    id: 'account-1',
    address: '0x123',
    type: 'eip155:eoa' as const,
    options: {},
    metadata: {
      name: 'Account 1',
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
    },
    scopes: ['eip155:1' as const],
    methods: [],
  };
  const mockAddress = '0x123';
  const mockCaipAccount = 'eip155:1:0x123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(() => mockAccount);
    jest
      .mocked(getFormattedAddressFromInternalAccount)
      .mockReturnValue(mockAddress);
    jest.mocked(formatAccountToCaipAccountId).mockReturnValue(mockCaipAccount);
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
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(() => undefined);

    const { result } = renderHook(() => useRewardsAccountOptedIn());

    await waitFor(() => {
      expect(result.current.accountOptedIn).toBeNull();
    });
  });

  it('returns null when CAIP account formatting fails', async () => {
    jest.mocked(formatAccountToCaipAccountId).mockReturnValue(null);
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

  it('returns selected account in result', async () => {
    (Engine.controllerMessenger.call as jest.Mock)
      .mockResolvedValueOnce(true) // isRewardsFeatureEnabled
      .mockResolvedValueOnce('subscription-id') // getCandidateSubscriptionId
      .mockResolvedValueOnce(true); // getHasAccountOptedIn

    const { result } = renderHook(() => useRewardsAccountOptedIn());

    await waitFor(() => {
      expect(result.current.account).toEqual(mockAccount);
    });
  });

  describe('requireActiveSeason parameter', () => {
    it('checks hasActiveSeason when requireActiveSeason is true', async () => {
      (Engine.controllerMessenger.call as jest.Mock)
        .mockResolvedValueOnce(true) // isRewardsFeatureEnabled
        .mockResolvedValueOnce(true) // hasActiveSeason
        .mockResolvedValueOnce('subscription-id') // getCandidateSubscriptionId
        .mockResolvedValueOnce(true); // getHasAccountOptedIn

      const { result } = renderHook(() =>
        useRewardsAccountOptedIn({ requireActiveSeason: true }),
      );

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBe(true);
      });

      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'RewardsController:isRewardsFeatureEnabled',
      );
      expect(Engine.controllerMessenger.call).toHaveBeenCalledWith(
        'RewardsController:hasActiveSeason',
      );
    });

    it('returns null when rewards enabled but no active season', async () => {
      (Engine.controllerMessenger.call as jest.Mock)
        .mockResolvedValueOnce(true) // isRewardsFeatureEnabled
        .mockResolvedValueOnce(false); // hasActiveSeason

      const { result } = renderHook(() =>
        useRewardsAccountOptedIn({ requireActiveSeason: true }),
      );

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });
    });

    it('returns null when rewards not enabled even with requireActiveSeason', async () => {
      (Engine.controllerMessenger.call as jest.Mock).mockResolvedValueOnce(
        false,
      ); // isRewardsFeatureEnabled

      const { result } = renderHook(() =>
        useRewardsAccountOptedIn({ requireActiveSeason: true }),
      );

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });

      // Does not call hasActiveSeason if rewards not enabled
      expect(Engine.controllerMessenger.call).not.toHaveBeenCalledWith(
        'RewardsController:hasActiveSeason',
      );
    });

    it('does not check hasActiveSeason when requireActiveSeason is false', async () => {
      (Engine.controllerMessenger.call as jest.Mock)
        .mockResolvedValueOnce(true) // isRewardsFeatureEnabled
        .mockResolvedValueOnce('subscription-id') // getCandidateSubscriptionId
        .mockResolvedValueOnce(true); // getHasAccountOptedIn

      const { result } = renderHook(() =>
        useRewardsAccountOptedIn({ requireActiveSeason: false }),
      );

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBe(true);
      });

      expect(Engine.controllerMessenger.call).not.toHaveBeenCalledWith(
        'RewardsController:hasActiveSeason',
      );
    });
  });

  describe('trigger parameter', () => {
    it('re-checks opt-in status when trigger changes', async () => {
      (Engine.controllerMessenger.call as jest.Mock).mockResolvedValue(true);

      const { result, rerender } = renderHook(
        ({ trigger }) => useRewardsAccountOptedIn({ trigger }),
        { initialProps: { trigger: 'initial' } },
      );

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBe(true);
      });

      const initialCallCount = (Engine.controllerMessenger.call as jest.Mock)
        .mock.calls.length;

      rerender({ trigger: 'changed' });

      await waitFor(() => {
        expect(
          (Engine.controllerMessenger.call as jest.Mock).mock.calls.length,
        ).toBeGreaterThan(initialCallCount);
      });
    });
  });
});
