import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  useRewardDashboardModals,
  RewardsDashboardModalType,
} from './useRewardDashboardModals';
import Routes from '../../../../constants/navigation/Routes';
import { useLinkAccountGroup } from './useLinkAccountGroup';
import { isHardwareAccount } from '../../../../util/address';
import { selectInternalAccountsByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectBulkLinkIsRunning } from '../../../../reducers/rewards/selectors';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../actions/rewards', () => ({
  setHideUnlinkedAccountsBanner: jest.fn((value) => ({
    type: 'SET_HIDE_UNLINKED_ACCOUNTS_BANNER',
    payload: value,
  })),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setHideCurrentAccountNotOptedInBanner: jest.fn((payload) => ({
    type: 'SET_HIDE_CURRENT_ACCOUNT_NOT_OPTED_IN_BANNER',
    payload,
  })),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectBulkLinkIsRunning: jest.fn(),
}));

jest.mock('./useLinkAccountGroup', () => ({
  useLinkAccountGroup: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'rewards.dashboard_modal_info.multiple_unlinked_accounts.title':
        "Don't miss out",
      'rewards.dashboard_modal_info.multiple_unlinked_accounts.description':
        'Add your accounts to Rewards.',
      'rewards.dashboard_modal_info.multiple_unlinked_accounts.confirm':
        'Add accounts',
      'rewards.dashboard_modal_info.active_account.title': "Don't miss out",
      'rewards.dashboard_modal_info.active_account.description':
        'Add your account to Rewards.',
      'rewards.dashboard_modal_info.active_account.confirm': 'Add account',
      'rewards.dashboard_modal_info.account_not_supported.title':
        'Account not supported',
      'rewards.dashboard_modal_info.account_not_supported.description_hardware':
        'Hardware wallets are not supported',
      'rewards.dashboard_modal_info.account_not_supported.description_general':
        'This account type is not supported',
      'rewards.dashboard_modal_info.account_not_supported.confirm': 'OK',
      'rewards.link_account_group.linking_account': 'Linking...',
      'rewards.link_account_group.link_account': 'Link Account',
      'confirmation_modal.confirm_cta': 'OK',
      'drawer.cancel': 'Cancel',
    };
    return mockStrings[key] || key;
  }),
}));

jest.mock('../utils', () => ({
  convertInternalAccountToCaipAccountId: jest.fn(
    (account) => `eip155:1:${account.id}`,
  ),
}));

jest.mock('../../../../util/address', () => ({
  isHardwareAccount: jest.fn(),
}));

describe('useRewardDashboardModals', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockDispatch = jest.fn();
  const mockLinkAccountGroup = jest.fn();
  const mockSelectedAccountGroup = {
    id: 'test-account-group-id',
    metadata: {
      name: 'Test Account Group',
    },
  };
  const mockAccounts = [
    {
      id: '0x123',
      address: '0x123',
      metadata: {
        keyring: {
          type: 'HD Key Tree',
        },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    });
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    // Mock both selectors that are used in the hook
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectInternalAccountsByGroupId) {
        return (_groupId: string) => mockAccounts;
      }
      if (selector === selectSelectedAccountGroup) {
        return mockSelectedAccountGroup;
      }
      if (selector === selectBulkLinkIsRunning) {
        return false; // Default to not running
      }
      return mockSelectedAccountGroup; // fallback
    });
    (useLinkAccountGroup as jest.Mock).mockReturnValue({
      linkAccountGroup: mockLinkAccountGroup,
      isLoading: false,
    });
  });

  describe('showUnlinkedAccountsModal', () => {
    it('navigates to modal with correct parameters for unlinked accounts', () => {
      // Arrange
      // Reset session tracker to ensure modal can be shown
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act
      act(() => {
        result.current.showUnlinkedAccountsModal();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title: "Don't miss out",
          description: 'Add your accounts to Rewards.',
          customIcon: expect.any(Object),
          confirmAction: {
            label: 'Add accounts',
            onPress: expect.any(Function),
            variant: 'Primary',
          },
          onCancel: expect.any(Function),
          cancelMode: 'top-right-cross-icon',
          showCancelButton: true,
          type: 'confirmation',
        },
      );
    });

    it('does not show modal when already shown in session', () => {
      // Arrange
      const { result } = renderHook(() => useRewardDashboardModals());

      // Act - show modal first time
      act(() => {
        result.current.showUnlinkedAccountsModal();
      });
      mockNavigate.mockClear();

      // Act - try to show modal again
      act(() => {
        result.current.showUnlinkedAccountsModal();
      });

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not show modal when no selected account group', () => {
      // Arrange
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        if (selector === selectSelectedAccountGroup) {
          return null;
        }
        if (selector === selectBulkLinkIsRunning) {
          return false;
        }
        return null;
      });

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act
      act(() => {
        result.current.showUnlinkedAccountsModal();
      });

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles confirm action correctly', () => {
      // Arrange
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      act(() => {
        result.current.showUnlinkedAccountsModal();
      });

      const modalCall = mockNavigate.mock.calls[0][1];
      const confirmOnPress = modalCall.confirmAction.onPress;
      mockNavigate.mockClear();

      // Act
      act(() => {
        confirmOnPress();
      });

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_HIDE_UNLINKED_ACCOUNTS_BANNER',
        payload: true,
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_SETTINGS_VIEW);
    });

    it('handles cancel action correctly', () => {
      // Arrange
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      act(() => {
        result.current.showUnlinkedAccountsModal();
      });

      const modalCall = mockNavigate.mock.calls[0][1];
      const onCancel = modalCall.onCancel;
      mockNavigate.mockClear();

      // Act
      act(() => {
        onCancel();
      });

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_HIDE_UNLINKED_ACCOUNTS_BANNER',
        payload: true,
      });
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
    });

    it('does not show modal when bulk link is running', () => {
      // Arrange
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        if (selector === selectSelectedAccountGroup) {
          return mockSelectedAccountGroup;
        }
        if (selector === selectBulkLinkIsRunning) {
          return true; // Bulk link is running
        }
        return mockSelectedAccountGroup;
      });

      // Reset session tracker to ensure modal can be shown
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act
      act(() => {
        result.current.showUnlinkedAccountsModal();
      });

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows modal when bulk link is not running', () => {
      // Arrange
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        if (selector === selectSelectedAccountGroup) {
          return mockSelectedAccountGroup;
        }
        if (selector === selectBulkLinkIsRunning) {
          return false; // Bulk link is not running
        }
        return mockSelectedAccountGroup;
      });

      // Reset session tracker to ensure modal can be shown
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act
      act(() => {
        result.current.showUnlinkedAccountsModal();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          title: 'Start earning rewards',
        }),
      );
    });
  });

  describe('showNotOptedInModal', () => {
    it('navigates to modal with correct parameters for not opted in account', () => {
      // Arrange
      // Reset session tracker to ensure modal can be shown
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act
      act(() => {
        result.current.showNotOptedInModal();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        {
          title: "Don't miss out",
          description: 'Add your account to Rewards.',
          customIcon: expect.any(Object),
          confirmAction: {
            label: 'Add account',
            loadOnPress: true,
            onPress: expect.any(Function),
            variant: 'Primary',
          },
          cancelMode: 'top-right-cross-icon',
          showCancelButton: true,
          type: 'confirmation',
        },
      );
    });

    it('shows linking state when account is linking', () => {
      // Arrange
      (useLinkAccountGroup as jest.Mock).mockReturnValue({
        linkAccountGroup: mockLinkAccountGroup,
        isLoading: true,
      });

      // Reset session tracker to ensure modal can be shown
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act
      act(() => {
        result.current.showNotOptedInModal();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      const modalCall = mockNavigate.mock.calls[0][1];
      expect(modalCall.confirmAction.loadOnPress).toBe(true);
    });

    it('calls linkAccountGroup when confirm is pressed and not currently linking', async () => {
      // Arrange
      mockLinkAccountGroup.mockResolvedValue({ success: true, byAddress: {} });
      (useLinkAccountGroup as jest.Mock).mockReturnValue({
        linkAccountGroup: mockLinkAccountGroup,
        isLoading: false,
      });

      // Reset session tracker to ensure modal can be shown
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      act(() => {
        result.current.showNotOptedInModal();
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      const modalCall = mockNavigate.mock.calls[0][1];
      const onPress = modalCall.confirmAction.onPress;
      mockNavigate.mockClear();

      // Act
      await act(async () => {
        await onPress();
      });

      // Assert
      expect(mockLinkAccountGroup).toHaveBeenCalledWith(
        mockSelectedAccountGroup.id,
      );
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_HIDE_CURRENT_ACCOUNT_NOT_OPTED_IN_BANNER',
        payload: { accountGroupId: mockSelectedAccountGroup.id, hide: true },
      });
    });

    it('does not link account when already linking', async () => {
      // Arrange
      (useLinkAccountGroup as jest.Mock).mockReturnValue({
        linkAccountGroup: mockLinkAccountGroup,
        isLoading: true,
      });

      // Reset session tracker to ensure modal can be shown
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      act(() => {
        result.current.showNotOptedInModal();
      });

      const modalCall = mockNavigate.mock.calls[0][1];
      const onPress = modalCall.confirmAction.onPress;

      // Act
      await act(async () => {
        await onPress();
      });

      // Assert
      expect(mockLinkAccountGroup).not.toHaveBeenCalled();
    });

    it('does not show modal when no selected account group', () => {
      // Arrange
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        if (selector === selectSelectedAccountGroup) {
          return null;
        }
        return null;
      });

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act
      act(() => {
        result.current.showNotOptedInModal();
      });

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('showNotSupportedModal', () => {
    beforeEach(() => {
      (isHardwareAccount as jest.Mock).mockReturnValue(false);
    });

    it('shows general description for non-hardware wallet', () => {
      // Arrange
      const nonHardwareAccounts = [
        {
          id: '0x123',
          address: '0x123',
          metadata: {
            keyring: {
              type: 'HD Key Tree',
            },
          },
        },
      ];

      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => nonHardwareAccounts;
        }
        if (selector === selectSelectedAccountGroup) {
          return mockSelectedAccountGroup;
        }
        return mockSelectedAccountGroup;
      });
      (isHardwareAccount as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act
      act(() => {
        result.current.showNotSupportedModal();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          title: 'Account not supported',
          description: 'This account type is not supported',
          type: 'confirmation',
          customIcon: expect.any(Object),
          confirmAction: {
            label: 'OK',
            onPress: expect.any(Function),
            variant: 'Primary',
          },
          showCancelButton: true,
          cancelMode: 'top-right-cross-icon',
        }),
      );
    });

    it('shows hardware wallet specific description for hardware wallets', () => {
      // Arrange
      const hardwareAccounts = [
        {
          id: '0x456',
          address: '0x456',
          metadata: {
            keyring: {
              type: 'Hardware',
            },
          },
        },
      ];

      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => hardwareAccounts;
        }
        if (selector === selectSelectedAccountGroup) {
          return mockSelectedAccountGroup;
        }
        return mockSelectedAccountGroup;
      });
      (isHardwareAccount as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act
      act(() => {
        result.current.showNotSupportedModal();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        expect.objectContaining({
          title: 'Account not supported',
          description: 'Hardware wallets are not supported',
          type: 'confirmation',
          customIcon: expect.any(Object),
          confirmAction: {
            label: 'OK',
            onPress: expect.any(Function),
            variant: 'Primary',
          },
          showCancelButton: true,
          cancelMode: 'top-right-cross-icon',
        }),
      );
    });

    it('does not show modal when no selected account group', () => {
      // Arrange
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        if (selector === selectSelectedAccountGroup) {
          return null;
        }
        return null;
      });

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act
      act(() => {
        result.current.showNotSupportedModal();
      });

      // Assert
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to wallet view when confirm button is pressed', () => {
      // Arrange
      const { result } = renderHook(() => useRewardDashboardModals());

      act(() => {
        result.current.showNotSupportedModal();
      });

      const modalCall = mockNavigate.mock.calls[0][1];
      const confirmOnPress = modalCall.confirmAction.onPress;
      mockNavigate.mockClear();

      // Act
      act(() => {
        confirmOnPress();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });
  });

  describe('hasShownModal', () => {
    it('returns false when no selected account group', () => {
      // Arrange
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        if (selector === selectSelectedAccountGroup) {
          return null;
        }
        return null;
      });

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act & Assert
      expect(
        result.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(false);
    });

    it('returns true after modal has been shown', () => {
      // Arrange
      const { result } = renderHook(() => useRewardDashboardModals());

      // Act - show modal
      act(() => {
        result.current.showNotOptedInModal();
      });

      // Assert
      expect(
        result.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(true);
    });
  });

  describe('tracking key fallback behavior', () => {
    it('falls back to "unknown" when accountGroupId is null', () => {
      // Arrange
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) {
          return null; // no account group
        }
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        return null;
      });

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act - should not show modal without account group
      act(() => {
        result.current.showNotOptedInModal();
      });

      // Assert - modal should not show without account group
      expect(mockNavigate).not.toHaveBeenCalled();

      // But hasShownModal should still work with "unknown" key
      expect(
        result.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(false);
    });
  });

  describe('resetSessionTracking', () => {
    it('allows modals to be shown again after reset', () => {
      // Arrange
      const { result } = renderHook(() => useRewardDashboardModals());

      // Act - show modal, then reset, then show again
      act(() => {
        result.current.showUnlinkedAccountsModal();
      });
      mockNavigate.mockClear();

      act(() => {
        result.current.resetSessionTracking();
      });

      act(() => {
        result.current.showUnlinkedAccountsModal();
      });

      // Assert - modal should be shown again
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetAllSessionTracking', () => {
    it('clears all session tracking and allows all modals to be shown again', () => {
      // Arrange
      const { result } = renderHook(() => useRewardDashboardModals());

      // Act - show multiple different modals to populate session tracking
      act(() => {
        result.current.showUnlinkedAccountsModal();
      });
      act(() => {
        result.current.showNotOptedInModal();
      });
      act(() => {
        result.current.showNotSupportedModal();
      });

      mockNavigate.mockClear();

      // Verify modals are tracked and won't show again
      act(() => {
        result.current.showUnlinkedAccountsModal();
      });
      act(() => {
        result.current.showNotOptedInModal();
      });

      expect(mockNavigate).not.toHaveBeenCalled();

      // Act - reset all session tracking
      act(() => {
        result.current.resetAllSessionTracking();
      });

      // Try to show modals again after reset
      act(() => {
        result.current.showUnlinkedAccountsModal();
      });
      act(() => {
        result.current.showNotOptedInModal();
      });

      // Assert - both modals should be shown again after reset
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    it('resets hasShownModal status for all modal types', () => {
      // Arrange
      const { result } = renderHook(() => useRewardDashboardModals());

      // Act - show modals to set tracking status
      act(() => {
        result.current.showNotOptedInModal();
      });

      // Verify modal is tracked
      expect(
        result.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(true);

      // Act - reset all session tracking
      act(() => {
        result.current.resetAllSessionTracking();
      });

      // Assert - hasShownModal should return false after reset
      expect(
        result.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(false);
    });

    it('affects all hook instances due to singleton behavior', () => {
      // Arrange - first hook instance
      const { result: result1 } = renderHook(() => useRewardDashboardModals());

      // Show modal with first instance
      act(() => {
        result1.current.showNotOptedInModal();
      });

      // Arrange - second hook instance
      const { result: result2 } = renderHook(() => useRewardDashboardModals());

      // Verify both instances see the modal as shown
      expect(
        result1.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(true);
      expect(
        result2.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(true);

      // Act - reset from second instance
      act(() => {
        result2.current.resetAllSessionTracking();
      });

      // Assert - both instances should see the reset effect
      expect(
        result1.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(false);
      expect(
        result2.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(false);

      mockNavigate.mockClear();

      // Act - both instances should be able to show modals again
      act(() => {
        result1.current.showNotOptedInModal();
      });

      // Assert - modal should show from first instance
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetSessionTrackingForCurrentAccountGroup', () => {
    it('allows modals to be shown again for current account group after reset', () => {
      // Arrange
      const { result } = renderHook(() => useRewardDashboardModals());

      // Act - show modal for current account group
      act(() => {
        result.current.showNotOptedInModal();
      });
      mockNavigate.mockClear();

      // Reset only for current account group
      act(() => {
        result.current.resetSessionTrackingForCurrentAccountGroup();
      });

      // Try to show modal again for same account group
      act(() => {
        result.current.showNotOptedInModal();
      });

      // Assert - modal should be shown again for same account group
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('does not reset tracking when no selected account group', () => {
      // Arrange
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        if (selector === selectSelectedAccountGroup) {
          return null;
        }
        return null;
      });

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act - try to reset without selected account group
      act(() => {
        result.current.resetSessionTrackingForCurrentAccountGroup();
      });

      // Should not throw or cause issues
      expect(
        result.current.resetSessionTrackingForCurrentAccountGroup,
      ).toBeDefined();
    });

    it('resets tracking only for specific account group', () => {
      // Arrange
      const { result: result1 } = renderHook(() => useRewardDashboardModals());

      // Show modal for first account group
      act(() => {
        result1.current.showNotOptedInModal();
      });

      // Switch to different account group
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) {
          return {
            ...mockSelectedAccountGroup,
            id: 'different-account-group-id',
          };
        }
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        return {
          ...mockSelectedAccountGroup,
          id: 'different-account-group-id',
        };
      });

      const { result: result2 } = renderHook(() => useRewardDashboardModals());

      // Show modal for second account group
      act(() => {
        result2.current.showNotOptedInModal();
      });

      // Reset only the second account group
      act(() => {
        result2.current.resetSessionTrackingForCurrentAccountGroup();
      });

      mockNavigate.mockClear();

      // Try to show modal again for second account group - should work
      act(() => {
        result2.current.showNotOptedInModal();
      });

      // Assert - second account group modal should show again
      expect(mockNavigate).toHaveBeenCalledTimes(1);

      // Switch back to first account group
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) {
          return mockSelectedAccountGroup;
        }
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        return mockSelectedAccountGroup;
      });

      const { result: result3 } = renderHook(() => useRewardDashboardModals());

      mockNavigate.mockClear();

      // Try to show modal for first account group - should not work (still tracked)
      act(() => {
        result3.current.showNotOptedInModal();
      });

      // Assert - first account group modal should not show again
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('session-based modal prevention', () => {
    it('prevents multiple shows of the same modal type per session', () => {
      // Given a rewards dashboard modal hook
      // Reset session tracker to ensure clean state
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      // When showing the same modal multiple times in a session
      act(() => {
        result.current.showNotOptedInModal();
      });

      const firstCallCount = mockNavigate.mock.calls.length;
      mockNavigate.mockClear();

      act(() => {
        result.current.showNotOptedInModal();
      });

      // Then the modal should only be navigated to once
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(firstCallCount).toBe(1);
    });

    it('allows different modal types to be shown in the same session', () => {
      // Given a rewards dashboard modal hook
      // Reset session tracker to ensure clean state
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      // When showing different modal types in the same session
      act(() => {
        result.current.showNotOptedInModal();
      });
      act(() => {
        result.current.showUnlinkedAccountsModal();
      });
      act(() => {
        result.current.showNotSupportedModal();
      });

      // Then all different modal types should be shown
      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });
  });

  describe('ModalSessionTracker singleton behavior', () => {
    it('shares session state across multiple hook instances', () => {
      // Arrange - first hook instance
      const { result: result1 } = renderHook(() => useRewardDashboardModals());

      // Act - show modal with first instance
      act(() => {
        result1.current.showNotOptedInModal();
      });

      // Arrange - second hook instance (same component re-render or different component)
      const { result: result2 } = renderHook(() => useRewardDashboardModals());

      mockNavigate.mockClear();

      // Act - try to show same modal with second instance
      act(() => {
        result2.current.showNotOptedInModal();
      });

      // Assert - modal should not show because session is shared
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('maintains isolation between different account groups', () => {
      // Arrange - first hook instance with first account group
      const { result: result1 } = renderHook(() => useRewardDashboardModals());

      // Act - show modal for first account group
      act(() => {
        result1.current.showNotOptedInModal();
      });

      // Switch to different account group for second instance
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) {
          return { ...mockSelectedAccountGroup, id: 'group-2' };
        }
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        return { ...mockSelectedAccountGroup, id: 'group-2' };
      });

      const { result: result2 } = renderHook(() => useRewardDashboardModals());

      mockNavigate.mockClear();

      // Act - show modal for different account group
      act(() => {
        result2.current.showNotOptedInModal();
      });

      // Assert - modal should show for different account group
      expect(mockNavigate).toHaveBeenCalledTimes(1);

      mockNavigate.mockClear();

      // Act - try to show again for same second group
      act(() => {
        result2.current.showNotOptedInModal();
      });

      // Assert - should not show again for same group
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('correctly tracks hasShownModal across instances', () => {
      // Arrange - first hook instance
      const { result: result1 } = renderHook(() => useRewardDashboardModals());

      // Act - show modal with first instance
      act(() => {
        result1.current.showNotOptedInModal();
      });

      // Arrange - second hook instance (same account group)
      const { result: result2 } = renderHook(() => useRewardDashboardModals());

      // Assert - both instances should report modal as shown
      expect(
        result1.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(true);
      expect(
        result2.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(true);
    });

    it('resets correctly affect all hook instances', () => {
      // Arrange - first hook instance
      const { result: result1 } = renderHook(() => useRewardDashboardModals());

      // Act - show modal
      act(() => {
        result1.current.showNotOptedInModal();
      });

      // Arrange - second hook instance
      const { result: result2 } = renderHook(() => useRewardDashboardModals());

      // Act - reset from second instance
      act(() => {
        result2.current.resetSessionTracking();
      });

      mockNavigate.mockClear();

      // Act - try to show modal from first instance after reset
      act(() => {
        result1.current.showNotOptedInModal();
      });

      // Assert - modal should show again because reset affects shared singleton
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });
});
