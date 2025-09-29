import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  useRewardDashboardModals,
  RewardsDashboardModalType,
} from './useRewardDashboardModals';
import Routes from '../../../../constants/navigation/Routes';
import { useLinkAccount } from './useLinkAccount';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../actions/rewards', () => ({
  setHideUnlinkedAccountsBanner: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setHideCurrentAccountNotOptedInBanner: jest.fn(),
}));

jest.mock('./useLinkAccount', () => ({
  useLinkAccount: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'rewards.dashboard_modal_info.multiple_unlinked_accounts.title':
        'Start earning rewards',
      'rewards.dashboard_modal_info.multiple_unlinked_accounts.description':
        'Link your accounts to start earning',
      'rewards.dashboard_modal_info.multiple_unlinked_accounts.confirm':
        'Go to Settings',
      'rewards.dashboard_modal_info.active_account.title': "Don't miss out",
      'rewards.dashboard_modal_info.active_account.description':
        'Link this account to earn rewards',
      'rewards.dashboard_modal_info.active_account.confirm': 'Link Account',
      'rewards.dashboard_modal_info.account_not_supported.title':
        'Account not supported',
      'rewards.dashboard_modal_info.account_not_supported.description_hardware':
        'Hardware wallets are not supported',
      'rewards.dashboard_modal_info.account_not_supported.description_general':
        'This account type is not supported',
      'rewards.dashboard_modal_info.account_not_supported.confirm': 'OK',
      'rewards.linking_account': 'Linking...',
      'rewards.link_account': 'Link Account',
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

describe('useRewardDashboardModals', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockDispatch = jest.fn();
  const mockLinkAccount = jest.fn();
  const mockSelectedAccount = {
    id: '0x123',
    address: '0x123',
    metadata: {
      keyring: {
        type: 'HD Key Tree',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    });
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);
    // Mock both selectors that are used in the hook
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector.toString().includes('selectSelectedInternalAccount')) {
        return mockSelectedAccount;
      }
      if (selector.toString().includes('selectSelectedAccountGroupId')) {
        return 'test-account-group-id';
      }
      return mockSelectedAccount; // fallback
    });
    (useLinkAccount as jest.Mock).mockReturnValue({
      linkAccount: mockLinkAccount,
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
          title: 'Start earning rewards',
          description: 'Link your accounts to start earning',
          customIcon: expect.any(Object),
          confirmAction: {
            label: 'Go to Settings',
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
          description: 'Link this account to earn rewards',
          customIcon: expect.any(Object),
          confirmAction: {
            label: 'Link Account',
            isLoading: false,
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
      (useLinkAccount as jest.Mock).mockReturnValue({
        linkAccount: mockLinkAccount,
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
      expect(modalCall.confirmAction.isLoading).toBe(true);
    });

    it('calls linkAccount when confirm is pressed and not currently linking', () => {
      // Arrange
      (useLinkAccount as jest.Mock).mockReturnValue({
        linkAccount: mockLinkAccount,
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

      // Act
      act(() => {
        onPress();
      });

      // Assert
      expect(mockLinkAccount).toHaveBeenCalledWith(mockSelectedAccount);
    });
  });

  describe('showNotSupportedModal', () => {
    it('shows general description for non-hardware wallet', () => {
      // Arrange
      const nonHardwareAccount = {
        ...mockSelectedAccount,
        metadata: {
          keyring: {
            type: 'Simple Key Pair',
          },
        },
      };

      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector.toString().includes('selectSelectedInternalAccount')) {
          return nonHardwareAccount;
        }
        if (selector.toString().includes('selectSelectedAccountGroupId')) {
          return 'test-account-group-id';
        }
        return nonHardwareAccount;
      });

      // Reset session tracker to ensure modal can be shown
      const { result: resetResult } = renderHook(() =>
        useRewardDashboardModals(),
      );
      resetResult.current.resetSessionTracking();

      const { result } = renderHook(() => useRewardDashboardModals());

      // Act
      act(() => {
        result.current.showNotSupportedModal();
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      const modalCall = mockNavigate.mock.calls[0][1];
      expect(modalCall.description).toBe('This account type is not supported');
    });
  });

  describe('hasShownModal', () => {
    it('returns false initially for all modal types', () => {
      // Arrange
      const { result } = renderHook(() => useRewardDashboardModals());

      // Act & Assert
      expect(
        result.current.hasShownModal(
          'unlinked-accounts' as RewardsDashboardModalType,
        ),
      ).toBe(false);
      expect(
        result.current.hasShownModal(
          'not-opted-in' as RewardsDashboardModalType,
        ),
      ).toBe(false);
      expect(
        result.current.hasShownModal(
          'not-supported' as RewardsDashboardModalType,
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
});
