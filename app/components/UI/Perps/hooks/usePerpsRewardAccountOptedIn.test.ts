import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsRewardAccountOptedIn } from './usePerpsRewardAccountOptedIn';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { formatAccountToCaipAccountId } from '../utils/rewardsUtils';
import { InternalAccount } from '@metamask/keyring-internal-api';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

// Mock selectors
jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

// Mock utility functions
jest.mock('../../../../core/Multichain/utils', () => ({
  getFormattedAddressFromInternalAccount: jest.fn(),
}));

jest.mock('../utils/rewardsUtils', () => ({
  formatAccountToCaipAccountId: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;
const mockGetFormattedAddressFromInternalAccount =
  getFormattedAddressFromInternalAccount as jest.MockedFunction<
    typeof getFormattedAddressFromInternalAccount
  >;
const mockFormatAccountToCaipAccountId =
  formatAccountToCaipAccountId as jest.MockedFunction<
    typeof formatAccountToCaipAccountId
  >;
const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockEngineSubscribe = Engine.controllerMessenger
  .subscribe as jest.MockedFunction<
  typeof Engine.controllerMessenger.subscribe
>;
const mockEngineUnsubscribe = Engine.controllerMessenger
  .unsubscribe as jest.MockedFunction<
  typeof Engine.controllerMessenger.unsubscribe
>;

describe('usePerpsRewardAccountOptedIn', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockCaipAccount = 'eip155:1:0x1234567890123456789012345678901234567890';
  const mockAccount: InternalAccount = {
    id: 'test-account-id',
    address: mockAddress,
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
    options: {},
    methods: ['personal_sign'],
    metadata: {
      name: 'Test Account',
      keyring: {
        type: 'HD Key Tree',
      },
      importTime: 1234567890,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    // selectSelectedInternalAccountByScope is a selector that returns a function
    // When used with useSelector, it should return a function that takes a scope
    const scopeSelector = (scope: string) => {
      if (scope === 'eip155:1') {
        return mockAccount;
      }
      return undefined;
    };

    mockSelectSelectedInternalAccountByScope.mockReturnValue(scopeSelector);

    mockUseSelector.mockImplementation((selector) => {
      // When selector is selectSelectedInternalAccountByScope, return the scope selector function
      if (selector === selectSelectedInternalAccountByScope) {
        return scopeSelector;
      }
      return undefined;
    });

    mockGetFormattedAddressFromInternalAccount.mockReturnValue(mockAddress);
    mockFormatAccountToCaipAccountId.mockReturnValue(mockCaipAccount);
  });

  describe('Initial state and account selection', () => {
    it('returns null accountOptedIn when account is missing', async () => {
      const emptyScopeSelector = () => undefined;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedInternalAccountByScope) {
          return emptyScopeSelector;
        }
        return undefined;
      });

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });

      expect(result.current.account).toBeUndefined();
    });

    it('returns null accountOptedIn when address is missing', async () => {
      mockGetFormattedAddressFromInternalAccount.mockReturnValue(
        undefined as unknown as string,
      );

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });
    });

    it('returns selected account when available', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockEngineCall.mockResolvedValueOnce(true); // getHasAccountOptedIn

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.account).toEqual(mockAccount);
      });
    });
  });

  describe('Active season check', () => {
    it('returns null when there is no active season', async () => {
      mockEngineCall.mockResolvedValueOnce(false); // hasActiveSeason

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:hasActiveSeason',
      );
      expect(mockEngineCall).not.toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );
    });

    it('proceeds to check subscription when there is an active season', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockEngineCall.mockResolvedValueOnce(true); // getHasAccountOptedIn

      renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(mockEngineCall).toHaveBeenCalledWith(
          'RewardsController:hasActiveSeason',
        );
        expect(mockEngineCall).toHaveBeenCalledWith(
          'RewardsController:getCandidateSubscriptionId',
        );
      });
    });
  });

  describe('Subscription check', () => {
    it('returns null when no subscription exists', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce(null); // getCandidateSubscriptionId

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );
      expect(mockEngineCall).not.toHaveBeenCalledWith(
        'RewardsController:getHasAccountOptedIn',
      );
    });

    it('proceeds to check opt-in when subscription exists', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockEngineCall.mockResolvedValueOnce(true); // getHasAccountOptedIn

      renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(mockEngineCall).toHaveBeenCalledWith(
          'RewardsController:getCandidateSubscriptionId',
        );
        expect(mockEngineCall).toHaveBeenCalledWith(
          'RewardsController:getHasAccountOptedIn',
          mockCaipAccount,
        );
      });
    });
  });

  describe('CAIP account formatting', () => {
    it('returns null when CAIP formatting fails', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockFormatAccountToCaipAccountId.mockReturnValue(null);

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });

      expect(mockFormatAccountToCaipAccountId).toHaveBeenCalledWith(
        mockAddress,
        '1',
      );
      expect(mockEngineCall).not.toHaveBeenCalledWith(
        'RewardsController:getHasAccountOptedIn',
        expect.anything(),
      );
    });

    it('uses formatted CAIP account for opt-in check', async () => {
      const customCaipAccount = 'eip155:1:0xCustomAddress';
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockFormatAccountToCaipAccountId.mockReturnValue(customCaipAccount);
      mockEngineCall.mockResolvedValueOnce(true); // getHasAccountOptedIn

      renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(mockEngineCall).toHaveBeenCalledWith(
          'RewardsController:getHasAccountOptedIn',
          customCaipAccount,
        );
      });
    });
  });

  describe('Account opt-in status', () => {
    it('returns true when account has opted in', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockEngineCall.mockResolvedValueOnce(true); // getHasAccountOptedIn

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBe(true);
      });
    });

    it('returns false when account has not opted in and opt-in is supported', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockEngineCall.mockResolvedValueOnce(false); // getHasAccountOptedIn
      mockEngineCall.mockResolvedValueOnce(true); // isOptInSupported

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBe(false);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:isOptInSupported',
        mockAccount,
      );
    });

    it('returns null when account has not opted in and opt-in is not supported', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockEngineCall.mockResolvedValueOnce(false); // getHasAccountOptedIn
      mockEngineCall.mockResolvedValueOnce(false); // isOptInSupported

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:isOptInSupported',
        mockAccount,
      );
    });
  });

  describe('Error handling', () => {
    it('returns null when hasActiveSeason throws error', async () => {
      mockEngineCall.mockRejectedValueOnce(
        new Error('Active season check failed'),
      );

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });
    });

    it('returns null when getCandidateSubscriptionId throws error', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockRejectedValueOnce(
        new Error('Subscription check failed'),
      );

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });
    });

    it('returns null when getHasAccountOptedIn throws error', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockEngineCall.mockRejectedValueOnce(new Error('Opt-in check failed'));

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });
    });

    it('returns null when isOptInSupported throws error', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockEngineCall.mockResolvedValueOnce(false); // getHasAccountOptedIn
      mockEngineCall.mockRejectedValueOnce(
        new Error('Opt-in support check failed'),
      );

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBeNull();
      });
    });
  });

  describe('Account linked event subscription', () => {
    it('subscribes to account linked event on mount', () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockEngineCall.mockResolvedValueOnce(true); // getHasAccountOptedIn

      renderHook(() => usePerpsRewardAccountOptedIn());

      expect(mockEngineSubscribe).toHaveBeenCalledWith(
        'RewardsController:accountLinked',
        expect.any(Function),
      );
    });

    it('unsubscribes from account linked event on unmount', () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-id'); // getCandidateSubscriptionId
      mockEngineCall.mockResolvedValueOnce(true); // getHasAccountOptedIn

      const { unmount } = renderHook(() => usePerpsRewardAccountOptedIn());

      const subscribeCall = mockEngineSubscribe.mock.calls[0];
      const handler = subscribeCall[1] as () => void;

      unmount();

      expect(mockEngineUnsubscribe).toHaveBeenCalledWith(
        'RewardsController:accountLinked',
        handler,
      );
    });

    it('rechecks opt-in status when account linked event fires', async () => {
      mockEngineCall.mockResolvedValue(true); // All calls succeed

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBe(true);
      });

      const initialCallCount = mockEngineCall.mock.calls.length;

      // Simulate account linked event
      const subscribeCall = mockEngineSubscribe.mock.calls[0];
      const handler = subscribeCall[1] as () => void;

      await act(async () => {
        handler();
      });

      await waitFor(() => {
        expect(mockEngineCall.mock.calls.length).toBeGreaterThan(
          initialCallCount,
        );
      });
    });
  });

  describe('Trigger parameter', () => {
    it('rechecks opt-in status when trigger changes', async () => {
      mockEngineCall.mockResolvedValue(true); // All calls succeed

      const { result, rerender } = renderHook(
        ({ trigger }) => usePerpsRewardAccountOptedIn(trigger),
        {
          initialProps: { trigger: 'initial' },
        },
      );

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBe(true);
      });

      const initialCallCount = mockEngineCall.mock.calls.length;

      // Change trigger
      rerender({ trigger: 'updated' });

      await waitFor(() => {
        expect(mockEngineCall.mock.calls.length).toBeGreaterThan(
          initialCallCount,
        );
      });
    });

    it('handles undefined trigger', async () => {
      mockEngineCall.mockResolvedValue(true); // All calls succeed

      const { result } = renderHook(() =>
        usePerpsRewardAccountOptedIn(undefined),
      );

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBe(true);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('handles complete flow from account selection to opt-in check', async () => {
      mockEngineCall.mockResolvedValueOnce(true); // hasActiveSeason
      mockEngineCall.mockResolvedValueOnce('subscription-123'); // getCandidateSubscriptionId
      mockEngineCall.mockResolvedValueOnce(true); // getHasAccountOptedIn

      const { result } = renderHook(() => usePerpsRewardAccountOptedIn());

      await waitFor(() => {
        expect(result.current.accountOptedIn).toBe(true);
        expect(result.current.account).toEqual(mockAccount);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:hasActiveSeason',
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getCandidateSubscriptionId',
      );
      expect(mockFormatAccountToCaipAccountId).toHaveBeenCalledWith(
        mockAddress,
        '1',
      );
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getHasAccountOptedIn',
        mockCaipAccount,
      );
    });
  });
});
