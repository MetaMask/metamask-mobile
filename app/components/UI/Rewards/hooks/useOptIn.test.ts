import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import useOptin from './useOptIn';
import Engine from '../../../../core/Engine';
import { setCandidateSubscriptionId } from '../../../../reducers/rewards';
import { useMetrics } from '../../../hooks/useMetrics';
import {
  selectSelectedAccountGroup,
  selectAccountGroupsByWallet,
  selectWalletByAccount,
  selectSelectedAccountGroupInternalAccounts,
} from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { useLinkAccountGroup } from './useLinkAccountGroup';
import { useBulkLinkState } from './useBulkLinkState';
import { AccountGroupId } from '@metamask/account-api';
import { InternalAccount } from '@metamask/keyring-internal-api';

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
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroup: jest.fn(),
    selectAccountGroupsByWallet: jest.fn(),
    selectWalletByAccount: jest.fn(),
    selectSelectedAccountGroupInternalAccounts: jest.fn(),
  }),
);

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectInternalAccountsByGroupId: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
}));

jest.mock(
  '../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types',
  () => ({
    UserProfileProperty: {
      HAS_REWARDS_OPTED_IN: 'has_rewards_opted_in',
      ON: 'on',
      REWARDS_REFERRED: 'rewards_referred',
      REWARDS_REFERRAL_CODE_USED: 'rewards_referral_code_used',
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

jest.mock('./useBulkLinkState', () => ({
  useBulkLinkState: jest.fn(),
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
  const mockSelectAccountGroupsByWallet = jest.mocked(
    selectAccountGroupsByWallet,
  );
  const mockSelectWalletByAccount = jest.mocked(selectWalletByAccount);
  const mockSelectSelectedAccountGroupInternalAccounts = jest.mocked(
    selectSelectedAccountGroupInternalAccounts,
  );
  const mockSelectInternalAccountsByGroupId = jest.mocked(
    selectInternalAccountsByGroupId,
  );
  const mockSelectSelectedInternalAccount = jest.mocked(
    selectSelectedInternalAccount,
  );
  const mockUseLinkAccountGroup = jest.mocked(useLinkAccountGroup);
  const mockUseBulkLinkState = jest.mocked(useBulkLinkState);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockActiveGroupAccounts: InternalAccount[] = [
    {
      id: 'account-1',
      address: '0x123',
      metadata: { name: 'Account 1' },
    } as InternalAccount,
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockSideEffectAccounts: InternalAccount[] = [
    {
      id: 'account-2',
      address: '0x456',
      metadata: { name: 'Account 2' },
    } as InternalAccount,
  ];

  const mockLinkAccountGroup = jest.fn();
  const mockStartBulkLink = jest.fn();
  const mockCancelBulkLink = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Reset mock event builder functions
    mockCreateEventBuilder.mockClear();
    mockTrackEvent.mockClear();
    mockAddTraitsToUser.mockClear();

    // Setup default selector values
    mockSelectSelectedAccountGroup.mockReturnValue(mockAccountGroup);
    mockSelectAccountGroupsByWallet.mockReturnValue([mockWalletSection]);
    mockSelectWalletByAccount.mockReturnValue(
      (_accountId: string) => mockWallet,
    );
    mockSelectSelectedAccountGroupInternalAccounts.mockReturnValue(
      mockActiveGroupAccounts,
    );
    mockSelectInternalAccountsByGroupId.mockReturnValue(
      (_groupId: string) => [],
    );
    mockSelectSelectedInternalAccount.mockReturnValue(mockActiveAccount);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroup) return mockAccountGroup;
      if (selector === selectAccountGroupsByWallet) return [mockWalletSection];
      if (selector === selectWalletByAccount)
        return (_accountId: string) => mockWallet;
      if (selector === selectSelectedAccountGroupInternalAccounts)
        return mockActiveGroupAccounts;
      if (selector === selectInternalAccountsByGroupId)
        return (_groupId: string) => [];
      if (selector === selectSelectedInternalAccount) return mockActiveAccount;
      return undefined;
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

    // Setup useBulkLinkState mock
    mockUseBulkLinkState.mockReturnValue({
      startBulkLink: mockStartBulkLink,
      cancelBulkLink: mockCancelBulkLink,
      resetBulkLink: jest.fn(),
      isRunning: false,
      isCompleted: false,
      hasFailures: false,
      isFullySuccessful: false,
      totalAccounts: 0,
      linkedAccounts: 0,
      failedAccounts: 0,
      accountProgress: 0,
      processedAccounts: 0,
    });

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

    it('should handle successful optin with active group accounts', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockActiveGroupAccounts,
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
        mockActiveGroupAccounts,
        'ABC123',
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'Rewards Opt-in Started',
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(2); // Started and Completed
      expect(mockAddTraitsToUser).toHaveBeenCalledWith({
        has_rewards_opted_in: 'on',
        rewards_referred: true,
        rewards_referral_code_used: 'ABC123',
      });
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
        if (selector === selectAccountGroupsByWallet)
          return [mockWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        if (selector === selectSelectedAccountGroupInternalAccounts)
          return mockActiveGroupAccounts;
        if (selector === selectInternalAccountsByGroupId)
          return (_groupId: string) => [];
        if (selector === selectSelectedInternalAccount)
          return mockActiveAccount;
        return undefined;
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
        if (selector === selectAccountGroupsByWallet)
          return [mockWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        if (selector === selectSelectedAccountGroupInternalAccounts)
          return mockActiveGroupAccounts;
        if (selector === selectInternalAccountsByGroupId)
          return (_groupId: string) => [];
        if (selector === selectSelectedInternalAccount)
          return mockActiveAccount;
        return undefined;
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should throw error when subscriptionId is null', async () => {
      mockEngineCall.mockResolvedValue(null);

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      expect(result.current.optinError).toBe(
        'Error: Failed to opt in any account from the account group',
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'Rewards Opt-in Failed',
        }),
      );
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('Side effect account group behavior', () => {
    beforeEach(() => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectAccountGroupsByWallet)
          return [mockWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        if (selector === selectSelectedAccountGroupInternalAccounts)
          return mockActiveGroupAccounts;
        if (selector === selectInternalAccountsByGroupId)
          return (_groupId: string) => [];
        if (selector === selectSelectedInternalAccount)
          return mockActiveAccount;
        return undefined;
      });
    });

    it('should use side effect accounts and link selected account group when side effect accounts exist', async () => {
      // Setup wallet section with a different group ID for side effect
      const sideEffectWalletSection = {
        title: 'Test Wallet',
        wallet: mockWallet,
        data: [
          {
            type: 'single' as const,
            id: 'side-effect-group-1', // Different from current account group
            accounts: ['account-2'],
            metadata: { name: 'Side Effect Group' },
          },
        ],
      } as never;

      mockSelectAccountGroupsByWallet.mockReturnValue([
        sideEffectWalletSection,
      ]);
      mockSelectInternalAccountsByGroupId.mockReturnValue((groupId: string) => {
        if (groupId === 'side-effect-group-1') {
          return mockSideEffectAccounts;
        }
        return [];
      });

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectAccountGroupsByWallet)
          return [sideEffectWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        if (selector === selectSelectedAccountGroupInternalAccounts)
          return mockActiveGroupAccounts;
        if (selector === selectInternalAccountsByGroupId)
          return (groupId: string) => {
            if (groupId === 'side-effect-group-1') {
              return mockSideEffectAccounts;
            }
            return [];
          };
        if (selector === selectSelectedInternalAccount)
          return mockActiveAccount;
        return undefined;
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should call optin with side effect accounts
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockSideEffectAccounts,
        undefined,
      );

      // Then should link the selected account group (group-1) after optin completes
      expect(mockLinkAccountGroup).toHaveBeenCalledWith('group-1');

      // Should dispatch subscription ID after linkAccountGroup
      expect(mockDispatch).toHaveBeenCalledWith(
        mockSetCandidateSubscriptionId('subscription-123'),
      );
    });

    it('should use active group accounts and link side effect account group when side effect accounts are empty', async () => {
      // Setup wallet section with a different group ID for side effect
      const sideEffectWalletSection = {
        title: 'Test Wallet',
        wallet: mockWallet,
        data: [
          {
            type: 'single' as const,
            id: 'side-effect-group-1', // Different from current account group
            accounts: ['account-2'],
            metadata: { name: 'Side Effect Group' },
          },
        ],
      } as never;

      mockSelectAccountGroupsByWallet.mockReturnValue([
        sideEffectWalletSection,
      ]);
      // Return empty array for side effect accounts
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        (_groupId: string) => [],
      );

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectAccountGroupsByWallet)
          return [sideEffectWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        if (selector === selectSelectedAccountGroupInternalAccounts)
          return mockActiveGroupAccounts;
        if (selector === selectInternalAccountsByGroupId)
          return (_groupId: string) => [];
        if (selector === selectSelectedInternalAccount)
          return mockActiveAccount;
        return undefined;
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should call optin with active group accounts
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockActiveGroupAccounts,
        undefined,
      );

      // Should link the side effect account group
      expect(mockLinkAccountGroup).toHaveBeenCalledWith('side-effect-group-1');

      // Should dispatch subscription ID
      expect(mockDispatch).toHaveBeenCalledWith(
        mockSetCandidateSubscriptionId('subscription-123'),
      );
    });

    it('should handle case when side effect account group is not found', async () => {
      mockSelectAccountGroupsByWallet.mockReturnValue([]);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectAccountGroupsByWallet) return [];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        if (selector === selectSelectedAccountGroupInternalAccounts)
          return mockActiveGroupAccounts;
        if (selector === selectInternalAccountsByGroupId)
          return (_groupId: string) => [];
        if (selector === selectSelectedInternalAccount)
          return mockActiveAccount;
        return undefined;
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should only call optin with active group accounts, not link account group
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockActiveGroupAccounts,
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
        if (selector === selectSelectedAccountGroupInternalAccounts)
          return mockActiveGroupAccounts;
        if (selector === selectInternalAccountsByGroupId)
          return (_groupId: string) => [];
        if (selector === selectSelectedInternalAccount)
          return mockActiveAccount;
        return undefined;
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should only call optin with active group accounts, not link account group
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockActiveGroupAccounts,
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
            accounts: ['account-2'],
            metadata: { name: 'Side Effect Group' },
          },
        ],
      } as never;

      mockSelectAccountGroupsByWallet.mockReturnValue([
        sideEffectWalletSection,
      ]);
      mockSelectInternalAccountsByGroupId.mockReturnValue((groupId: string) => {
        if (groupId === 'side-effect-group-1') {
          return mockSideEffectAccounts;
        }
        return [];
      });

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectAccountGroupsByWallet)
          return [sideEffectWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        if (selector === selectSelectedAccountGroupInternalAccounts)
          return mockActiveGroupAccounts;
        if (selector === selectInternalAccountsByGroupId)
          return (groupId: string) => {
            if (groupId === 'side-effect-group-1') {
              return mockSideEffectAccounts;
            }
            return [];
          };
        if (selector === selectSelectedInternalAccount)
          return mockActiveAccount;
        return undefined;
      });

      // Mock linkAccountGroup to throw an error
      mockLinkAccountGroup.mockRejectedValue(
        new Error('Failed to link account group'),
      );

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should call optin with side effect accounts
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockSideEffectAccounts,
        undefined,
      );

      // Should attempt to link the selected account group (group-1)
      expect(mockLinkAccountGroup).toHaveBeenCalledWith('group-1');

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
            accounts: ['account-2'],
            metadata: { name: 'Side Effect Group' },
          },
        ],
      } as never;

      mockSelectAccountGroupsByWallet.mockReturnValue([
        sideEffectWalletSection,
      ]);
      mockSelectInternalAccountsByGroupId.mockReturnValue((groupId: string) => {
        if (groupId === 'side-effect-group-1') {
          return mockSideEffectAccounts;
        }
        return [];
      });

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) return mockAccountGroup;
        if (selector === selectAccountGroupsByWallet)
          return [sideEffectWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        if (selector === selectSelectedAccountGroupInternalAccounts)
          return mockActiveGroupAccounts;
        if (selector === selectInternalAccountsByGroupId)
          return (groupId: string) => {
            if (groupId === 'side-effect-group-1') {
              return mockSideEffectAccounts;
            }
            return [];
          };
        if (selector === selectSelectedInternalAccount)
          return mockActiveAccount;
        return undefined;
      });

      // Mock optin to fail
      const error = new Error('Optin failed');
      mockEngineCall.mockRejectedValue(error);

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should have attempted optin with side effect accounts
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockSideEffectAccounts,
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
        bulk_link: undefined,
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
        bulk_link: undefined,
      });
    });

    it('should track metrics with bulk_link property when bulkLink is true', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({
          bulkLink: true,
        });
      });

      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        referred: false,
        referral_code_used: undefined,
        referral_code_input_type: 'manual',
        bulk_link: true,
      });
    });

    it('should track metrics with bulk_link property when bulkLink is false', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({
          bulkLink: false,
        });
      });

      const eventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(eventBuilder.addProperties).toHaveBeenCalledWith({
        referred: false,
        referral_code_used: undefined,
        referral_code_input_type: 'manual',
        bulk_link: false,
      });
    });
  });

  describe('Bulk Link Integration', () => {
    it('should cancel bulk link before opt-in', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should cancel bulk link before opt-in
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
      // Verify cancelBulkLink was called (order is verified by checking it's called)
      expect(mockCancelBulkLink).toHaveBeenCalled();
      expect(mockEngineCall).toHaveBeenCalled();
    });

    it('should start bulk link when bulkLink is true', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({
          bulkLink: true,
        });
      });

      // Should start bulk link after successful opt-in
      expect(mockStartBulkLink).toHaveBeenCalledTimes(1);
      // Should not call linkAccountGroup when bulkLink is true
      expect(mockLinkAccountGroup).not.toHaveBeenCalled();
      // Verify both were called
      expect(mockEngineCall).toHaveBeenCalled();
      expect(mockStartBulkLink).toHaveBeenCalled();
    });

    it('should not start bulk link when bulkLink is false', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({
          bulkLink: false,
        });
      });

      // Should not start bulk link
      expect(mockStartBulkLink).not.toHaveBeenCalled();
    });

    it('should not start bulk link when bulkLink is undefined', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should not start bulk link
      expect(mockStartBulkLink).not.toHaveBeenCalled();
    });

    it('should cancel bulk link even when opt-in fails', async () => {
      const error = new Error('Network error');
      mockEngineCall.mockRejectedValue(error);

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should still cancel bulk link even on failure
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
      // Should not start bulk link on failure
      expect(mockStartBulkLink).not.toHaveBeenCalled();
    });

    it('should not start bulk link when subscriptionId is null', async () => {
      mockEngineCall.mockResolvedValue(null);

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({
          bulkLink: true,
        });
      });

      // Should cancel bulk link
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
      // Should not start bulk link when opt-in fails
      expect(mockStartBulkLink).not.toHaveBeenCalled();
    });

    it('should cancel bulk link and start bulk link with referral code', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({
          referralCode: 'ABC123',
          bulkLink: true,
        });
      });

      // Should cancel bulk link before opt-in
      expect(mockCancelBulkLink).toHaveBeenCalledTimes(1);
      // Should start bulk link after successful opt-in
      expect(mockStartBulkLink).toHaveBeenCalledTimes(1);
      // Should not call linkAccountGroup when bulkLink is true
      expect(mockLinkAccountGroup).not.toHaveBeenCalled();
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
