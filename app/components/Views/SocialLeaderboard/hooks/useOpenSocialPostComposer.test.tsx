import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../component-library/components/Toast';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import { useOpenSocialPostComposer } from './useOpenSocialPostComposer';
import type { UseMyProfileResult } from '../MyProfileView/hooks';

const mockNavigate = jest.fn();
const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, vars?: Record<string, string>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

const LINKED_ID = 'acc-linked';
const LINKED_ADDRESS = '0x1111111111111111111111111111111111111111';
const OTHER_ID = 'acc-other';
const OTHER_ADDRESS = '0x2222222222222222222222222222222222222222';

const linkedAccount = {
  id: LINKED_ID,
  address: LINKED_ADDRESS,
  metadata: { name: 'Social Wallet' },
};

const otherAccount = {
  id: OTHER_ID,
  address: OTHER_ADDRESS,
  metadata: { name: 'Other' },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastContext.Provider value={{ toastRef: mockToastRef }}>
    {children}
  </ToastContext.Provider>
);

const mockSelectors = (
  internalAccounts: unknown[],
  selectedGroupAccounts: unknown[],
) => {
  (useSelector as jest.Mock).mockImplementation((selector: unknown) => {
    if (selector === selectInternalAccounts) {
      return internalAccounts;
    }
    if (selector === selectSelectedAccountGroupInternalAccounts) {
      return selectedGroupAccounts;
    }
    return undefined;
  });
};

describe('useOpenSocialPostComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMyProfile.mockReturnValue({
      profile: {
        profileId: 'current-user',
        displayName: 'Giga Whale',
        handle: 'giga-whale',
        shareUrl: 'https://metamask.io/social/giga-whale',
        linkedAccountId: LINKED_ID,
        linkedAccountAddress: LINKED_ADDRESS,
      },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockSelectors([linkedAccount, otherAccount], [linkedAccount]);
  });

  it('navigates to the post composer when the linked wallet is present', () => {
    const { result } = renderHook(() => useOpenSocialPostComposer(), {
      wrapper,
    });

    result.current.openComposer();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POST_COMPOSER);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('navigates to profile onboarding when no linked wallet is set', () => {
    mockUseMyProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useOpenSocialPostComposer(), {
      wrapper,
    });

    result.current.openComposer();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows an error toast and does not open the composer when the linked wallet is missing', () => {
    mockSelectors([otherAccount], [otherAccount]);

    const { result } = renderHook(() => useOpenSocialPostComposer(), {
      wrapper,
    });

    result.current.openComposer();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          {
            label: 'social_leaderboard.composer.linked_account_missing',
          },
        ],
      }),
    );
  });

  it('shows an info toast then opens the composer when a different group is selected', () => {
    mockSelectors([linkedAccount, otherAccount], [otherAccount]);

    const { result } = renderHook(() => useOpenSocialPostComposer(), {
      wrapper,
    });

    result.current.openComposer();

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          {
            label:
              'social_leaderboard.composer.showing_linked_account:{"account":"Social Wallet"}',
          },
        ],
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POST_COMPOSER);
  });
});
