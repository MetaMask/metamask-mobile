import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import useOptin from './useOptIn';
import Engine from '../../../../core/Engine';
import { setCandidateSubscriptionId } from '../../../../reducers/rewards';
import { useMetrics } from '../../../hooks/useMetrics';
import { selectInternalAccountsById } from '../../../../selectors/accountsController';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import {
  selectAccountGroupsByWallet,
  selectWalletByAccount,
} from '../../../../selectors/multichainAccounts/accountTreeController';
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

jest.mock('../../../../selectors/accountsController', () => ({
  selectInternalAccountsById: jest.fn(),
  selectSelectedInternalAccount: jest.fn(),
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
  const mockSelectInternalAccountsById = jest.mocked(
    selectInternalAccountsById,
  );
  const mockSelectMultichainAccountsState2Enabled = jest.mocked(
    selectMultichainAccountsState2Enabled,
  );
  const mockSelectAccountGroupsByWallet = jest.mocked(
    selectAccountGroupsByWallet,
  );
  const mockSelectWalletByAccount = jest.mocked(selectWalletByAccount);

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
  const mockAccount: InternalAccount = {
    id: 'account-1',
    address: '0x123',
    name: 'Test Account',
  } as never;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockSideEffectAccount: InternalAccount = {
    id: 'side-effect-account-id',
    address: '0x456',
    name: 'Side Effect Account',
  } as never;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockWalletSection = {
    title: 'Test Wallet',
    wallet: { id: 'wallet-1', name: 'Test Wallet' },
    data: [
      {
        type: 'single' as const,
        id: 'group-1',
        accounts: ['side-effect-account-id'],
        metadata: { name: 'Group 1' },
      },
    ],
  } as never;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockInternalAccountsById = {
    'side-effect-account-id': mockSideEffectAccount,
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Reset mock event builder functions
    mockCreateEventBuilder.mockClear();
    mockTrackEvent.mockClear();
    mockAddTraitsToUser.mockClear();

    // Setup default selector values
    mockSelectInternalAccountsById.mockReturnValue(mockInternalAccountsById);
    mockSelectMultichainAccountsState2Enabled.mockReturnValue(false);
    mockSelectAccountGroupsByWallet.mockReturnValue([mockWalletSection]);
    mockSelectWalletByAccount.mockReturnValue(
      (_accountId: string) => mockWallet,
    );

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsById)
        return mockInternalAccountsById;
      if (selector === selectMultichainAccountsState2Enabled) return false;
      if (selector === selectAccountGroupsByWallet) return [mockWalletSection];
      if (selector === selectWalletByAccount)
        return (_accountId: string) => mockWallet;
      return mockAccount; // Default for selectSelectedInternalAccount
    });

    // Setup useMetrics mock
    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
      addTraitsToUser: mockAddTraitsToUser,
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
        mockAccount,
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
        mockAccount,
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

    it('should skip optin when no account is selected', async () => {
      mockUseSelector.mockImplementation(() => null);

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
        if (selector === selectInternalAccountsById)
          return mockInternalAccountsById;
        if (selector === selectMultichainAccountsState2Enabled) return true;
        if (selector === selectAccountGroupsByWallet)
          return [mockWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockAccount; // Default for selectSelectedInternalAccount
      });
    });

    it('should link side effect account when multichain accounts is enabled', async () => {
      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should call optin first
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockAccount,
        undefined,
      );

      // Then should link the side effect account
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:linkAccountToSubscriptionCandidate',
        mockSideEffectAccount,
      );
    });

    it('should not link side effect account when it is the same as current account', async () => {
      // Mock side effect account with same address as current account
      const sameAccountSideEffect = {
        ...(mockSideEffectAccount as { address: string }),
        id: mockAccount.address as string,
      };

      mockSelectInternalAccountsById.mockReturnValue({
        'side-effect-account-id': sameAccountSideEffect as never,
      });

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectInternalAccountsById)
          return {
            'side-effect-account-id': sameAccountSideEffect,
          };
        if (selector === selectMultichainAccountsState2Enabled) return true;
        if (selector === selectAccountGroupsByWallet)
          return [mockWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockAccount; // Default for selectSelectedInternalAccount
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should only call optin, not link account
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockAccount,
        undefined,
      );
    });

    it('should handle case when side effect account is not found in internal accounts', async () => {
      mockSelectInternalAccountsById.mockReturnValue({});

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectInternalAccountsById) return {};
        if (selector === selectMultichainAccountsState2Enabled) return true;
        if (selector === selectAccountGroupsByWallet)
          return [mockWalletSection];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockAccount; // Default for selectSelectedInternalAccount
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should only call optin, not link account
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockAccount,
        undefined,
      );
    });

    it('should handle case when wallet section is not found', async () => {
      mockSelectAccountGroupsByWallet.mockReturnValue([]);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectInternalAccountsById)
          return mockInternalAccountsById;
        if (selector === selectMultichainAccountsState2Enabled) return true;
        if (selector === selectAccountGroupsByWallet) return [];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockAccount; // Default for selectSelectedInternalAccount
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should only call optin, not link account
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockAccount,
        undefined,
      );
    });

    it('should handle case when current account is not found', async () => {
      mockSelectAccountGroupsByWallet.mockReturnValue([
        {
          title: 'Different Wallet',
          wallet: { id: 'keyring:different', name: 'Different Wallet' },
          data: [
            {
              type: 'single' as const,
              id: 'group-different',
              accounts: ['side-effect-account-id'],
              metadata: { name: 'Different Group' },
            },
          ],
        },
      ] as never);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectInternalAccountsById)
          return mockInternalAccountsById;
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
                  accounts: ['side-effect-account-id'],
                  metadata: { name: 'Different Group' },
                },
              ],
            },
          ];
        if (selector === selectWalletByAccount)
          return (_accountId: string) => mockWallet;
        return mockAccount; // Default for selectSelectedInternalAccount
      });

      const { result } = renderHook(() => useOptin());

      await act(async () => {
        await result.current.optin({});
      });

      // Should only call optin, not link account
      expect(mockEngineCall).toHaveBeenCalledTimes(1);
      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:optIn',
        mockAccount,
        undefined,
      );
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
