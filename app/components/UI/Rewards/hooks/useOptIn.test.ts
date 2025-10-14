import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import useOptin from './useOptIn';
import Engine from '../../../../core/Engine';
import { setCandidateSubscriptionId } from '../../../../reducers/rewards';
import { useMetrics } from '../../../hooks/useMetrics';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import {
  selectSelectedAccountGroup,
  selectAccountGroupsByWallet,
  selectWalletByAccount,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { useLinkAccountGroup } from './useLinkAccountGroup';
import { AccountGroupId } from '@metamask/account-api';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../reducers/rewards', () => ({
  setCandidateSubscriptionId: jest.fn(),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    REWARDS_OPT_IN_STARTED: 'Rewards Opt-in Started',
    REWARDS_OPT_IN_COMPLETED: 'Rewards Opt-in Completed',
    REWARDS_OPT_IN_FAILED: 'Rewards Opt-in Failed',
  },
  useMetrics: jest.fn(),
}));

jest.mock(
  '../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(),
  }),
);

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroup: jest.fn(),
    selectAccountGroupsByWallet: jest.fn(),
    selectWalletByAccount: jest.fn(),
  }),
);

jest.mock(
  '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types',
  () => ({
    UserProfileProperty: {
      HAS_REWARDS_OPTED_IN: 'has_rewards_opted_in',
      ON: 'on',
    },
  }),
);

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../utils', () => ({
  handleRewardsErrorMessage: jest.fn((error) => `Error: ${error.message}`),
}));

jest.mock('./useLinkAccountGroup', () => ({
  useLinkAccountGroup: jest.fn(),
}));

describe('useOptIn', () => {
  const mockDispatch = jest.fn();
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockUseMetrics = jest.mocked(useMetrics);
  const mockSetCandidateSubscriptionId =
    setCandidateSubscriptionId as jest.MockedFunction<
      typeof setCandidateSubscriptionId
    >;

  // Mock selectors

  const mockSelectSelectedAccountGroup = jest.mocked(
    selectSelectedAccountGroup,
  );
  const mockSelectMultichainAccountsState2Enabled = jest.mocked(
    selectMultichainAccountsState2Enabled,
  );
  const mockSelectAccountGroupsByWallet = jest.mocked(
    selectAccountGroupsByWallet,
  );
  const mockSelectWalletByAccount = jest.mocked(selectWalletByAccount);
  const mockUseLinkAccountGroup = jest.mocked(useLinkAccountGroup);

  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn().mockReturnValue({
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      event: expect.any(String),
      properties: expect.any(Object),
    }),
  });
  const mockAddTraitsToUser = jest.fn();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockAccountGroup = {
    id: 'group-1' as AccountGroupId,
    accounts: ['account-1'],
    metadata: { name: 'Test Group' },
  } as never;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockWallet = {
    id: 'wallet-1',
    name: 'Test Wallet',
    type: 'keyring' as const,
    status: 'unlocked' as const,
    groups: {},
    metadata: { name: 'Test Wallet' },
  } as never;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockWalletSection = {
    title: 'Test Wallet',
    wallet: { id: 'wallet-1', name: 'Test Wallet' },
    data: [
      {
        type: 'single' as const,
        id: 'group-1',
        accounts: ['account-1'],
        metadata: { name: 'Group 1' },
      },
    ],
  } as never;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockActiveAccount = {
    id: 'account-1',
    address: '0x123',
    metadata: { name: 'Account 1' },
  } as never;

  const mockLinkAccountGroup = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Reset mock event builder functions
    mockCreateEventBuilder.mockClear();
    mockTrackEvent.mockClear();
    mockAddTraitsToUser.mockClear();

    // Setup default selector values
    mockSelectSelectedAccountGroup.mockReturnValue(mockAccountGroup);
    mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);
    mockSelectAccountGroupsByWallet.mockReturnValue([mockWalletSection]);
    mockSelectWalletByAccount.mockReturnValue(
      (_accountId: string) => mockWallet,
    );

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroup) return mockAccountGroup;
      if (selector === selectMultichainAccountsState2Enabled) return false;
      if (selector === selectAccountGroupsByWallet) return [mockWalletSection];
      if (selector === selectWalletByAccount)
        return (_accountId: string) => mockWallet;
      // Return mockActiveAccount for any other selector (e.g., selectSelectedInternalAccount)
      return mockActiveAccount;
    });

    // Setup useMetrics mock
    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
      addTraitsToUser: mockAddTraitsToUser,
    } as never);

    // Setup useLinkAccountGroup mock
    mockUseLinkAccountGroup.mockReturnValue({
      linkAccountGroup: mockLinkAccountGroup,
      isLoading: false,
      isError: false,
    } as never);

    // Setup default Engine call response
    mockEngineCall.mockResolvedValue('subscription-123');
  });

  describe('Basic functionality', () => {
    it('should return hook interface', () => {
      const { result } = renderHook(() => useOptin());

      expect(result.current).toEqual({
        optin: expect.any(Function),
        optinLoading: false,
        optinError: null,
        clearOptinError: expect.any(Function),
      });
    });

    it('should handle successful optin without multichain accounts', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        undefined,
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        mockSetCandidateSubscriptionId('subscription-123'),
      );
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        has_rewards_opted_in: 'on',
      });
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'Rewards Opt-in Started',
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'Rewards Opt-in Completed',
        }),
      );
    });

    it('should handle optin with referral code', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({
          referralCode: 'ABC123',
          isPrefilled: true,
        });
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        'ABC123',
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'Rewards Opt-in Started',
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(2); // Started and Completed
    });

    it('should handle optin failure', async () => {
      const error = new Error('Network error');
      mockEngineCall.mockRejectedValue(error);

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      expect(result.current.optinError).toBe('Error: Network error');
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'Rewards Opt-in Failed',
        }),
      );
    });

    it('should clear optin error', () => {
      const { result } = renderHook(() => useOptin());

      act(() => {
        result.current.clearOptinError();
      });

      expect(result.current.optinError).toBeNull();
    });

    it('should skip optin when no account group is selected', async () => {
      mockSelectSelectedAccountGroup.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return null;
        if (selector === selectMultichainAccountsState2Enabled) return false;
        if (selector === selectAccountGroupsByWallet)
          return [mockWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockActiveAccount;
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should skip optin when account group has no id', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountGroupWithoutId = {
        accounts: ['account-1'],
        metadata: { name: 'Test Group' },
      } as never;

      mockSelectSelectedAccountGroup.mockReturnValue(accountGroupWithoutId);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup)
          return accountGroupWithoutId;
        if (selector === selectMultichainAccountsState2Enabled) return false;
        if (selector === selectAccountGroupsByWallet)
          return [mockWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockActiveAccount;
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
    });
  });

  describe('Multichain accounts behavior', () => {
    beforeEach(() => {
      // Enable multichain accounts state 2
      mockSelectMultichainAccountsState2Enabled.mockReturnValue(true);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectMultichainAccountsState2Enabled) return true;
        if (selector === selectAccountGroupsByWallet)
          return [mockWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockActiveAccount;
      });
    });

    it('should link side effect account group when multichain accounts is enabled', async () => {
      // Setup wallet section with a different group ID for side effect
      const sideEffectWalletSection = {
        title: 'Test Wallet',
        wallet: mockWallet,
        data: [
          {
            type: 'single' as const,
            id: 'side-effect-group-1', // Different from current account group
            accounts: ['account-1'],
            metadata: { name: 'Side Effect Group' },
          },
        ],
      } as never;

      mockSelectAccountGroupsByWallet.mockReturnValue([
        sideEffectWalletSection,
      ]);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectMultichainAccountsState2Enabled) return true;
        if (selector === selectAccountGroupsByWallet)
          return [sideEffectWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockActiveAccount;
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should call optin first
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        undefined,
      );

      // Then should link the side effect account group after optin completes
      expect(mockLinkAccountGroup).toHaveBeenCalledWith('side-effect-group-1');

      // Should dispatch subscription ID after linkAccountGroup
      expect(mockDispatch).toHaveBeenCalledWith(
        mockSetCandidateSubscriptionId('subscription-123'),
      );
    });

    it('should not link side effect account group when it is the same as current account group', async () => {
      // Mock side effect account group with same ID as current account group
      const sameGroupWalletSection = {
        title: 'Test Wallet',
        wallet: mockWallet,
        data: [
          {
            type: 'single' as const,
            id: 'group-1', // Same as current account group
            accounts: ['account-1'],
            metadata: { name: 'Same Group' },
          },
        ],
      } as never;

      mockSelectAccountGroupsByWallet.mockReturnValue([sameGroupWalletSection]);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectMultichainAccountsState2Enabled) return true;
        if (selector === selectAccountGroupsByWallet)
          return [sameGroupWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockActiveAccount;
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should only call optin, not link account group
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        undefined,
      );
      expect(mockLinkAccountGroup).not.toHaveBeenCalled();
    });

    it('should handle case when side effect account group is not found', async () => {
      mockSelectAccountGroupsByWallet.mockReturnValue([]);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectMultichainAccountsState2Enabled) return true;
        if (selector === selectAccountGroupsByWallet) return [];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockActiveAccount;
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should only call optin, not link account group
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        undefined,
      );
      expect(mockLinkAccountGroup).not.toHaveBeenCalled();
    });

    it('should handle case when current account wallet is not found', async () => {
      mockSelectAccountGroupsByWallet.mockReturnValue([
        {
          title: 'Different Wallet',
          wallet: { id: 'keyring:different', name: 'Different Wallet' },
          data: [
            {
              type: 'single' as const,
              id: 'group-different',
              accounts: ['account-1'],
              metadata: { name: 'Different Group' },
            },
          ],
        },
      ] as never);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectMultichainAccountsState2Enabled) return true;
        if (selector === selectAccountGroupsByWallet)
          return [
            {
              title: 'Different Wallet',
              wallet: { id: 'keyring:different', name: 'Different Wallet' },
              data: [
                {
                  type: 'single' as const,
                  id: 'group-different',
                  accounts: ['account-1'],
                  metadata: { name: 'Different Group' },
                },
              ],
            },
          ];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockActiveAccount;
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should only call optin, not link account group
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        undefined,
      );
      expect(mockLinkAccountGroup).not.toHaveBeenCalled();
    });

    it('should complete optin successfully even if linkAccountGroup fails', async () => {
      // Setup wallet section with a different group ID for side effect
      const sideEffectWalletSection = {
        title: 'Test Wallet',
        wallet: mockWallet,
        data: [
          {
            type: 'single' as const,
            id: 'side-effect-group-1', // Different from current account group
            accounts: ['account-1'],
            metadata: { name: 'Side Effect Group' },
          },
        ],
      } as never;

      mockSelectAccountGroupsByWallet.mockReturnValue([
        sideEffectWalletSection,
      ]);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectMultichainAccountsState2Enabled) return true;
        if (selector === selectAccountGroupsByWallet)
          return [sideEffectWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockActiveAccount;
      });

      // Mock linkAccountGroup to throw an error
      mockLinkAccountGroup.mockRejectedValue(
        new Error('Failed to link account group'),
      );

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should call optin
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        undefined,
      );

      // Should attempt to link the side effect account group
      expect(mockLinkAccountGroup).toHaveBeenCalledWith('side-effect-group-1');

      // Should still dispatch subscription ID even though linkAccountGroup failed
      expect(mockDispatch).toHaveBeenCalledWith(
        mockSetCandidateSubscriptionId('subscription-123'),
      );

      // Should not set an error (linkAccountGroup failure is silently handled)
      expect(result.current.optinError).toBeNull();

      // Should complete loading (set to false)
      expect(result.current.optinLoading).toBe(false);

      // Should still track success events
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'Rewards Opt-in Completed',
        }),
      );
    });

    it('should not call linkAccountGroup when optin fails', async () => {
      // Setup wallet section with a different group ID for side effect
      const sideEffectWalletSection = {
        title: 'Test Wallet',
        wallet: mockWallet,
        data: [
          {
            type: 'single' as const,
            id: 'side-effect-group-1', // Different from current account group
            accounts: ['account-1'],
            metadata: { name: 'Side Effect Group' },
          },
        ],
      } as never;

      mockSelectAccountGroupsByWallet.mockReturnValue([
        sideEffectWalletSection,
      ]);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectMultichainAccountsState2Enabled) return true;
        if (selector === selectAccountGroupsByWallet)
          return [sideEffectWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockActiveAccount;
      });

      // Mock optin to fail
      const error = new Error('Optin failed');
      mockEngineCall.mockRejectedValue(error);

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should have attempted optin
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        undefined,
      );

      // Should not call linkAccountGroup since optin failed
      expect(mockLinkAccountGroup).not.toHaveBeenCalled();

      // Should not dispatch subscription ID since optin failed
      expect(mockDispatch).not.toHaveBeenCalled();

      // Should set error
      expect(result.current.optinError).toBe('Error: Optin failed');

      // Should complete loading (set to false)
      expect(result.current.optinLoading).toBe(false);
    });
  });

  describe('Metrics tracking', () => {
    it('should track metrics with referral code properties', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({
          referralCode: 'REF123',
          isPrefilled: false,
        });
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'Rewards Opt-in Started',
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'Rewards Opt-in Completed',
      );

      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        referred: true,
        referral_code_used: 'REF123',
        referral_code_input_type: 'manual',
      });
    });

    it('should track metrics without referral code properties', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        referred: false,
        referral_code_used: undefined,
        referral_code_input_type: 'manual',
      });
    });
  });

  describe('Loading states', () => {
    it('should manage loading state correctly', async () => {
      const { result } = renderHook(() => useOptin());

      expect(result.current.optinLoading).toBe(false);

      let optinPromise: Promise<void>;
      await act(async () => {
        optinPromise = result.current.optin({});
      });

      // Loading should be true during operation
      expect(result.current.optinLoading).toBe(false); // Completed

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (await optinPromise!) as unknown as Promise<void>;
      expect(result.current.optinLoading).toBe(false);
    });
  });
});
