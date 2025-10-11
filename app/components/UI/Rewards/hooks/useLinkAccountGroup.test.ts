import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { AccountGroupId } from '@metamask/account-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useLinkAccountGroup } from './useLinkAccountGroup';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { OptInStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { deriveAccountMetricProps } from '../utils';
import useRewardsToast from './useRewardsToast';
import { strings } from '../../../../../locales/i18n';
import { selectInternalAccountsByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import { selectAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/accountTreeController';

// Define LinkStatusReport type for testing
interface LinkStatusReport {
  success: boolean;
  byAddress: Record<string, boolean>;
}

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    REWARDS_ACCOUNT_LINKING_STARTED: 'Rewards Account Linking Started',
    REWARDS_ACCOUNT_LINKING_COMPLETED: 'Rewards Account Linking Completed',
    REWARDS_ACCOUNT_LINKING_FAILED: 'Rewards Account Linking Failed',
  },
  useMetrics: jest.fn(),
}));

jest.mock('../utils', () => ({
  deriveAccountMetricProps: jest.fn(),
}));

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, string>) => {
    if (key === 'rewards.link_account_group.link_account_success') {
      return `Successfully linked ${params?.accountName || 'Account'}`;
    }
    if (key === 'rewards.link_account_group.link_account_error') {
      return `Failed to link ${params?.accountName || 'Account'}`;
    }
    return key;
  }),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectInternalAccountsByGroupId: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountGroupsByWallet: jest.fn(),
  }),
);

describe('useLinkAccountGroup', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockLogger = Logger.log as jest.MockedFunction<typeof Logger.log>;
  const mockUseMetrics = jest.mocked(useMetrics);
  const mockDeriveAccountMetricProps = jest.mocked(deriveAccountMetricProps);
  const mockUseRewardsToast = jest.mocked(useRewardsToast);
  const mockStrings = jest.mocked(strings);

  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn().mockReturnValue({
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      event: expect.any(String),
      properties: expect.any(Object),
    }),
  });

  const mockShowToast = jest.fn();
  const mockRewardsToastOptions = {
    success: jest.fn().mockReturnValue({
      variant: 'icon',
      iconName: 'confirmation',
      hapticsType: 'success',
    }),
    error: jest.fn().mockReturnValue({
      variant: 'icon',
      iconName: 'error',
      hapticsType: 'error',
    }),
  };

  // Mock account data
  const mockAccountGroupId: AccountGroupId = 'group-1' as AccountGroupId;
  const mockAccount1: InternalAccount = {
    id: 'account-1',
    address: '0x1234567890123456789012345678901234567890',
    name: 'Test Account 1',
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
    options: {},
    methods: [],
    metadata: {
      name: 'Test Account 1',
      keyring: { type: 'HD Key Tree' },
      importTime: Date.now(),
    },
  } as InternalAccount;

  const mockAccount2: InternalAccount = {
    id: 'account-2',
    address: '0x9876543210987654321098765432109876543210',
    name: 'Test Account 2',
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
    options: {},
    methods: [],
    metadata: {
      name: 'Test Account 2',
      keyring: { type: 'HD Key Tree' },
      importTime: Date.now(),
    },
  } as InternalAccount;

  const mockAccountGroup = {
    id: mockAccountGroupId,
    metadata: { name: 'Test Account Group' },
  };

  const mockWalletSection = {
    title: 'Test Wallet',
    wallet: { id: 'wallet-1', name: 'Test Wallet' },
    data: [mockAccountGroup],
  };

  const mockGetAccountsByGroupId = jest.fn();
  const mockAccountGroupsByWallet = [mockWalletSection];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default selector mocks
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectInternalAccountsByGroupId) {
        return mockGetAccountsByGroupId;
      }
      if (selector === selectAccountGroupsByWallet) {
        return mockAccountGroupsByWallet;
      }
      return undefined;
    });

    // Setup useMetrics mock
    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as never);

    // Setup useRewardsToast mock
    mockUseRewardsToast.mockReturnValue({
      showToast: mockShowToast,
      RewardsToastOptions: mockRewardsToastOptions,
    });

    // Setup deriveAccountMetricProps mock
    mockDeriveAccountMetricProps.mockReturnValue({
      scope: 'evm',
      account_type: 'HD Key Tree',
    });

    // Setup default Engine call responses
    mockEngineCall.mockResolvedValue(undefined);
  });

  describe('Basic functionality', () => {
    it('should return hook interface', () => {
      const { result } = renderHook(() => useLinkAccountGroup());

      expect(result.current).toEqual({
        linkAccountGroup: expect.any(Function),
        isLoading: false,
        isError: false,
      });
    });

    it('should return hook interface with showToasts parameter', () => {
      const { result } = renderHook(() => useLinkAccountGroup(false));

      expect(result.current).toEqual({
        linkAccountGroup: expect.any(Function),
        isLoading: false,
        isError: false,
      });
    });
  });

  describe('Successful account group linking', () => {
    beforeEach(() => {
      mockGetAccountsByGroupId.mockReturnValue([mockAccount1, mockAccount2]);
    });

    it('should successfully link all accounts when none are already opted in', async () => {
      const mockOptInResponse: OptInStatusDto = {
        ois: [false, false], // No accounts opted in
        sids: [null, null],
      };

      const mockLinkResults = [
        { account: mockAccount1, success: true },
        { account: mockAccount2, success: true },
      ];

      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse) // getOptInStatus
        .mockResolvedValueOnce(mockLinkResults); // linkAccountsToSubscriptionCandidate

      const { result } = renderHook(() => useLinkAccountGroup());

      let linkResult: LinkStatusReport = { success: false, byAddress: {} };
      await act(async () => {
        linkResult = await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(linkResult).toEqual({
        success: true,
        byAddress: {
          [mockAccount1.address]: true,
          [mockAccount2.address]: true,
        },
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getOptInStatus',
        { addresses: [mockAccount1.address, mockAccount2.address] },
      );

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:linkAccountsToSubscriptionCandidate',
        [mockAccount1, mockAccount2],
      );

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'icon',
          iconName: 'confirmation',
        }),
      );

      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.link_account_group.link_account_success',
        { accountName: 'Test Account Group' },
      );
    });

    it('should handle partial success when some accounts fail to link', async () => {
      const mockOptInResponse: OptInStatusDto = {
        ois: [false, false],
        sids: [null, null],
      };

      const mockLinkResults = [
        { account: mockAccount1, success: true },
        { account: mockAccount2, success: false },
      ];

      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse) // getOptInStatus
        .mockResolvedValueOnce(mockLinkResults); // linkAccountsToSubscriptionCandidate

      const { result } = renderHook(() => useLinkAccountGroup());

      let linkResult: LinkStatusReport = { success: false, byAddress: {} };
      await act(async () => {
        linkResult = await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(linkResult).toEqual({
        success: false,
        byAddress: {
          [mockAccount1.address]: true,
          [mockAccount2.address]: false,
        },
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'icon',
          iconName: 'error',
        }),
      );

      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.link_account_group.link_account_error',
        { accountName: 'Test Account Group' },
      );
    });

    it('should handle mixed opt-in status correctly', async () => {
      const mockOptInResponse: OptInStatusDto = {
        ois: [true, false], // First account opted in, second not
        sids: ['sid-1', null],
      };

      const mockLinkResults = [{ account: mockAccount2, success: true }];

      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse) // getOptInStatus
        .mockResolvedValueOnce(mockLinkResults); // linkAccountsToSubscriptionCandidate

      const { result } = renderHook(() => useLinkAccountGroup());

      let linkResult: LinkStatusReport = { success: false, byAddress: {} };
      await act(async () => {
        linkResult = await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(linkResult).toEqual({
        success: true,
        byAddress: {
          [mockAccount1.address]: true, // Already opted in
          [mockAccount2.address]: true, // Successfully linked
        },
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:linkAccountsToSubscriptionCandidate',
        [mockAccount2], // Only the non-opted-in account
      );
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      mockGetAccountsByGroupId.mockReturnValue([mockAccount1, mockAccount2]);
    });

    it('should handle empty account group', async () => {
      mockGetAccountsByGroupId.mockReturnValue([]);

      const { result } = renderHook(() => useLinkAccountGroup());

      let linkResult: LinkStatusReport = { success: false, byAddress: {} };
      await act(async () => {
        linkResult = await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(linkResult).toEqual({
        success: false,
        byAddress: {},
      });

      expect(result.current.isError).toBe(true);
      expect(mockEngineCall).not.toHaveBeenCalled();
    });

    it('should handle getOptInStatus failure', async () => {
      const error = new Error('Network error');
      mockEngineCall.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLinkAccountGroup());

      let linkResult: LinkStatusReport = { success: false, byAddress: {} };
      await act(async () => {
        linkResult = await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(linkResult).toEqual({
        success: false,
        byAddress: {
          [mockAccount1.address]: false,
          [mockAccount2.address]: false,
        },
      });

      expect(result.current.isError).toBe(true);
      expect(mockLogger).toHaveBeenCalledWith(
        'useLinkAccountGroup: Failed to link account group',
        error,
      );

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'icon',
          iconName: 'error',
        }),
      );
    });

    it('should handle linkAccountsToSubscriptionCandidate failure', async () => {
      const mockOptInResponse: OptInStatusDto = {
        ois: [false, false],
        sids: [null, null],
      };

      const error = new Error('Linking failed');
      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse) // getOptInStatus
        .mockRejectedValueOnce(error); // linkAccountsToSubscriptionCandidate

      const { result } = renderHook(() => useLinkAccountGroup());

      let linkResult: LinkStatusReport = { success: false, byAddress: {} };
      await act(async () => {
        linkResult = await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(linkResult).toEqual({
        success: false,
        byAddress: {
          [mockAccount1.address]: false,
          [mockAccount2.address]: false,
        },
      });

      expect(result.current.isError).toBe(true);
      expect(mockLogger).toHaveBeenCalledWith(
        'useLinkAccountGroup: Failed to link accounts',
        error,
      );

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'icon',
          iconName: 'error',
        }),
      );
    });

    it('should handle missing account group', async () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return mockGetAccountsByGroupId;
        }
        if (selector === selectAccountGroupsByWallet) {
          return []; // No account groups
        }
        return undefined;
      });

      const { result } = renderHook(() => useLinkAccountGroup());

      let linkResult: LinkStatusReport = { success: false, byAddress: {} };
      await act(async () => {
        linkResult = await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(linkResult).toEqual({
        success: false,
        byAddress: {
          [mockAccount1.address]: false,
          [mockAccount2.address]: false,
        },
      });

      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.link_account_group.link_account_error',
        { accountName: 'Account' }, // Fallback name
      );
    });
  });

  describe('Loading state management', () => {
    beforeEach(() => {
      mockGetAccountsByGroupId.mockReturnValue([mockAccount1]);
    });

    it('should manage loading state correctly', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<OptInStatusDto>((resolve) => {
        resolvePromise = () => resolve({ ois: [false], sids: [null] });
      });

      mockEngineCall.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useLinkAccountGroup());

      expect(result.current.isLoading).toBe(false);

      // Start the linking process
      act(() => {
        result.current.linkAccountGroup(mockAccountGroupId);
      });

      // Loading should be true during operation
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise();
        await promise;
      });

      // Loading should be false after completion
      expect(result.current.isLoading).toBe(false);
    });

    it('should reset loading state on error', async () => {
      const error = new Error('Test error');
      mockEngineCall.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLinkAccountGroup());

      await act(async () => {
        await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(true);
    });
  });

  describe('Metrics event tracking', () => {
    beforeEach(() => {
      mockGetAccountsByGroupId.mockReturnValue([mockAccount1, mockAccount2]);
    });

    it('should track started events for all accounts to be linked', async () => {
      const mockOptInResponse: OptInStatusDto = {
        ois: [false, false],
        sids: [null, null],
      };

      const mockLinkResults = [
        { account: mockAccount1, success: true },
        { account: mockAccount2, success: true },
      ];

      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse)
        .mockResolvedValueOnce(mockLinkResults);

      const { result } = renderHook(() => useLinkAccountGroup());

      await act(async () => {
        await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_STARTED,
      );
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_COMPLETED,
      );

      expect(mockDeriveAccountMetricProps).toHaveBeenCalledWith(mockAccount1);
      expect(mockDeriveAccountMetricProps).toHaveBeenCalledWith(mockAccount2);

      expect(mockTrackEvent).toHaveBeenCalledTimes(4); // 2 started + 2 completed
    });

    it('should track failure events for failed accounts', async () => {
      const mockOptInResponse: OptInStatusDto = {
        ois: [false, false],
        sids: [null, null],
      };

      const mockLinkResults = [
        { account: mockAccount1, success: true },
        { account: mockAccount2, success: false },
      ];

      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse)
        .mockResolvedValueOnce(mockLinkResults);

      const { result } = renderHook(() => useLinkAccountGroup());

      await act(async () => {
        await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(4); // 2 started + 1 completed + 1 failed
    });

    it('should track failure events when linking throws error', async () => {
      const mockOptInResponse: OptInStatusDto = {
        ois: [false, false],
        sids: [null, null],
      };

      const error = new Error('Linking failed');
      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse)
        .mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLinkAccountGroup());

      await act(async () => {
        await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(4); // 2 started + 2 failed
    });
  });

  describe('Toast behavior', () => {
    beforeEach(() => {
      mockGetAccountsByGroupId.mockReturnValue([mockAccount1]);
    });

    it('should show toasts when showToasts is true (default)', async () => {
      const mockOptInResponse: OptInStatusDto = { ois: [false], sids: [null] };
      const mockLinkResults = [{ account: mockAccount1, success: true }];

      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse)
        .mockResolvedValueOnce(mockLinkResults);

      const { result } = renderHook(() => useLinkAccountGroup());

      await act(async () => {
        await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('should not show toasts when showToasts is false', async () => {
      const mockOptInResponse: OptInStatusDto = { ois: [false], sids: [null] };
      const mockLinkResults = [{ account: mockAccount1, success: true }];

      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse)
        .mockResolvedValueOnce(mockLinkResults);

      const { result } = renderHook(() => useLinkAccountGroup(false));

      await act(async () => {
        await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should not show toasts on error when showToasts is false', async () => {
      const error = new Error('Test error');
      mockEngineCall.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useLinkAccountGroup(false));

      await act(async () => {
        await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle single account group', async () => {
      mockGetAccountsByGroupId.mockReturnValue([mockAccount1]);

      const mockOptInResponse: OptInStatusDto = { ois: [false], sids: [null] };
      const mockLinkResults = [{ account: mockAccount1, success: true }];

      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse)
        .mockResolvedValueOnce(mockLinkResults);

      const { result } = renderHook(() => useLinkAccountGroup());

      let linkResult: LinkStatusReport = { success: false, byAddress: {} };
      await act(async () => {
        linkResult = await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(linkResult).toEqual({
        success: true,
        byAddress: {
          [mockAccount1.address]: true,
        },
      });
    });

    it('should handle account group with no metadata name', async () => {
      const accountGroupWithoutName = {
        id: mockAccountGroupId,
        metadata: {},
      };

      const walletSectionWithoutName = {
        title: 'Test Wallet',
        wallet: { id: 'wallet-1', name: 'Test Wallet' },
        data: [accountGroupWithoutName],
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return mockGetAccountsByGroupId;
        }
        if (selector === selectAccountGroupsByWallet) {
          return [walletSectionWithoutName];
        }
        return undefined;
      });

      mockGetAccountsByGroupId.mockReturnValue([mockAccount1]);

      const mockOptInResponse: OptInStatusDto = { ois: [false], sids: [null] };
      const mockLinkResults = [{ account: mockAccount1, success: true }];

      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse)
        .mockResolvedValueOnce(mockLinkResults);

      const { result } = renderHook(() => useLinkAccountGroup());

      await act(async () => {
        await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.link_account_group.link_account_success',
        { accountName: 'Account' }, // Fallback name
      );
    });

    it('should handle concurrent linking attempts', async () => {
      mockGetAccountsByGroupId.mockReturnValue([mockAccount1]);

      let resolveFirst: () => void;
      let resolveSecond: () => void;

      const firstPromise = new Promise<OptInStatusDto>((resolve) => {
        resolveFirst = () => resolve({ ois: [false], sids: [null] });
      });
      const secondPromise = new Promise<OptInStatusDto>((resolve) => {
        resolveSecond = () => resolve({ ois: [false], sids: [null] });
      });

      mockEngineCall
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise)
        .mockResolvedValueOnce([{ account: mockAccount1, success: true }])
        .mockResolvedValueOnce([{ account: mockAccount1, success: true }]);

      const { result } = renderHook(() => useLinkAccountGroup());

      // Start first linking
      act(() => {
        result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(result.current.isLoading).toBe(true);

      // Start second linking while first is pending
      act(() => {
        result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(result.current.isLoading).toBe(true);

      // Resolve both promises
      await act(async () => {
        resolveFirst();
        resolveSecond();
        await Promise.all([firstPromise, secondPromise]);
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockEngineCall).toHaveBeenCalledTimes(4); // 2 getOptInStatus + 2 linkAccounts
    });
  });

  describe('Account group finding logic', () => {
    it('should find account group in nested wallet structure', async () => {
      const nestedWalletSection = {
        title: 'Nested Wallet',
        wallet: { id: 'wallet-2', name: 'Nested Wallet' },
        data: [
          {
            id: 'group-2',
            metadata: { name: 'Nested Group' },
          },
          mockAccountGroup,
        ],
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return mockGetAccountsByGroupId;
        }
        if (selector === selectAccountGroupsByWallet) {
          return [mockWalletSection, nestedWalletSection];
        }
        return undefined;
      });

      mockGetAccountsByGroupId.mockReturnValue([mockAccount1]);

      const mockOptInResponse: OptInStatusDto = { ois: [false], sids: [null] };
      const mockLinkResults = [{ account: mockAccount1, success: true }];

      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse)
        .mockResolvedValueOnce(mockLinkResults);

      const { result } = renderHook(() => useLinkAccountGroup());

      await act(async () => {
        await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.link_account_group.link_account_success',
        { accountName: 'Test Account Group' },
      );
    });

    it('should handle account group not found in any wallet', async () => {
      const differentAccountGroup = {
        id: 'different-group',
        metadata: { name: 'Different Group' },
      };

      const walletSectionWithDifferentGroup = {
        title: 'Test Wallet',
        wallet: { id: 'wallet-1', name: 'Test Wallet' },
        data: [differentAccountGroup],
      };

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return mockGetAccountsByGroupId;
        }
        if (selector === selectAccountGroupsByWallet) {
          return [walletSectionWithDifferentGroup];
        }
        return undefined;
      });

      mockGetAccountsByGroupId.mockReturnValue([mockAccount1]);

      const mockOptInResponse: OptInStatusDto = { ois: [false], sids: [null] };
      const mockLinkResults = [{ account: mockAccount1, success: true }];

      mockEngineCall
        .mockResolvedValueOnce(mockOptInResponse)
        .mockResolvedValueOnce(mockLinkResults);

      const { result } = renderHook(() => useLinkAccountGroup());

      await act(async () => {
        await result.current.linkAccountGroup(mockAccountGroupId);
      });

      expect(mockStrings).toHaveBeenCalledWith(
        'rewards.link_account_group.link_account_success',
        { accountName: 'Account' }, // Fallback name when group not found
      );
    });
  });
});
