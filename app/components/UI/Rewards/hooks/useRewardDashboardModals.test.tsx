import { renderHook, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  useRewardDashboardModals,
  RewardsDashboardModalType,
} from './useRewardDashboardModals';
import Routes from '../../../../constants/navigation/Routes';
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

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectBulkLinkIsRunning: jest.fn(),
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
  navigateToRewardsRoute: jest.fn((navigation, screen, params) =>
    navigation.navigate('RewardsFlow', { screen, params }),
  ),
}));

jest.mock('../../../../util/address', () => ({
  isHardwareAccount: jest.fn(),
}));

describe('useRewardDashboardModals', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockDispatch = jest.fn();
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
            variant: 'primary',
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
            variant: 'primary',
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
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
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
          'not-supported' as RewardsDashboardModalType,
        ),
      ).toBe(false);
    });
  });

  describe('tracking key fallback behavior', () => {
    it('does not show the unsupported-account modal without an account group', () => {
      // Arrange
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSelectedAccountGroup) {
          return null;
        }
        if (selector === selectInternalAccountsByGroupId) {
          return (_groupId: string) => mockAccounts;
        }
        return null;
      });

      const { result } = renderHook(() => useRewardDashboardModals());

      act(() => {
        result.current.showNotSupportedModal();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(
        result.current.hasShownModal(
          'not-supported' as RewardsDashboardModalType,
        ),
      ).toBe(false);
    });
  });

  describe('resetSessionTrackingForCurrentAccountGroup', () => {
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
  });
});
